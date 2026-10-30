-- Open When Jar: authentication, username delivery, libraries, and jar credits.
-- Apply to a fresh Supabase project. All exposed tables use RLS.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create extension if not exists citext with schema extensions;

create type public.jar_status as enum ('draft', 'sealed', 'hosting_ended', 'deleted');
create type public.credit_source as enum ('free', 'paid');
create type public.order_status as enum ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded');
create type public.attachment_kind as enum ('image', 'audio');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    char_length(username::text) between 3 and 30
    and username::text ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 60)
);

create table public.jar_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source public.credit_source not null,
  granted_count smallint not null default 1,
  used_count smallint not null default 0,
  provider_order_id text,
  created_at timestamptz not null default now(),
  constraint jar_credits_positive_grant check (granted_count > 0),
  constraint jar_credits_valid_usage check (used_count >= 0 and used_count <= granted_count),
  constraint jar_credits_paid_order check (
    (source = 'free' and provider_order_id is null)
    or (source = 'paid' and provider_order_id is not null)
  )
);

create unique index jar_credits_one_free_per_user_idx
  on public.jar_credits(user_id)
  where source = 'free';
create unique index jar_credits_provider_order_idx
  on public.jar_credits(provider_order_id)
  where provider_order_id is not null;
create index jar_credits_available_idx
  on public.jar_credits(user_id, created_at)
  where used_count < granted_count;

create table public.jars (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  recipient_username_snapshot extensions.citext not null,
  cover_note text not null default '',
  theme text not null default 'petal',
  status public.jar_status not null default 'draft',
  entitlement_source public.credit_source,
  sealed_at timestamptz,
  hosting_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jars_different_people check (creator_id <> recipient_id),
  constraint jars_cover_note_length check (char_length(cover_note) <= 240),
  constraint jars_known_theme check (theme in ('petal', 'blue', 'garden')),
  constraint jars_sealed_fields check (
    (status = 'draft' and entitlement_source is null and sealed_at is null and hosting_ends_at is null)
    or (status <> 'draft' and entitlement_source is not null and sealed_at is not null and hosting_ends_at is not null)
  )
);

create index jars_creator_created_idx on public.jars(creator_id, created_at desc);
create index jars_recipient_status_created_idx on public.jars(recipient_id, status, created_at desc);

create table public.envelope_headers (
  id uuid primary key default gen_random_uuid(),
  jar_id uuid not null references public.jars(id) on delete cascade,
  position smallint not null,
  label text not null,
  unlock_at timestamptz,
  unlock_timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  constraint envelope_headers_position check (position between 1 and 10),
  constraint envelope_headers_label_length check (char_length(label) between 1 and 80),
  unique (jar_id, position)
);

create index envelope_headers_jar_unlock_idx on public.envelope_headers(jar_id, unlock_at);

create table public.envelope_contents (
  envelope_id uuid primary key references public.envelope_headers(id) on delete cascade,
  text_body text not null default '',
  transcript text,
  created_at timestamptz not null default now(),
  constraint envelope_contents_text_length check (char_length(text_body) <= 3000),
  constraint envelope_contents_transcript_length check (transcript is null or char_length(transcript) <= 3000),
  constraint envelope_contents_not_empty check (char_length(btrim(text_body)) > 0 or char_length(btrim(coalesce(transcript, ''))) > 0)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.envelope_headers(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind public.attachment_kind not null,
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer not null,
  created_at timestamptz not null default now(),
  constraint attachments_byte_size check (byte_size between 1 and 1500000),
  constraint attachments_storage_path check (char_length(storage_path) between 20 and 300 and storage_path !~ '(^|/)\.\.?(/|$)'),
  constraint attachments_mime_kind check (
    (kind = 'image' and mime_type in ('image/webp', 'image/jpeg'))
    or (kind = 'audio' and mime_type in ('audio/webm', 'audio/ogg', 'audio/mp4'))
  ),
  unique (envelope_id, kind)
);

create index attachments_envelope_idx on public.attachments(envelope_id);
create index attachments_owner_idx on public.attachments(owner_id);

create table public.recipient_envelope_state (
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  envelope_id uuid not null references public.envelope_headers(id) on delete cascade,
  favourite boolean not null default false,
  opened_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (recipient_id, envelope_id)
);

create index recipient_envelope_state_recipient_idx
  on public.recipient_envelope_state(recipient_id, favourite, updated_at desc);
create index recipient_envelope_state_envelope_idx
  on public.recipient_envelope_state(envelope_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  jar_id uuid references public.jars(id) on delete set null,
  provider text not null default 'dodo',
  provider_order_id text unique,
  status public.order_status not null default 'created',
  amount_cents integer not null default 799,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_server_price check (amount_cents = 799 and currency = 'USD'),
  constraint orders_provider check (provider = 'dodo')
);

create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_jar_idx on public.orders(jar_id) where jar_id is not null;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger jars_set_updated_at before update on public.jars
for each row execute function private.set_updated_at();
create trigger recipient_state_set_updated_at before update on public.recipient_envelope_state
for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function private.set_updated_at();

create function private.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.username <> old.username then
    raise exception 'Username and profile identity cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_identity before update on public.profiles
for each row execute function private.protect_profile_identity();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  new_display_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new_username));
begin
  if new_username !~ '^[a-z][a-z0-9_]{2,29}$' then
    raise exception 'Username must be 3-30 characters and use lowercase letters, numbers, or underscores';
  end if;

  if char_length(new_display_name) < 1 or char_length(new_display_name) > 60 then
    raise exception 'Display name must be 1-60 characters';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, new_username, new_display_name);

  insert into public.jar_credits (user_id, source, granted_count)
  values (new.id, 'free', 1);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function public.create_jar_with_first_envelope(
  p_recipient_username text,
  p_cover_note text,
  p_theme text,
  p_label text,
  p_message text,
  p_unlock_at timestamptz default null,
  p_unlock_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid := auth.uid();
  v_recipient public.profiles%rowtype;
  v_jar_id uuid;
  v_envelope_id uuid;
  v_active_drafts integer;
begin
  if v_creator_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_recipient
  from public.profiles
  where username = lower(btrim(p_recipient_username))::extensions.citext;

  if not found then
    raise exception 'No Open When Jar user has that username';
  end if;

  if v_recipient.id = v_creator_id then
    raise exception 'Choose another person for this jar';
  end if;

  if p_theme not in ('petal', 'blue', 'garden') then
    raise exception 'Choose a valid theme';
  end if;
  if char_length(coalesce(p_cover_note, '')) > 240 then
    raise exception 'Cover note is too long';
  end if;
  if char_length(btrim(coalesce(p_label, ''))) not between 1 and 80 then
    raise exception 'Envelope label must be 1-80 characters';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 1 and 3000 then
    raise exception 'Letter must be 1-3000 characters';
  end if;
  if char_length(coalesce(p_unlock_timezone, '')) > 80
    or not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = coalesce(nullif(btrim(p_unlock_timezone), ''), 'UTC')
    ) then
    raise exception 'Choose a valid timezone';
  end if;

  select count(*) into v_active_drafts
  from public.jars
  where creator_id = v_creator_id and status = 'draft';

  if v_active_drafts >= 3 then
    raise exception 'You can have up to three active drafts';
  end if;

  insert into public.jars (
    creator_id,
    recipient_id,
    recipient_username_snapshot,
    cover_note,
    theme
  ) values (
    v_creator_id,
    v_recipient.id,
    v_recipient.username,
    coalesce(p_cover_note, ''),
    p_theme
  ) returning id into v_jar_id;

  insert into public.envelope_headers (
    jar_id,
    position,
    label,
    unlock_at,
    unlock_timezone
  ) values (
    v_jar_id,
    1,
    btrim(p_label),
    p_unlock_at,
    coalesce(nullif(btrim(p_unlock_timezone), ''), 'UTC')
  ) returning id into v_envelope_id;

  insert into public.envelope_contents (envelope_id, text_body)
  values (v_envelope_id, p_message);

  return v_jar_id;
end;
$$;

create function public.seal_jar(p_jar_id uuid)
returns table (
  id uuid,
  status public.jar_status,
  entitlement_source public.credit_source,
  hosting_ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_jar public.jars%rowtype;
  v_credit public.jar_credits%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_jar
  from public.jars
  where jars.id = p_jar_id
  for update;

  if not found or v_jar.creator_id <> v_user_id then
    raise exception 'Jar not found';
  end if;
  if v_jar.status <> 'draft' then
    raise exception 'This jar is already sealed';
  end if;
  if not exists (select 1 from public.envelope_headers where jar_id = p_jar_id) then
    raise exception 'Add an envelope before sealing';
  end if;

  select * into v_credit
  from public.jar_credits
  where user_id = v_user_id and used_count < granted_count
  order by case when source = 'free' then 0 else 1 end, created_at
  for update skip locked
  limit 1;

  if not found then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'JAR_CREDIT_REQUIRED',
        'message', 'A $7.99 jar credit is required to seal another jar'
      )::text,
      detail = json_build_object('status', 402)::text;
  end if;

  update public.jar_credits
  set used_count = used_count + 1
  where jar_credits.id = v_credit.id;

  update public.jars
  set status = 'sealed',
      entitlement_source = v_credit.source,
      sealed_at = now(),
      hosting_ends_at = now() + interval '3 years'
  where jars.id = p_jar_id;

  return query
  select j.id, j.status, j.entitlement_source, j.hosting_ends_at
  from public.jars j
  where j.id = p_jar_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.jar_credits enable row level security;
alter table public.jars enable row level security;
alter table public.envelope_headers enable row level security;
alter table public.envelope_contents enable row level security;
alter table public.attachments enable row level security;
alter table public.recipient_envelope_state enable row level security;
alter table public.orders enable row level security;

create policy "Users can read themselves and jar members"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.jars j
    where (
      j.creator_id = (select auth.uid())
      and j.recipient_id = profiles.id
    ) or (
      j.recipient_id = (select auth.uid())
      and j.creator_id = profiles.id
      and j.status in ('sealed', 'hosting_ended')
    )
  )
);

create policy "Users can update their display name"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own credits"
on public.jar_credits for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Creators see sent jars and recipients see sealed jars"
on public.jars for select
to authenticated
using (
  (select auth.uid()) = creator_id
  or ((select auth.uid()) = recipient_id and status in ('sealed', 'hosting_ended'))
);

create policy "Creators can delete their own drafts"
on public.jars for delete
to authenticated
using ((select auth.uid()) = creator_id and status = 'draft');

create policy "Jar members can read envelope headers"
on public.envelope_headers for select
to authenticated
using (
  exists (
    select 1 from public.jars j
    where j.id = envelope_headers.jar_id
      and (
        j.creator_id = (select auth.uid())
        or (j.recipient_id = (select auth.uid()) and j.status in ('sealed', 'hosting_ended'))
      )
  )
);

create policy "Creators and unlocked recipients can read letter contents"
on public.envelope_contents for select
to authenticated
using (
  exists (
    select 1
    from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = envelope_contents.envelope_id
      and (
        j.creator_id = (select auth.uid())
        or (
          j.recipient_id = (select auth.uid())
          and j.status in ('sealed', 'hosting_ended')
          and (h.unlock_at is null or h.unlock_at <= now())
        )
      )
  )
);

create policy "Creators and unlocked recipients can read attachments"
on public.attachments for select
to authenticated
using (
  exists (
    select 1
    from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = attachments.envelope_id
      and (
        j.creator_id = (select auth.uid())
        or (
          j.recipient_id = (select auth.uid())
          and j.status in ('sealed', 'hosting_ended')
          and (h.unlock_at is null or h.unlock_at <= now())
        )
      )
  )
);

create policy "Creators add attachments to their drafts"
on public.attachments for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (storage.foldername(storage_path))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = attachments.envelope_id
      and j.creator_id = (select auth.uid())
      and j.status = 'draft'
      and (storage.foldername(attachments.storage_path))[2] = j.id::text
      and (storage.foldername(attachments.storage_path))[3] = h.id::text
  )
);

create policy "Creators delete attachments from their drafts"
on public.attachments for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = attachments.envelope_id
      and j.creator_id = (select auth.uid())
      and j.status = 'draft'
  )
);

create policy "Recipients read their own envelope state"
on public.recipient_envelope_state for select
to authenticated
using ((select auth.uid()) = recipient_id);

create policy "Recipients add state only for their jars"
on public.recipient_envelope_state for insert
to authenticated
with check (
  (select auth.uid()) = recipient_id
  and exists (
    select 1
    from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = recipient_envelope_state.envelope_id
      and j.recipient_id = (select auth.uid())
      and j.status in ('sealed', 'hosting_ended')
  )
);

create policy "Recipients update their own envelope state"
on public.recipient_envelope_state for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check (
  (select auth.uid()) = recipient_id
  and exists (
    select 1
    from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = recipient_envelope_state.envelope_id
      and j.recipient_id = (select auth.uid())
      and j.status in ('sealed', 'hosting_ended')
  )
);

create policy "Recipients remove their own envelope state"
on public.recipient_envelope_state for delete
to authenticated
using ((select auth.uid()) = recipient_id);

create policy "Users can read their own orders"
on public.orders for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select on public.jar_credits to authenticated;
grant select, delete on public.jars to authenticated;
grant select on public.envelope_headers to authenticated;
grant select on public.envelope_contents to authenticated;
grant select, insert, delete on public.attachments to authenticated;
grant select, insert, update, delete on public.recipient_envelope_state to authenticated;
grant select on public.orders to authenticated;

revoke all on function public.create_jar_with_first_envelope(text, text, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.seal_jar(uuid) from public, anon;
grant execute on function public.create_jar_with_first_envelope(text, text, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.seal_jar(uuid) to authenticated;

revoke all on all sequences in schema public from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jar-media',
  'jar-media',
  false,
  2000000,
  array['image/webp', 'image/jpeg', 'audio/webm', 'audio/ogg', 'audio/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Creators upload media to their own draft path"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'jar-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.attachments a
    join public.envelope_headers h on h.id = a.envelope_id
    join public.jars j on j.id = h.jar_id
    where a.storage_path = storage.objects.name
      and a.owner_id = (select auth.uid())
      and j.creator_id = (select auth.uid())
      and j.status = 'draft'
  )
);

create policy "Jar members download authorized media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'jar-media'
  and exists (
    select 1
    from public.attachments a
    join public.envelope_headers h on h.id = a.envelope_id
    join public.jars j on j.id = h.jar_id
    where a.storage_path = storage.objects.name
      and (
        j.creator_id = (select auth.uid())
        or (
          j.recipient_id = (select auth.uid())
          and j.status in ('sealed', 'hosting_ended')
          and (h.unlock_at is null or h.unlock_at <= now())
        )
      )
  )
);

create policy "Creators remove media from their drafts"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'jar-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.jars j
    where j.id::text = (storage.foldername(name))[2]
      and j.creator_id = (select auth.uid())
      and j.status = 'draft'
  )
);
