-- Allow an administrator to pre-authorize profile data for an Auth user created
-- through Supabase Studio. Entries are private, expire quickly, and are consumed
-- by the existing Auth trigger on first use.

create table private.pending_account_profiles (
  email extensions.citext primary key,
  username extensions.citext not null unique,
  display_name text not null,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  constraint pending_account_profiles_username_format
    check (username::text ~ '^[a-z][a-z0-9_]{2,29}$'),
  constraint pending_account_profiles_display_name_length
    check (char_length(display_name) between 1 and 60),
  constraint pending_account_profiles_future_expiry
    check (expires_at > created_at)
);

revoke all on private.pending_account_profiles from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending private.pending_account_profiles%rowtype;
  new_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  new_display_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new_username));
begin
  if new_username = '' then
    select * into v_pending
    from private.pending_account_profiles pending
    where pending.email = lower(btrim(new.email))::extensions.citext
      and pending.expires_at > now()
    for update;

    if found then
      new_username := v_pending.username::text;
      new_display_name := v_pending.display_name;
    end if;
  end if;

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

  if v_pending.email is not null then
    delete from private.pending_account_profiles where email = v_pending.email;
  end if;

  return new;
end;
$$;
