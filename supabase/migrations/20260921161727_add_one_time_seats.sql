-- One purchase covers account seats. Each member may seal ten Jars.
-- The temporary checkout remains non-billable until signed payment fulfilment exists.

create table public.one_time_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_code text not null check (plan_code in ('one_heart', 'two_hearts', 'close_circle', 'family_circle', 'big_heart')),
  seat_limit smallint not null,
  source text not null check (source in ('test', 'paid')),
  created_at timestamptz not null default now(),
  constraint one_time_plans_seats_match_plan check (
    (plan_code = 'one_heart' and seat_limit = 1)
    or (plan_code = 'two_hearts' and seat_limit = 2)
    or (plan_code = 'close_circle' and seat_limit = 3)
    or (plan_code = 'family_circle' and seat_limit = 5)
    or (plan_code = 'big_heart' and seat_limit = 10)
  )
);

create table public.plan_members (
  group_id uuid not null references public.one_time_plans(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  jars_used integer not null default 0 check (jars_used >= 0),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.plan_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.one_time_plans(id) on delete cascade,
  email extensions.citext not null unique,
  created_at timestamptz not null default now()
);
create index plan_invitations_group_idx on public.plan_invitations(group_id);

alter table public.one_time_plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_invitations enable row level security;
revoke all on public.one_time_plans, public.plan_members, public.plan_invitations from public, anon, authenticated;

-- Existing non-billable QA accounts keep workspace access with a single seat.
insert into public.one_time_plans (owner_id, plan_code, seat_limit, source)
select distinct credit.user_id, 'one_heart', 1, 'test'
from public.jar_credits credit where credit.source = 'test';
insert into public.plan_members (group_id, user_id, jars_used)
select plan.id, plan.owner_id, (
  select count(*)::integer from public.jars jar
  where jar.creator_id = plan.owner_id and jar.status in ('sealed', 'hosting_ended')
)
from public.one_time_plans plan;

create or replace function public.complete_test_checkout(p_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_seats smallint;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  v_seats := case p_plan_code
    when 'one_heart' then 1 when 'two_hearts' then 2
    when 'close_circle' then 3 when 'family_circle' then 5
    when 'big_heart' then 10 else null end;
  if v_seats is null then raise exception 'INVALID_PLAN'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));
  select group_id into v_group_id from public.plan_members where user_id = v_user_id;
  if v_group_id is not null then return v_group_id; end if;

  insert into public.one_time_plans (owner_id, plan_code, seat_limit, source)
  values (v_user_id, p_plan_code, v_seats, 'test') returning id into v_group_id;
  insert into public.plan_members (group_id, user_id, jars_used)
  select v_group_id, v_user_id, count(*)::integer
  from public.jars where creator_id = v_user_id and status in ('sealed', 'hosting_ended');
  insert into public.jar_credits (user_id, source, plan_code, amount_cents, recipient_limit, granted_count)
  values (v_user_id, 'test', 'one_heart', 0, 1, 10);
  return v_group_id;
end;
$$;

create function public.invite_plan_member(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_group public.one_time_plans%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email) > 320 then
    raise exception 'INVALID_EMAIL';
  end if;
  select * into v_group from public.one_time_plans where owner_id = auth.uid() for update;
  if v_group.id is null then raise exception 'PLAN_OWNER_REQUIRED'; end if;
  if exists (select 1 from public.plan_invitations where email = v_email::extensions.citext and group_id = v_group.id) then
    return true;
  end if;
  if exists (
    select 1 from auth.users member_auth
    join public.plan_members member on member.user_id = member_auth.id
    where lower(member_auth.email) = v_email
  ) then raise exception 'ALREADY_HAS_PLAN'; end if;
  if (select count(*) from public.plan_members where group_id = v_group.id)
     + (select count(*) from public.plan_invitations where group_id = v_group.id) >= v_group.seat_limit then
    raise exception 'NO_SEATS_LEFT';
  end if;
  if exists (select 1 from public.plan_invitations where email = v_email::extensions.citext) then
    raise exception 'ALREADY_INVITED';
  end if;
  insert into public.plan_invitations (group_id, email) values (v_group.id, v_email::extensions.citext);
  return true;
end;
$$;

create function public.cancel_plan_invitation(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.plan_invitations invitation
  using public.one_time_plans plan
  where invitation.group_id = plan.id and plan.owner_id = auth.uid()
    and invitation.email = lower(btrim(coalesce(p_email, '')))::extensions.citext;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create function public.claim_plan_invitation()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email extensions.citext;
  v_group_id uuid;
  v_group public.one_time_plans%rowtype;
  v_new_profile public.profiles%rowtype;
  v_other record;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.plan_members where user_id = v_user_id) then return true; end if;
  select lower(email)::extensions.citext into v_email
  from auth.users where id = v_user_id and email_confirmed_at is not null;
  if v_email is null then return false; end if;
  select group_id into v_group_id from public.plan_invitations where email = v_email;
  if v_group_id is null then return false; end if;
  select * into v_group from public.one_time_plans where id = v_group_id for update;
  if v_group.id is null or not exists (select 1 from public.plan_invitations where group_id = v_group_id and email = v_email) then
    return false;
  end if;
  if (select count(*) from public.plan_members where group_id = v_group_id) >= v_group.seat_limit then
    raise exception 'NO_SEATS_LEFT';
  end if;
  select * into v_new_profile from public.profiles where id = v_user_id;
  if v_new_profile.id is null or not v_new_profile.username_finalized then return false; end if;

  insert into public.plan_members (group_id, user_id, jars_used)
  select v_group_id, v_user_id, count(*)::integer
  from public.jars where creator_id = v_user_id and status in ('sealed', 'hosting_ended');
  delete from public.plan_invitations where email = v_email and group_id = v_group_id;
  insert into public.jar_credits (user_id, source, plan_code, amount_cents, recipient_limit, granted_count)
  values (v_user_id, 'test', 'one_heart', 0, 1, 10);

  for v_other in
    select profile.* from public.plan_members member
    join public.profiles profile on profile.id = member.user_id
    where member.group_id = v_group_id and member.user_id <> v_user_id
  loop
    insert into public.circle_connections (
      requester_id, addressee_id, requester_username_snapshot, requester_display_name_snapshot,
      addressee_username_snapshot, addressee_display_name_snapshot, status, responded_at
    ) values (
      v_user_id, v_other.id, v_new_profile.username, v_new_profile.display_name,
      v_other.username, v_other.display_name, 'accepted', now()
    ) on conflict do nothing;
    update public.circle_connections
    set status = 'accepted', responded_at = now()
    where least(requester_id::text, addressee_id::text) = least(v_user_id::text, v_other.id::text)
      and greatest(requester_id::text, addressee_id::text) = greatest(v_user_id::text, v_other.id::text)
      and status <> 'accepted';
  end loop;
  return true;
end;
$$;

create function public.get_plan_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.plan_members%rowtype;
  v_group public.one_time_plans%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_member from public.plan_members where user_id = auth.uid();
  if v_member.user_id is null then return null; end if;
  select * into v_group from public.one_time_plans where id = v_member.group_id;
  return pg_catalog.jsonb_build_object(
    'isOwner', v_group.owner_id = auth.uid(),
    'planCode', v_group.plan_code,
    'seatLimit', v_group.seat_limit,
    'jarsUsed', v_member.jars_used,
    'jarLimit', 10,
    'members', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'username', profile.username, 'displayName', profile.display_name,
        'isOwner', member.user_id = v_group.owner_id
      ) order by member.joined_at), '[]'::jsonb)
      from public.plan_members member join public.profiles profile on profile.id = member.user_id
      where member.group_id = v_group.id
    ),
    'invitations', (
      select case when v_group.owner_id = auth.uid() then coalesce(pg_catalog.jsonb_agg(invitation.email order by invitation.created_at), '[]'::jsonb) else '[]'::jsonb end
      from public.plan_invitations invitation where invitation.group_id = v_group.id
    )
  );
end;
$$;

create function public.find_circle_user(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.plan_members where user_id = auth.uid()) then
    raise exception 'PLAN_REQUIRED';
  end if;
  if lower(btrim(coalesce(p_username, ''))) !~ '^[a-z][a-z0-9_]{2,29}$' then
    return null;
  end if;
  select * into v_profile from public.profiles
  where username = lower(btrim(p_username))::extensions.citext
    and username_finalized and id <> auth.uid();
  if v_profile.id is null then return null; end if;
  return pg_catalog.jsonb_build_object('username', v_profile.username, 'displayName', v_profile.display_name);
end;
$$;

create function private.require_plan_for_jar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan_code <> 'one_heart' or new.recipient_limit <> 1 then
    raise exception 'SINGLE_RECIPIENT_JARS_ONLY' using errcode = '23514';
  end if;
  if not exists (select 1 from public.plan_members where user_id = new.creator_id) then
    raise exception 'PLAN_REQUIRED' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger new_jar_requires_plan
before insert on public.jars for each row execute function private.require_plan_for_jar();

create function private.require_one_recipient()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position <> 1 then raise exception 'SINGLE_RECIPIENT_JARS_ONLY' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger one_recipient_per_new_jar
before insert on public.jar_recipients for each row execute function private.require_one_recipient();

create function private.consume_jar_allowance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.plan_members%rowtype;
begin
  select * into v_member from public.plan_members where user_id = new.creator_id for update;
  if v_member.user_id is null then raise exception 'PLAN_REQUIRED' using errcode = '23514'; end if;
  if v_member.jars_used >= 10 then raise exception 'JAR_LIMIT_REACHED' using errcode = '23514'; end if;
  if (select count(*) from public.jar_recipients where jar_id = new.id) <> 1 then
    raise exception 'SINGLE_RECIPIENT_JARS_ONLY' using errcode = '23514';
  end if;
  update public.plan_members set jars_used = jars_used + 1 where user_id = new.creator_id;
  return new;
end;
$$;
create trigger sealed_jar_consumes_allowance
before update of status on public.jars
for each row when (old.status = 'draft' and new.status = 'sealed')
execute function private.consume_jar_allowance();

revoke all on function public.complete_test_checkout(text) from public, anon;
revoke all on function public.invite_plan_member(text) from public, anon;
revoke all on function public.cancel_plan_invitation(text) from public, anon;
revoke all on function public.claim_plan_invitation() from public, anon;
revoke all on function public.get_plan_status() from public, anon;
revoke all on function public.find_circle_user(text) from public, anon;
grant execute on function public.complete_test_checkout(text) to authenticated;
grant execute on function public.invite_plan_member(text) to authenticated;
grant execute on function public.cancel_plan_invitation(text) to authenticated;
grant execute on function public.claim_plan_invitation() to authenticated;
grant execute on function public.get_plan_status() to authenticated;
grant execute on function public.find_circle_user(text) to authenticated;
comment on function public.complete_test_checkout(text) is
  'Temporary non-billable checkout: grants one account plan and 10 test Jar credits to its owner.';
revoke all on function private.require_plan_for_jar() from public, anon, authenticated;
revoke all on function private.require_one_recipient() from public, anon, authenticated;
revoke all on function private.consume_jar_allowance() from public, anon, authenticated;
