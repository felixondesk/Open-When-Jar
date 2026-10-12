-- Temporary non-billable checkout substitute. Remove this RPC when the real
-- payment provider and signed webhook fulfilment are ready.
create or replace function public.complete_test_checkout(p_plan_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_credit_id uuid;
  v_recipient_limit smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_recipient_limit := case p_plan_code
    when 'one_heart' then 1
    when 'two_hearts' then 2
    when 'close_circle' then 3
    when 'family_circle' then 5
    when 'big_heart' then 10
    else null
  end;

  if v_recipient_limit is null then
    raise exception 'Choose a valid jar size';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_plan_code, 0)
  );

  select credit.id into v_credit_id
  from public.jar_credits as credit
  where credit.user_id = v_user_id
    and credit.source = 'test'
    and credit.plan_code = p_plan_code
    and credit.used_count < credit.granted_count
  order by credit.created_at
  limit 1;

  if v_credit_id is not null then
    return v_credit_id;
  end if;

  insert into public.jar_credits (
    user_id,
    source,
    plan_code,
    amount_cents,
    recipient_limit,
    granted_count
  )
  values (
    v_user_id,
    'test',
    p_plan_code,
    0,
    v_recipient_limit,
    1
  )
  returning id into v_credit_id;

  return v_credit_id;
end;
$$;

revoke execute on function public.complete_test_checkout(text) from public, anon;
grant execute on function public.complete_test_checkout(text) to authenticated;

comment on function public.complete_test_checkout(text) is
  'Temporary checkout substitute: grants the authenticated user a non-billable test credit for the selected plan.';
