-- Dodo live mode: catalog IDs per mode, paid entitlement sources, and refund/dispute revocation.
-- Test Mode stays the default; the app and webhook pass their mode explicitly.

create table public.dodo_products (
  mode text not null check (mode in ('test_mode', 'live_mode')),
  purchase_key text not null check (purchase_key in ('one_heart', 'two_hearts', 'close_circle', 'family_circle', 'big_heart', 'extra_jar')),
  product_id text not null check (product_id ~ '^pdt_[A-Za-z0-9]+$'),
  primary key (mode, purchase_key)
);
alter table public.dodo_products enable row level security;
revoke all on public.dodo_products from public, anon, authenticated;
comment on table public.dodo_products is
  'Dodo catalog IDs per mode. Insert the live_mode rows after creating the same products in the Dodo live dashboard.';

insert into public.dodo_products (mode, purchase_key, product_id) values
  ('test_mode', 'one_heart', 'pdt_0NoD2B2hHk4o2flDTLCHu'),
  ('test_mode', 'two_hearts', 'pdt_0NoD2uXbJCmqczV0EoE7Z'),
  ('test_mode', 'close_circle', 'pdt_0NoD38hZE7pJyn2jdOneN'),
  ('test_mode', 'family_circle', 'pdt_0NoD3KvIxN5Xx4sFVP7rQ'),
  ('test_mode', 'big_heart', 'pdt_0NoD3TOCNAxFB90JxKnyQ'),
  ('test_mode', 'extra_jar', 'pdt_0NoD3bz3qRPPvVDlx49zW');

alter table public.dodo_test_payment_intents
  add column mode text not null default 'test_mode' check (mode in ('test_mode', 'live_mode')),
  drop constraint dodo_test_payment_intents_status_check,
  add constraint dodo_test_payment_intents_status_check
    check (status in ('pending', 'succeeded', 'failed', 'needs_review', 'refunded'));

alter table public.dodo_test_webhook_events
  drop constraint dodo_test_webhook_events_event_type_check,
  add constraint dodo_test_webhook_events_event_type_check check (char_length(event_type) between 1 and 60);

-- A paid plan grants a 10-Jar allowance priced on the payment intent, not per Jar.
alter table public.jar_credits drop constraint jar_credits_known_plan;
alter table public.jar_credits add constraint jar_credits_known_plan check (
  (source = 'free' and plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 0)
  or (source = 'paid' and plan_code = 'one_heart' and recipient_limit = 1 and amount_cents in (0, 799))
  or (source = 'paid' and (
    (plan_code = 'two_hearts' and recipient_limit = 2 and amount_cents = 1499)
    or (plan_code = 'close_circle' and recipient_limit = 3 and amount_cents = 1999)
    or (plan_code = 'family_circle' and recipient_limit = 5 and amount_cents = 2999)
    or (plan_code = 'big_heart' and recipient_limit = 10 and amount_cents = 4999)
  ))
  or (source = 'test' and amount_cents = 0 and (
    (plan_code = 'one_heart' and recipient_limit = 1)
    or (plan_code = 'two_hearts' and recipient_limit = 2)
    or (plan_code = 'close_circle' and recipient_limit = 3)
    or (plan_code = 'family_circle' and recipient_limit = 5)
    or (plan_code = 'big_heart' and recipient_limit = 10)
  ))
);

drop function public.create_dodo_test_payment_intent(uuid, text, text, text, text[], text);

create function public.create_dodo_test_payment_intent(
  p_intent_id uuid,
  p_purchase_type text,
  p_plan_code text,
  p_currency text,
  p_invite_emails text[] default '{}',
  p_promo_code text default null,
  p_mode text default 'test_mode'
)
returns table (intent_id uuid, product_id text, expected_amount_minor integer, list_amount_minor integer, percent_off smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_product_id text;
  v_list_amount integer;
  v_amount integer;
  v_seats smallint;
  v_emails text[] := coalesce(p_invite_emails, '{}');
  v_promo public.promo_codes%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_intent_id is null or p_currency not in ('USD', 'INR') then raise exception 'INVALID_CHECKOUT'; end if;
  if p_mode not in ('test_mode', 'live_mode') then raise exception 'INVALID_MODE'; end if;

  if p_purchase_type = 'plan' then
    v_seats := case p_plan_code
      when 'one_heart' then 1 when 'two_hearts' then 2 when 'close_circle' then 3
      when 'family_circle' then 5 when 'big_heart' then 10 else null end;
    if v_seats is null then raise exception 'INVALID_PLAN'; end if;
    v_list_amount := case p_currency
      when 'USD' then case p_plan_code
        when 'one_heart' then 799 when 'two_hearts' then 1499 when 'close_circle' then 1999
        when 'family_circle' then 2999 when 'big_heart' then 4999 end
      when 'INR' then case p_plan_code
        when 'one_heart' then 39900 when 'two_hearts' then 69900 when 'close_circle' then 99900
        when 'family_circle' then 149900 when 'big_heart' then 249900 end
    end;

    if cardinality(v_emails) > v_seats - 1 then raise exception 'INVALID_INVITE_COUNT'; end if;
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
    if nullif(btrim(coalesce(p_promo_code, '')), '') is not null then raise exception 'PROMO_INVALID'; end if;
    if not exists (select 1 from public.plan_members where user_id = v_user_id) then raise exception 'PLAN_REQUIRED'; end if;
    v_list_amount := case p_currency when 'USD' then 199 when 'INR' then 5900 end;
  else
    raise exception 'INVALID_PURCHASE_TYPE';
  end if;

  select product.product_id into v_product_id from public.dodo_products product
  where product.mode = p_mode and product.purchase_key = coalesce(p_plan_code, 'extra_jar');
  if v_product_id is null then raise exception 'PRODUCT_NOT_CONFIGURED'; end if;

  update public.dodo_test_payment_intents
  set status = 'failed', invite_emails = '{}', completed_at = now()
  where owner_id = v_user_id and status = 'pending' and created_at <= now() - interval '24 hours';

  v_amount := v_list_amount;
  if nullif(btrim(coalesce(p_promo_code, '')), '') is not null then
    v_promo := private.redeemable_promo_code(p_promo_code, v_user_id);
    v_amount := round(v_list_amount * (100 - v_promo.percent_off) / 100.0)::integer;
  end if;

  insert into public.dodo_test_payment_intents (
    id, owner_id, purchase_type, plan_code, product_id, currency, expected_amount_minor, invite_emails,
    promo_code_id, list_amount_minor, mode
  ) values (
    p_intent_id, v_user_id, p_purchase_type, p_plan_code, v_product_id, p_currency, v_amount, v_emails,
    v_promo.id, v_list_amount, p_mode
  );

  return query select p_intent_id, v_product_id, v_amount, v_list_amount, v_promo.percent_off;
end;
$$;
revoke all on function public.create_dodo_test_payment_intent(uuid, text, text, text, text[], text, text) from public, anon;
grant execute on function public.create_dodo_test_payment_intent(uuid, text, text, text, text[], text, text) to authenticated;

drop function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer);

create function public.fulfill_dodo_test_payment(
  p_event_id text,
  p_intent_id uuid,
  p_payment_id text,
  p_product_id text,
  p_currency text,
  p_total_amount integer,
  p_tax integer,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.dodo_test_payment_intents%rowtype;
  v_source public.credit_source := case when p_mode = 'live_mode' then 'paid' else 'test' end;
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
     or coalesce(p_tax, 0) < 0
     or p_mode not in ('test_mode', 'live_mode') then raise exception 'INVALID_PAYMENT'; end if;

  select * into v_intent from public.dodo_test_payment_intents where id = p_intent_id for update;
  if v_intent.id is null then raise exception 'PAYMENT_INTENT_NOT_FOUND'; end if;
  if v_intent.status = 'succeeded' and v_intent.payment_id = p_payment_id then
    insert into public.dodo_test_webhook_events(event_id, payment_id, event_type)
    values (p_event_id, p_payment_id, 'payment.succeeded') on conflict do nothing;
    return pg_catalog.jsonb_build_object('status', 'duplicate', 'invite_emails', '[]'::jsonb);
  end if;
  if v_intent.status <> 'pending' then raise exception 'PAYMENT_INTENT_NOT_PENDING'; end if;
  if v_intent.created_at < now() - interval '25 hours' then raise exception 'PAYMENT_INTENT_EXPIRED'; end if;
  if v_intent.mode <> p_mode or p_product_id <> v_intent.product_id or p_currency <> v_intent.currency
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
    values (v_intent.owner_id, v_intent.plan_code, v_seats, v_source::text) returning id into v_group_id;
    insert into public.plan_members(group_id, user_id, jars_used)
    select v_group_id, v_intent.owner_id, count(*)::integer
    from public.jars where creator_id = v_intent.owner_id and status in ('sealed', 'hosting_ended');
    insert into public.jar_credits(user_id, source, plan_code, amount_cents, recipient_limit, granted_count, provider_order_id)
    values (v_intent.owner_id, v_source, 'one_heart', 0, 1, 10, case when v_source = 'paid' then p_payment_id end);

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
revoke all on function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer, text) to service_role;
comment on function public.fulfill_dodo_test_payment(text, uuid, text, text, text, integer, integer, text) is
  'Idempotently grants plan or extra-Jar access after the Dodo webhook signature is verified; live_mode grants paid entitlements, test_mode grants non-billable ones.';

-- Full refunds and lost/accepted disputes take back unused entitlements. Anything already used
-- (a sealed Jar) is left for an admin: the intent moves to needs_review instead.
create function public.revoke_dodo_payment(
  p_event_id text,
  p_event_type text,
  p_payment_id text,
  p_mode text,
  p_partial boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.dodo_test_payment_intents%rowtype;
  v_plan public.one_time_plans%rowtype;
  v_event_inserted integer;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_event_id is null or char_length(p_event_id) not between 1 and 200
     or p_event_type is null or char_length(p_event_type) not between 1 and 60
     or p_payment_id is null or char_length(p_payment_id) not between 1 and 200
     or p_mode not in ('test_mode', 'live_mode') then raise exception 'INVALID_REFUND'; end if;

  select * into v_intent from public.dodo_test_payment_intents
  where payment_id = p_payment_id and mode = p_mode for update;
  if v_intent.id is null then return pg_catalog.jsonb_build_object('status', 'ignored'); end if;

  insert into public.dodo_test_webhook_events(event_id, payment_id, event_type)
  values (p_event_id, p_payment_id, p_event_type) on conflict do nothing;
  get diagnostics v_event_inserted = row_count;
  if v_event_inserted = 0 then return pg_catalog.jsonb_build_object('status', 'duplicate'); end if;
  if v_intent.status <> 'succeeded' then return pg_catalog.jsonb_build_object('status', 'ignored'); end if;

  if p_partial then
    v_status := 'needs_review';
  elsif v_intent.purchase_type = 'extra_jar' then
    update public.extra_jar_credits set refunded_at = now()
    where provider_order_id = p_payment_id and used_by_jar is null and refunded_at is null;
    v_status := case when found then 'refunded' else 'needs_review' end;
  else
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_intent.owner_id::text, 0));
    select * into v_plan from public.one_time_plans where owner_id = v_intent.owner_id for update;
    if v_plan.id is null then
      v_status := 'refunded';
    elsif exists (
      select 1 from public.jars jar join public.plan_members member on member.user_id = jar.creator_id
      where member.group_id = v_plan.id and jar.sealed_at >= v_plan.created_at
    ) then
      v_status := 'needs_review';
    else
      delete from public.jar_credits
      where user_id = v_plan.owner_id and used_count = 0
        and (provider_order_id = p_payment_id or (source = 'test' and created_at >= v_plan.created_at));
      delete from public.one_time_plans where id = v_plan.id;
      v_status := 'refunded';
    end if;
  end if;

  update public.dodo_test_payment_intents set status = v_status where id = v_intent.id;
  return pg_catalog.jsonb_build_object('status', v_status);
end;
$$;
revoke all on function public.revoke_dodo_payment(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.revoke_dodo_payment(text, text, text, text, boolean) to service_role;

-- Extra Jars inherit the plan's entitlement source instead of always reading as test.
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
    select plan.source::public.credit_source into v_entitlement from public.one_time_plans plan where plan.id = v_member.group_id;
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
