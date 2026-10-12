-- Dodo sandbox checkouts are non-billable test purchases. This migration is local
-- until explicitly applied to a Supabase project.

drop function if exists public.complete_test_checkout(text);

create table public.dodo_test_payment_intents (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  purchase_type text not null check (purchase_type in ('plan', 'extra_jar')),
  plan_code text check (plan_code in ('one_heart', 'two_hearts', 'close_circle', 'family_circle', 'big_heart')),
  product_id text not null,
  currency text not null check (currency in ('USD', 'INR')),
  expected_amount_minor integer not null check (expected_amount_minor > 0),
  invite_emails text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'needs_review')),
  payment_id text unique,
  paid_amount_minor integer check (paid_amount_minor is null or paid_amount_minor >= 0),
  tax_minor integer check (tax_minor is null or tax_minor >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint dodo_test_intent_shape check (
    (purchase_type = 'plan' and plan_code is not null)
    or (purchase_type = 'extra_jar' and plan_code is null and cardinality(invite_emails) = 0)
  )
);

alter table public.dodo_test_payment_intents enable row level security;
revoke all on public.dodo_test_payment_intents from public, anon, authenticated;

create table public.dodo_test_webhook_events (
  event_id text primary key check (char_length(event_id) between 1 and 200),
  payment_id text not null,
  event_type text not null check (event_type = 'payment.succeeded'),
  received_at timestamptz not null default now()
);

alter table public.dodo_test_webhook_events enable row level security;
revoke all on public.dodo_test_webhook_events from public, anon, authenticated;

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

create function public.create_dodo_test_payment_intent(
  p_intent_id uuid,
  p_purchase_type text,
  p_plan_code text,
  p_currency text,
  p_invite_emails text[] default '{}'
)
returns table (intent_id uuid, product_id text, expected_amount_minor integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_product_id text;
  v_amount integer;
  v_seats smallint;
  v_emails text[] := coalesce(p_invite_emails, '{}');
  v_email text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_intent_id is null or p_currency not in ('USD', 'INR') then raise exception 'INVALID_CHECKOUT'; end if;

  -- Dodo Test Mode catalog IDs. Keep these in sync with lib/dodo-payments.ts.
  if p_purchase_type = 'plan' then
    v_seats := case p_plan_code
      when 'one_heart' then 1 when 'two_hearts' then 2 when 'close_circle' then 3
      when 'family_circle' then 5 when 'big_heart' then 10 else null end;
    if v_seats is null then raise exception 'INVALID_PLAN'; end if;
    v_amount := case p_currency
      when 'USD' then case p_plan_code
        when 'one_heart' then 799 when 'two_hearts' then 1499 when 'close_circle' then 1999
        when 'family_circle' then 2999 when 'big_heart' then 4999 end
      when 'INR' then case p_plan_code
        when 'one_heart' then 39900 when 'two_hearts' then 69900 when 'close_circle' then 99900
        when 'family_circle' then 149900 when 'big_heart' then 249900 end
    end;
    v_product_id := case p_plan_code
      when 'one_heart' then 'pdt_0NoD2B2hHk4o2flDTLCHu'
      when 'two_hearts' then 'pdt_0NoD2uXbJCmqczV0EoE7Z'
      when 'close_circle' then 'pdt_0NoD38hZE7pJyn2jdOneN'
      when 'family_circle' then 'pdt_0NoD3KvIxN5Xx4sFVP7rQ'
      when 'big_heart' then 'pdt_0NoD3TOCNAxFB90JxKnyQ' end;

    if cardinality(v_emails) <> v_seats - 1 then raise exception 'INVALID_INVITE_COUNT'; end if;
    if exists (
      select 1 from unnest(v_emails) as invited(email)
      where length(invited.email) > 320
        or lower(btrim(invited.email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then raise exception 'INVALID_EMAIL'; end if;
    v_emails := coalesce(array(select lower(btrim(email)) from unnest(v_emails) as invited(email)), '{}');
    if cardinality(v_emails) <> (select count(distinct email) from unnest(v_emails) as invited(email)) then
      raise exception 'DUPLICATE_EMAIL';
    end if;
    if exists (
      select 1 from unnest(v_emails) as invited(email)
      where lower(invited.email) = (select lower(auth_user.email) from auth.users auth_user where auth_user.id = v_user_id)
    ) then raise exception 'OWNER_EMAIL_INVITED'; end if;
    if exists (select 1 from public.plan_members where user_id = v_user_id) then raise exception 'PLAN_ALREADY_ACTIVE'; end if;
    if exists (
      select 1 from public.dodo_test_payment_intents
      where owner_id = v_user_id and purchase_type = 'plan' and status = 'pending'
        and created_at > now() - interval '24 hours'
    ) then raise exception 'CHECKOUT_ALREADY_PENDING'; end if;
    if exists (
      select 1 from unnest(v_emails) as invited(email)
      where exists (select 1 from public.plan_invitations invitation where invitation.email = invited.email::extensions.citext)
         or exists (
           select 1 from auth.users auth_user join public.plan_members member on member.user_id = auth_user.id
           where lower(auth_user.email) = invited.email
         )
    ) then raise exception 'INVITEE_ALREADY_HAS_SEAT'; end if;
  elsif p_purchase_type = 'extra_jar' then
    if p_plan_code is not null or cardinality(v_emails) <> 0 then raise exception 'INVALID_EXTRA_JAR'; end if;
    if not exists (select 1 from public.plan_members where user_id = v_user_id) then raise exception 'PLAN_REQUIRED'; end if;
    v_amount := case p_currency when 'USD' then 199 when 'INR' then 5900 end;
    v_product_id := 'pdt_0NoD3bz3qRPPvVDlx49zW2';
  else
    raise exception 'INVALID_PURCHASE_TYPE';
  end if;

  update public.dodo_test_payment_intents
  set status = 'failed', invite_emails = '{}', completed_at = now()
  where owner_id = v_user_id and status = 'pending' and created_at <= now() - interval '24 hours';

  insert into public.dodo_test_payment_intents (
    id, owner_id, purchase_type, plan_code, product_id, currency, expected_amount_minor, invite_emails
  ) values (
    p_intent_id, v_user_id, p_purchase_type, p_plan_code, v_product_id, p_currency, v_amount, v_emails
  );

  return query select p_intent_id, v_product_id, v_amount;
end;
$$;

create function public.fail_dodo_test_payment_intent(p_intent_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.dodo_test_payment_intents
  set status = 'failed', invite_emails = '{}', completed_at = now()
  where id = p_intent_id and owner_id = auth.uid() and status = 'pending';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create function public.fulfill_dodo_test_payment(
  p_event_id text,
  p_intent_id uuid,
  p_payment_id text,
  p_product_id text,
  p_currency text,
  p_total_amount integer,
  p_tax integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.dodo_test_payment_intents%rowtype;
  v_group_id uuid;
  v_seats smallint;
  v_email text;
  v_reserved_emails text[] := '{}';
  v_event_inserted integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_event_id is null or char_length(p_event_id) not between 1 and 200
     or p_payment_id is null or char_length(p_payment_id) not between 1 and 200
     or p_total_amount is null or p_total_amount < 0
     or coalesce(p_tax, 0) < 0 then raise exception 'INVALID_PAYMENT'; end if;

  select * into v_intent from public.dodo_test_payment_intents where id = p_intent_id for update;
  if v_intent.id is null then raise exception 'PAYMENT_INTENT_NOT_FOUND'; end if;
  if v_intent.status = 'succeeded' and v_intent.payment_id = p_payment_id then
    insert into public.dodo_test_webhook_events(event_id, payment_id, event_type)
    values (p_event_id, p_payment_id, 'payment.succeeded') on conflict do nothing;
    return pg_catalog.jsonb_build_object('status', 'duplicate', 'invite_emails', '[]'::jsonb);
  end if;
  if v_intent.status <> 'pending' then raise exception 'PAYMENT_INTENT_NOT_PENDING'; end if;
  if v_intent.created_at < now() - interval '25 hours' then raise exception 'PAYMENT_INTENT_EXPIRED'; end if;
  if p_product_id <> v_intent.product_id or p_currency <> v_intent.currency
     or p_total_amount - coalesce(p_tax, 0) <> v_intent.expected_amount_minor then
    raise exception 'PAYMENT_DETAILS_MISMATCH';
  end if;

  insert into public.dodo_test_webhook_events(event_id, payment_id, event_type)
  values (p_event_id, p_payment_id, 'payment.succeeded') on conflict do nothing;
  get diagnostics v_event_inserted = row_count;
  if v_event_inserted = 0 then
    return pg_catalog.jsonb_build_object('status', 'duplicate', 'invite_emails', '[]'::jsonb);
  end if;

  if v_intent.purchase_type = 'plan' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_intent.owner_id::text, 0));
    if exists (select 1 from public.plan_members where user_id = v_intent.owner_id) then
      update public.dodo_test_payment_intents
      set status = 'needs_review', payment_id = p_payment_id,
          paid_amount_minor = p_total_amount, tax_minor = coalesce(p_tax, 0), completed_at = now()
      where id = v_intent.id;
      return pg_catalog.jsonb_build_object('status', 'needs_review', 'invite_emails', '[]'::jsonb);
    end if;

    v_seats := case v_intent.plan_code
      when 'one_heart' then 1 when 'two_hearts' then 2 when 'close_circle' then 3
      when 'family_circle' then 5 when 'big_heart' then 10 end;
    insert into public.one_time_plans(owner_id, plan_code, seat_limit, source)
    values (v_intent.owner_id, v_intent.plan_code, v_seats, 'test') returning id into v_group_id;
    insert into public.plan_members(group_id, user_id, jars_used)
    select v_group_id, v_intent.owner_id, count(*)::integer
    from public.jars where creator_id = v_intent.owner_id and status in ('sealed', 'hosting_ended');
    insert into public.jar_credits(user_id, source, plan_code, amount_cents, recipient_limit, granted_count)
    values (v_intent.owner_id, 'test', 'one_heart', 0, 1, 10);

    foreach v_email in array v_intent.invite_emails loop
      if not exists (
        select 1 from public.plan_invitations where email = v_email::extensions.citext
      ) and not exists (
        select 1 from auth.users auth_user join public.plan_members member on member.user_id = auth_user.id
        where lower(auth_user.email) = v_email
      ) then
        insert into public.plan_invitations(group_id, email)
        values (v_group_id, v_email::extensions.citext)
        on conflict do nothing;
        if found then v_reserved_emails := pg_catalog.array_append(v_reserved_emails, v_email); end if;
      end if;
    end loop;
  else
    if not exists (select 1 from public.plan_members where user_id = v_intent.owner_id) then
      raise exception 'PLAN_REQUIRED';
    end if;
    insert into public.extra_jar_credits(user_id, provider_order_id, currency, amount_minor)
    values (v_intent.owner_id, p_payment_id, v_intent.currency, v_intent.expected_amount_minor);
  end if;

  update public.dodo_test_payment_intents
  set status = 'succeeded', payment_id = p_payment_id,
      paid_amount_minor = p_total_amount, tax_minor = coalesce(p_tax, 0),
      invite_emails = '{}', completed_at = now()
  where id = v_intent.id;

  return pg_catalog.jsonb_build_object(
    'status', 'fulfilled',
    'invite_emails', to_jsonb(v_reserved_emails)
  );
end;
$$;

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
    v_entitlement := 'test';
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

revoke all on function public.create_dodo_test_payment_intent(uuid, text, text, text, text[]) from public, anon;
revoke all on function public.fail_dodo_test_payment_intent(uuid) from public, anon;
revoke all on function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.create_dodo_test_payment_intent(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.fail_dodo_test_payment_intent(uuid) to authenticated;
grant execute on function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer) to service_role;

revoke all on function public.get_plan_status() from public, anon;
grant execute on function public.get_plan_status() to authenticated;
revoke all on function public.seal_jar(uuid) from public, anon;
grant execute on function public.seal_jar(uuid) to authenticated;
revoke all on function private.consume_jar_allowance() from public, anon, authenticated;

comment on function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer) is
  'Idempotently grants test-only plan or extra-Jar access after the Dodo Test Mode webhook signature is verified.';
