-- Correct the Extra Jar ID to the product present in the Dodo Test Mode catalog.
create or replace function public.create_dodo_test_payment_intent(
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
    if not exists (select 1 from public.plan_members where user_id = v_user_id) then raise exception 'PLAN_REQUIRED'; end if;
    v_amount := case p_currency when 'USD' then 199 when 'INR' then 5900 end;
    v_product_id := 'pdt_0NoD3bz3qRPPvVDlx49zW';
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
