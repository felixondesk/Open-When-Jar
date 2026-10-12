-- Draft only: not applied to the live project or included in migrations yet.
-- Fulfilled extra-Jar purchases belong to one seat and never expire while
-- the account exists. Only a verified, server-side payment handler may insert.
create table public.extra_jar_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.plan_members(user_id) on delete cascade,
  provider_order_id text not null unique check (char_length(provider_order_id) between 1 and 200),
  currency text not null check (currency in ('USD', 'INR')),
  amount_minor integer not null,
  used_by_jar uuid unique,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint extra_jar_credits_price check (
    (currency = 'USD' and amount_minor = 199)
    or (currency = 'INR' and amount_minor = 5900)
  ),
  constraint extra_jar_credits_refund_unused check (refunded_at is null or used_by_jar is null)
);

create index extra_jar_credits_available_idx
  on public.extra_jar_credits(user_id, created_at)
  where used_by_jar is null and refunded_at is null;

alter table public.extra_jar_credits enable row level security;
revoke all on public.extra_jar_credits from public, anon, authenticated;
grant select on public.extra_jar_credits to authenticated;
create policy "Members can read their own extra Jar credits"
on public.extra_jar_credits for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_plan_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.plan_members%rowtype;
  v_group public.one_time_plans%rowtype;
  v_extra_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_member from public.plan_members where user_id = auth.uid();
  if v_member.user_id is null then return null; end if;
  select * into v_group from public.one_time_plans where id = v_member.group_id;
  select count(*)::integer into v_extra_count from public.extra_jar_credits
  where user_id = v_member.user_id and refunded_at is null;
  return pg_catalog.jsonb_build_object(
    'isOwner', v_group.owner_id = auth.uid(),
    'planCode', v_group.plan_code,
    'seatLimit', v_group.seat_limit,
    'jarsUsed', v_member.jars_used,
    'jarLimit', 10 + v_extra_count,
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

create or replace function private.consume_jar_allowance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.plan_members%rowtype;
  v_extra_count integer;
begin
  select * into v_member from public.plan_members where user_id = new.creator_id for update;
  if v_member.user_id is null then raise exception 'PLAN_REQUIRED' using errcode = '23514'; end if;
  select count(*)::integer into v_extra_count from public.extra_jar_credits
  where user_id = new.creator_id and refunded_at is null;
  if v_member.jars_used >= 10 + v_extra_count then
    raise exception 'JAR_LIMIT_REACHED' using errcode = '23514';
  end if;
  if (select count(*) from public.jar_recipients where jar_id = new.id) <> 1 then
    raise exception 'SINGLE_RECIPIENT_JARS_ONLY' using errcode = '23514';
  end if;
  update public.plan_members set jars_used = jars_used + 1 where user_id = new.creator_id;
  return new;
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
  v_member public.plan_members%rowtype;
  v_credit public.jar_credits%rowtype;
  v_extra public.extra_jar_credits%rowtype;
  v_recipient_count integer;
  v_entitlement public.credit_source;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_jar from public.jars where jars.id = p_jar_id for update;
  if not found or v_jar.creator_id <> v_user_id then raise exception 'Jar not found'; end if;
  if v_jar.status <> 'draft' then raise exception 'This jar is already sealed'; end if;
  if not exists (select 1 from public.envelope_headers where jar_id = p_jar_id) then raise exception 'Add an envelope before sealing'; end if;

  select count(*) into v_recipient_count from public.jar_recipients where jar_id = p_jar_id;
  if v_recipient_count < 1 or v_recipient_count > v_jar.recipient_limit then raise exception 'This jar has an invalid recipient count'; end if;
  select * into v_member from public.plan_members where user_id = v_user_id for update;
  if v_member.user_id is null then raise exception 'PLAN_REQUIRED' using errcode = '23514'; end if;

  if v_member.jars_used < 10 then
    select * into v_credit from public.jar_credits
    where user_id = v_user_id and plan_code = v_jar.plan_code
      and recipient_limit >= v_recipient_count and used_count < granted_count
    order by case when source = 'free' then 0 else 1 end, created_at
    for update skip locked limit 1;
    if not found then
      raise sqlstate 'PGRST' using
        message = json_build_object('code', 'JAR_CREDIT_REQUIRED', 'planCode', v_jar.plan_code, 'amountCents', v_jar.amount_cents)::text,
        detail = json_build_object('status', 402)::text;
    end if;
    update public.jar_credits set used_count = used_count + 1 where jar_credits.id = v_credit.id;
    v_entitlement := v_credit.source;
  else
    select * into v_extra from public.extra_jar_credits
    where user_id = v_user_id and used_by_jar is null and refunded_at is null
    order by created_at, id for update skip locked limit 1;
    if not found then raise exception 'JAR_LIMIT_REACHED' using errcode = '23514'; end if;
    update public.extra_jar_credits set used_by_jar = p_jar_id where extra_jar_credits.id = v_extra.id;
    v_entitlement := 'paid';
  end if;

  update public.jars
  set status = 'sealed', entitlement_source = v_entitlement,
      sealed_at = now(), hosting_ends_at = now() + interval '3 years'
  where jars.id = p_jar_id;
  update public.jar_recipients set revealed_at = now() where jar_id = p_jar_id;

  return query select j.id, j.status, j.entitlement_source, j.hosting_ends_at
  from public.jars j where j.id = p_jar_id;
end;
$$;
