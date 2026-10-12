-- Let social-auth users finish choosing their public Open When Jar identity
-- after OAuth has created the Auth account. Temporary usernames are private
-- until the user completes this one-time step.

alter table public.profiles
  add column username_finalized boolean not null default true;

create or replace function private.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'Profile identity cannot be changed';
  end if;

  if old.username_finalized and not new.username_finalized then
    raise exception 'A finalized username cannot be reopened';
  end if;

  if new.username <> old.username
    and not (
      old.username_finalized = false
      and new.username_finalized = true
      and new.id = auth.uid()
    ) then
    raise exception 'Username cannot be changed';
  end if;

  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending private.pending_account_profiles%rowtype;
  v_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_display_name text := btrim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  ));
  v_username_finalized boolean := true;
begin
  if v_username = '' then
    select * into v_pending
    from private.pending_account_profiles pending
    where pending.email = lower(btrim(new.email))::extensions.citext
      and pending.expires_at > now()
    for update;

    if found then
      v_username := v_pending.username::text;
      v_display_name := v_pending.display_name;
    else
      v_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 12);
      v_username_finalized := false;
    end if;
  end if;

  if v_username !~ '^[a-z][a-z0-9_]{2,29}$' then
    raise exception 'Username must be 3-30 characters and use lowercase letters, numbers, or underscores';
  end if;

  if v_display_name = '' then
    v_display_name := 'New member';
  end if;
  v_display_name := left(v_display_name, 60);

  insert into public.profiles (id, username, display_name, username_finalized)
  values (new.id, v_username, v_display_name, v_username_finalized);

  insert into public.jar_credits (user_id, source, granted_count)
  values (new.id, 'free', 1);

  if v_pending.email is not null then
    delete from private.pending_account_profiles where email = v_pending.email;
  end if;

  return new;
end;
$$;

create or replace function public.claim_username(
  p_username text,
  p_display_name text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_display_name text := btrim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_username !~ '^[a-z][a-z0-9_]{2,29}$' then
    raise exception 'Username must be 3-30 characters and use lowercase letters, numbers, or underscores'
      using errcode = '22023';
  end if;

  if char_length(v_display_name) < 1 or char_length(v_display_name) > 60 then
    raise exception 'Display name must be 1-60 characters' using errcode = '22023';
  end if;

  update public.profiles
  set username = v_username,
      display_name = v_display_name,
      username_finalized = true
  where id = auth.uid()
    and username_finalized = false;

  if not found then
    raise exception 'Username has already been finalized' using errcode = '42501';
  end if;

  return true;
end;
$$;

revoke all on function public.claim_username(text, text) from public, anon;
grant execute on function public.claim_username(text, text) to authenticated;

comment on function public.claim_username(text, text) is
  'Lets an authenticated social-auth user finalize their public username exactly once.';
