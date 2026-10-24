-- Admin-managed percentage promo codes for plan checkout. The DB owns validity, caps and the discounted price;
-- the checkout action mirrors each redemption into a single-use Dodo discount for that one intent.

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  percent_off smallint not null check (percent_off between 1 and 99),
  valid_until date not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  max_redemptions integer not null check (max_redemptions between 1 and 1000000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from public, anon, authenticated;

alter table public.dodo_test_payment_intents
  add column promo_code_id uuid references public.promo_codes(id) on delete restrict,
  add column list_amount_minor integer check (list_amount_minor is null or list_amount_minor > 0);

-- One live or completed use of a code per account.
create unique index dodo_test_intents_promo_once_per_user
  on public.dodo_test_payment_intents(promo_code_id, owner_id)
  where promo_code_id is not null and status in ('pending', 'succeeded', 'needs_review');

-- Validates a code for a user and returns it. Callers must run inside a transaction that may lock the row.
create function private.redeemable_promo_code(p_code text, p_user_id uuid)
returns public.promo_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_promo public.promo_codes%rowtype;
begin
  select * into v_promo from public.promo_codes
  where code = upper(btrim(coalesce(p_code, ''))) for update;
  if v_promo.id is null or v_promo.status <> 'active'
     or v_promo.valid_until < (now() at time zone 'utc')::date then
    raise exception 'PROMO_INVALID';
  end if;
  if exists (
    select 1 from public.dodo_test_payment_intents
    where promo_code_id = v_promo.id and owner_id = p_user_id
      and (status in ('succeeded', 'needs_review') or (status = 'pending' and created_at > now() - interval '24 hours'))
  ) then raise exception 'PROMO_ALREADY_USED'; end if;
  if (
    select count(*) from public.dodo_test_payment_intents
    where promo_code_id = v_promo.id
      and (status in ('succeeded', 'needs_review') or (status = 'pending' and created_at > now() - interval '24 hours'))
  ) >= v_promo.max_redemptions then raise exception 'PROMO_USED_UP'; end if;
  return v_promo;
end;
$$;

revoke all on function private.redeemable_promo_code(text, uuid) from public, anon, authenticated;

create function public.check_promo_code(p_code text)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  return (private.redeemable_promo_code(p_code, v_user_id)).percent_off;
end;
$$;

revoke all on function public.check_promo_code(text) from public, anon;
grant execute on function public.check_promo_code(text) to authenticated;

-- Return shape changes, so the old signature is dropped. Keeps the extra Jar product id from
-- 20260923121217; replaying local files in filename order would otherwise end on 20260923150020's wrong id.
drop function public.create_dodo_test_payment_intent(uuid, text, text, text, text[]);

create function public.create_dodo_test_payment_intent(
  p_intent_id uuid,
  p_purchase_type text,
  p_plan_code text,
  p_currency text,
  p_invite_emails text[] default '{}',
  p_promo_code text default null
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

  -- Dodo Test Mode catalog IDs. Keep these in sync with lib/dodo-payments.ts.
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
    v_product_id := case p_plan_code
      when 'one_heart' then 'pdt_0NoD2B2hHk4o2flDTLCHu'
      when 'two_hearts' then 'pdt_0NoD2uXbJCmqczV0EoE7Z'
      when 'close_circle' then 'pdt_0NoD38hZE7pJyn2jdOneN'
      when 'family_circle' then 'pdt_0NoD3KvIxN5Xx4sFVP7rQ'
      when 'big_heart' then 'pdt_0NoD3TOCNAxFB90JxKnyQ' end;

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
    v_product_id := 'pdt_0NoD3bz3qRPPvVDlx49zW';
  else
    raise exception 'INVALID_PURCHASE_TYPE';
  end if;

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
    promo_code_id, list_amount_minor
  ) values (
    p_intent_id, v_user_id, p_purchase_type, p_plan_code, v_product_id, p_currency, v_amount, v_emails,
    v_promo.id, v_list_amount
  );

  return query select p_intent_id, v_product_id, v_amount, v_list_amount, v_promo.percent_off;
end;
$$;

revoke all on function public.create_dodo_test_payment_intent(uuid, text, text, text, text[], text) from public, anon;
grant execute on function public.create_dodo_test_payment_intent(uuid, text, text, text, text[], text) to authenticated;

create function public.admin_list_promo_codes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.promo_codes.list');
  return (
    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc), '[]'::jsonb)
    from (select promo.id, promo.name, promo.code, promo.percent_off, promo.valid_until, promo.status,
      promo.max_redemptions, promo.created_at,
      (select count(*) from public.dodo_test_payment_intents i
        where i.promo_code_id = promo.id and i.status in ('succeeded', 'needs_review')) as redemptions
      from public.promo_codes promo limit 500) item
  );
end;
$$;

create function public.admin_upsert_promo_code(
  p_id uuid, p_name text, p_code text, p_percent_off integer, p_valid_until date, p_status text, p_max_redemptions integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_id uuid;
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  if p_valid_until is null or p_status not in ('active', 'inactive') then raise exception 'INVALID_PROMO' using errcode = '22023'; end if;

  if p_id is null then
    if exists (select 1 from public.promo_codes where code = upper(btrim(coalesce(p_code, '')))) then
      raise exception 'PROMO_CODE_TAKEN' using errcode = '23505';
    end if;
    insert into public.promo_codes(name, code, percent_off, valid_until, status, max_redemptions, created_by)
    values (btrim(p_name), upper(btrim(p_code)), p_percent_off, p_valid_until, p_status, p_max_redemptions, v_actor)
    returning id into v_id;
    insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.promo_codes.create');
  else
    -- The code itself is immutable: existing payment intents reference it.
    update public.promo_codes
    set name = btrim(p_name), percent_off = p_percent_off, valid_until = p_valid_until, status = p_status,
        max_redemptions = p_max_redemptions, updated_at = now()
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'PROMO_NOT_FOUND' using errcode = 'P0002'; end if;
    insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.promo_codes.update');
  end if;
  return v_id;
end;
$$;

revoke all on function public.admin_list_promo_codes() from public, anon;
revoke all on function public.admin_upsert_promo_code(uuid, text, text, integer, date, text, integer) from public, anon;
grant execute on function public.admin_list_promo_codes() to authenticated;
grant execute on function public.admin_upsert_promo_code(uuid, text, text, integer, date, text, integer) to authenticated;
