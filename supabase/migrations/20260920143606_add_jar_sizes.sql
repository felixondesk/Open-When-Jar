-- Add one-time jar sizes with private, per-recipient membership.
-- The legacy primary-recipient columns remain populated for backwards compatibility.

alter table public.jars
  add column plan_code text not null default 'one_heart',
  add column recipient_limit smallint not null default 1,
  add column amount_cents integer not null default 799,
  add constraint jars_known_plan check (
    (plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 799)
    or (plan_code = 'two_hearts' and recipient_limit = 2 and amount_cents = 1499)
    or (plan_code = 'close_circle' and recipient_limit = 3 and amount_cents = 1999)
    or (plan_code = 'family_circle' and recipient_limit = 5 and amount_cents = 2999)
    or (plan_code = 'big_heart' and recipient_limit = 10 and amount_cents = 4999)
  );

alter table public.jar_credits
  add column plan_code text not null default 'one_heart',
  add column recipient_limit smallint not null default 1,
  add column amount_cents integer not null default 0,
  add constraint jar_credits_known_plan check (
    (source = 'free' and plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 0)
    or (source = 'paid' and (
      (plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 799)
      or (plan_code = 'two_hearts' and recipient_limit = 2 and amount_cents = 1499)
      or (plan_code = 'close_circle' and recipient_limit = 3 and amount_cents = 1999)
      or (plan_code = 'family_circle' and recipient_limit = 5 and amount_cents = 2999)
      or (plan_code = 'big_heart' and recipient_limit = 10 and amount_cents = 4999)
    ))
  );

alter table public.orders drop constraint orders_server_price;
alter table public.orders
  add column plan_code text not null default 'one_heart',
  add column recipient_limit smallint not null default 1,
  add constraint orders_known_plan check (
    currency = 'USD' and (
      (plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 799)
      or (plan_code = 'two_hearts' and recipient_limit = 2 and amount_cents = 1499)
      or (plan_code = 'close_circle' and recipient_limit = 3 and amount_cents = 1999)
      or (plan_code = 'family_circle' and recipient_limit = 5 and amount_cents = 2999)
      or (plan_code = 'big_heart' and recipient_limit = 10 and amount_cents = 4999)
    )
  );

create table public.jar_recipients (
  jar_id uuid not null references public.jars(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  username_snapshot extensions.citext not null,
  position smallint not null,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (jar_id, recipient_id),
  unique (jar_id, position),
  constraint jar_recipients_position check (position between 1 and 10),
  constraint jar_recipients_different_people check (creator_id <> recipient_id)
);

create index jar_recipients_recipient_created_idx
  on public.jar_recipients(recipient_id, created_at desc);
create index jar_recipients_creator_jar_idx
  on public.jar_recipients(creator_id, jar_id);

insert into public.jar_recipients (jar_id, recipient_id, creator_id, username_snapshot, position)
select id, recipient_id, creator_id, recipient_username_snapshot, 1
from public.jars;

update public.jar_recipients r
set revealed_at = j.sealed_at
from public.jars j
where j.id = r.jar_id and j.status in ('sealed', 'hosting_ended');

drop function public.create_jar_with_first_envelope(text, text, text, text, text, timestamptz, text);

create function public.create_jar_with_first_envelope(
  p_recipient_usernames text[],
  p_plan_code text,
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
  v_first_recipient public.profiles%rowtype;
  v_jar_id uuid;
  v_envelope_id uuid;
  v_active_drafts integer;
  v_recipient_count integer := coalesce(cardinality(p_recipient_usernames), 0);
  v_recipient_limit smallint;
  v_amount_cents integer;
begin
  if v_creator_id is null then
    raise exception 'Authentication required';
  end if;

  select plan.recipient_limit, plan.amount_cents
  into v_recipient_limit, v_amount_cents
  from (values
    ('one_heart', 1::smallint, 799),
    ('two_hearts', 2::smallint, 1499),
    ('close_circle', 3::smallint, 1999),
    ('family_circle', 5::smallint, 2999),
    ('big_heart', 10::smallint, 4999)
  ) as plan(code, recipient_limit, amount_cents)
  where plan.code = p_plan_code;

  if not found then
    raise exception 'Choose a valid jar size';
  end if;
  if v_recipient_count < 1 or v_recipient_count > v_recipient_limit then
    raise exception 'Choose between 1 and % recipients for this jar size', v_recipient_limit;
  end if;
  if exists (
    select 1 from unnest(p_recipient_usernames) as requested(username_value)
    where lower(btrim(requested.username_value)) !~ '^[a-z][a-z0-9_]{2,29}$'
  ) then
    raise exception 'Enter exact Open When Jar usernames';
  end if;
  if (
    select count(distinct lower(btrim(requested.username_value)))
    from unnest(p_recipient_usernames) as requested(username_value)
  ) <> v_recipient_count then
    raise exception 'Each recipient username must be unique';
  end if;
  if (
    select count(*)
    from unnest(p_recipient_usernames) as requested(username_value)
    join public.profiles p on p.username = lower(btrim(requested.username_value))::extensions.citext
  ) <> v_recipient_count then
    raise exception 'One or more Open When Jar usernames could not be found';
  end if;
  if exists (
    select 1
    from unnest(p_recipient_usernames) as requested(username_value)
    join public.profiles p on p.username = lower(btrim(requested.username_value))::extensions.citext
    where p.id = v_creator_id
  ) then
    raise exception 'Choose other people for this jar';
  end if;

  select p.* into v_first_recipient
  from unnest(p_recipient_usernames) with ordinality as requested(username, position)
  join public.profiles p on p.username = lower(btrim(requested.username))::extensions.citext
  order by requested.position
  limit 1;

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
      select 1 from pg_catalog.pg_timezone_names
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
    creator_id, recipient_id, recipient_username_snapshot,
    plan_code, recipient_limit, amount_cents, cover_note, theme
  ) values (
    v_creator_id, v_first_recipient.id, v_first_recipient.username,
    p_plan_code, v_recipient_limit, v_amount_cents, coalesce(p_cover_note, ''), p_theme
  ) returning id into v_jar_id;

  insert into public.jar_recipients (
    jar_id, recipient_id, creator_id, username_snapshot, position
  )
  select v_jar_id, p.id, v_creator_id, p.username, requested.position::smallint
  from unnest(p_recipient_usernames) with ordinality as requested(username, position)
  join public.profiles p on p.username = lower(btrim(requested.username))::extensions.citext
  order by requested.position;

  insert into public.envelope_headers (jar_id, position, label, unlock_at, unlock_timezone)
  values (
    v_jar_id, 1, btrim(p_label), p_unlock_at,
    coalesce(nullif(btrim(p_unlock_timezone), ''), 'UTC')
  ) returning id into v_envelope_id;

  insert into public.envelope_contents (envelope_id, text_body)
  values (v_envelope_id, p_message);

  return v_jar_id;
end;
$$;

create or replace function public.seal_jar(p_jar_id uuid)
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
  v_recipient_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_jar from public.jars where jars.id = p_jar_id for update;
  if not found or v_jar.creator_id <> v_user_id then
    raise exception 'Jar not found';
  end if;
  if v_jar.status <> 'draft' then
    raise exception 'This jar is already sealed';
  end if;
  if not exists (select 1 from public.envelope_headers where jar_id = p_jar_id) then
    raise exception 'Add an envelope before sealing';
  end if;

  select count(*) into v_recipient_count
  from public.jar_recipients
  where jar_id = p_jar_id;
  if v_recipient_count < 1 or v_recipient_count > v_jar.recipient_limit then
    raise exception 'This jar has an invalid recipient count';
  end if;

  select * into v_credit
  from public.jar_credits
  where user_id = v_user_id
    and plan_code = v_jar.plan_code
    and recipient_limit >= v_recipient_count
    and used_count < granted_count
  order by case when source = 'free' then 0 else 1 end, created_at
  for update skip locked
  limit 1;

  if not found then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'JAR_CREDIT_REQUIRED',
        'planCode', v_jar.plan_code,
        'amountCents', v_jar.amount_cents
      )::text,
      detail = json_build_object('status', 402)::text;
  end if;

  update public.jar_credits set used_count = used_count + 1 where jar_credits.id = v_credit.id;
  update public.jars
  set status = 'sealed', entitlement_source = v_credit.source,
      sealed_at = now(), hosting_ends_at = now() + interval '3 years'
  where jars.id = p_jar_id;
  update public.jar_recipients set revealed_at = now() where jar_id = p_jar_id;

  return query
  select j.id, j.status, j.entitlement_source, j.hosting_ends_at
  from public.jars j where j.id = p_jar_id;
end;
$$;

alter table public.jar_recipients enable row level security;

drop policy "Users can read themselves and jar members" on public.profiles;
create policy "Users can read themselves and jar members"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.jar_recipients r
    join public.jars j on j.id = r.jar_id
    where (
      r.creator_id = (select auth.uid()) and r.recipient_id = profiles.id
    ) or (
      r.recipient_id = (select auth.uid()) and r.creator_id = profiles.id
      and j.status in ('sealed', 'hosting_ended')
    )
  )
);

create policy "Creators see all recipients and sealed recipients see themselves"
on public.jar_recipients for select to authenticated
using (
  creator_id = (select auth.uid())
  or (recipient_id = (select auth.uid()) and revealed_at is not null)
);

drop policy "Creators see sent jars and recipients see sealed jars" on public.jars;
create policy "Creators see sent jars and recipients see sealed jars"
on public.jars for select to authenticated
using (
  (select auth.uid()) = creator_id
  or (
    status in ('sealed', 'hosting_ended')
    and id in (
      select r.jar_id from public.jar_recipients r
      where r.recipient_id = (select auth.uid())
    )
  )
);

drop policy "Jar members can read envelope headers" on public.envelope_headers;
create policy "Jar members can read envelope headers"
on public.envelope_headers for select to authenticated
using (
  exists (
    select 1 from public.jars j
    where j.id = envelope_headers.jar_id
      and (
        j.creator_id = (select auth.uid())
        or (
          j.status in ('sealed', 'hosting_ended')
          and j.id in (
            select r.jar_id from public.jar_recipients r
            where r.recipient_id = (select auth.uid())
          )
        )
      )
  )
);

drop policy "Creators and unlocked recipients can read letter contents" on public.envelope_contents;
create policy "Creators and unlocked recipients can read letter contents"
on public.envelope_contents for select to authenticated
using (
  exists (
    select 1 from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = envelope_contents.envelope_id
      and (
        j.creator_id = (select auth.uid())
        or (
          j.status in ('sealed', 'hosting_ended')
          and (h.unlock_at is null or h.unlock_at <= now())
          and j.id in (
            select r.jar_id from public.jar_recipients r
            where r.recipient_id = (select auth.uid())
          )
        )
      )
  )
);

drop policy "Creators and unlocked recipients can read attachments" on public.attachments;
create policy "Creators and unlocked recipients can read attachments"
on public.attachments for select to authenticated
using (
  exists (
    select 1 from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = attachments.envelope_id
      and (
        j.creator_id = (select auth.uid())
        or (
          j.status in ('sealed', 'hosting_ended')
          and (h.unlock_at is null or h.unlock_at <= now())
          and j.id in (
            select r.jar_id from public.jar_recipients r
            where r.recipient_id = (select auth.uid())
          )
        )
      )
  )
);

drop policy "Recipients add state only for their jars" on public.recipient_envelope_state;
create policy "Recipients add state only for their jars"
on public.recipient_envelope_state for insert to authenticated
with check (
  (select auth.uid()) = recipient_id
  and exists (
    select 1 from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = recipient_envelope_state.envelope_id
      and j.status in ('sealed', 'hosting_ended')
      and j.id in (
        select r.jar_id from public.jar_recipients r
        where r.recipient_id = (select auth.uid())
      )
  )
);

drop policy "Recipients update their own envelope state" on public.recipient_envelope_state;
create policy "Recipients update their own envelope state"
on public.recipient_envelope_state for update to authenticated
using ((select auth.uid()) = recipient_id)
with check (
  (select auth.uid()) = recipient_id
  and exists (
    select 1 from public.envelope_headers h
    join public.jars j on j.id = h.jar_id
    where h.id = recipient_envelope_state.envelope_id
      and j.status in ('sealed', 'hosting_ended')
      and j.id in (
        select r.jar_id from public.jar_recipients r
        where r.recipient_id = (select auth.uid())
      )
  )
);

drop policy "Jar members download authorized media" on storage.objects;
create policy "Jar members download authorized media"
on storage.objects for select to authenticated
using (
  bucket_id = 'jar-media'
  and exists (
    select 1 from public.attachments a
    join public.envelope_headers h on h.id = a.envelope_id
    join public.jars j on j.id = h.jar_id
    where a.storage_path = storage.objects.name
      and (
        j.creator_id = (select auth.uid())
        or (
          j.status in ('sealed', 'hosting_ended')
          and (h.unlock_at is null or h.unlock_at <= now())
          and j.id in (
            select r.jar_id from public.jar_recipients r
            where r.recipient_id = (select auth.uid())
          )
        )
      )
  )
);

revoke all on public.jar_recipients from anon, authenticated;
grant select on public.jar_recipients to authenticated;

revoke all on function public.create_jar_with_first_envelope(text[], text, text, text, text, text, timestamptz, text) from public, anon;
grant execute on function public.create_jar_with_first_envelope(text[], text, text, text, text, text, timestamptz, text) to authenticated;
