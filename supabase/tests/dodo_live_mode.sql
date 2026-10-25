-- Run after 20261025090000_add_dodo_live_mode. All fixtures and webhook rows are rolled back.
begin;
set local statement_timeout = '20s';
create temporary table live_fixture(buyer_id uuid default gen_random_uuid());
insert into live_fixture default values;
insert into auth.users(id, email, raw_user_meta_data)
select buyer_id, buyer_id::text || '@example.invalid',
  jsonb_build_object('username', 'liveqa_' || left(replace(buyer_id::text, '-', ''), 20), 'display_name', 'Live QA')
from live_fixture;
insert into public.dodo_products(mode, purchase_key, product_id) values
  ('live_mode', 'one_heart', 'pdt_liveqaplan'), ('live_mode', 'extra_jar', 'pdt_liveqaextra');
grant select on live_fixture to authenticated, service_role;

do $$
declare f record; v_plan_intent uuid := gen_random_uuid(); v_extra_intent uuid := gen_random_uuid(); v_row record; v_result jsonb;
begin
  select * into f from live_fixture;

  -- Buyer creates a live intent; a mode without catalog rows is refused.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.buyer_id, 'role', 'authenticated')::text, true);
  begin
    perform public.create_dodo_test_payment_intent(gen_random_uuid(), 'plan', 'two_hearts', 'USD', '{}', null, 'live_mode');
    raise exception 'FAIL: unconfigured product accepted';
  exception when raise_exception then if sqlerrm <> 'PRODUCT_NOT_CONFIGURED' then raise; end if; end;
  select * into v_row from public.create_dodo_test_payment_intent(v_plan_intent, 'plan', 'one_heart', 'USD', '{}', null, 'live_mode');
  if v_row.product_id <> 'pdt_liveqaplan' or v_row.expected_amount_minor <> 799 then raise exception 'FAIL: live intent %', v_row; end if;

  -- Webhook (service role): wrong mode is a mismatch, right mode grants paid entitlements.
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'service_role')::text, true);
  begin
    perform public.fulfill_dodo_test_payment('evt_1', v_plan_intent, 'pay_plan', 'pdt_liveqaplan', 'USD', 799, 0, 'test_mode');
    raise exception 'FAIL: mode mismatch accepted';
  exception when raise_exception then if sqlerrm <> 'PAYMENT_DETAILS_MISMATCH' then raise; end if; end;
  v_result := public.fulfill_dodo_test_payment('evt_1', v_plan_intent, 'pay_plan', 'pdt_liveqaplan', 'USD', 799, 0, 'live_mode');
  if v_result ->> 'status' <> 'fulfilled' then raise exception 'FAIL: fulfil %', v_result; end if;
  if (select source from public.one_time_plans where owner_id = f.buyer_id) <> 'paid' then raise exception 'FAIL: plan source'; end if;
  if not exists (select 1 from public.jar_credits where user_id = f.buyer_id and source = 'paid' and granted_count = 10) then raise exception 'FAIL: paid credits'; end if;

  -- Extra Jar bought and fully refunded while unused.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.buyer_id, 'role', 'authenticated')::text, true);
  perform public.create_dodo_test_payment_intent(v_extra_intent, 'extra_jar', null, 'USD', '{}', null, 'live_mode');
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'service_role')::text, true);
  perform public.fulfill_dodo_test_payment('evt_2', v_extra_intent, 'pay_extra', 'pdt_liveqaextra', 'USD', 199, 0, 'live_mode');
  v_result := public.revoke_dodo_payment('evt_3', 'refund.succeeded', 'pay_extra', 'live_mode', false);
  if v_result ->> 'status' <> 'refunded' then raise exception 'FAIL: extra refund %', v_result; end if;
  if (select refunded_at from public.extra_jar_credits where provider_order_id = 'pay_extra') is null then raise exception 'FAIL: extra not marked'; end if;
  if (select status from public.dodo_test_payment_intents where id = v_extra_intent) <> 'refunded' then raise exception 'FAIL: extra intent status'; end if;
  if (public.revoke_dodo_payment('evt_3', 'refund.succeeded', 'pay_extra', 'live_mode', false) ->> 'status') <> 'duplicate' then raise exception 'FAIL: duplicate refund'; end if;

  -- Partial refund of the plan is left for review; a full one removes the unused plan and credits.
  v_result := public.revoke_dodo_payment('evt_4', 'refund.succeeded', 'pay_plan', 'live_mode', true);
  if v_result ->> 'status' <> 'needs_review' then raise exception 'FAIL: partial %', v_result; end if;
  update public.dodo_test_payment_intents set status = 'succeeded' where id = v_plan_intent;
  v_result := public.revoke_dodo_payment('evt_5', 'dispute.lost', 'pay_plan', 'live_mode', false);
  if v_result ->> 'status' <> 'refunded' then raise exception 'FAIL: plan refund %', v_result; end if;
  if exists (select 1 from public.one_time_plans where owner_id = f.buyer_id) then raise exception 'FAIL: plan still present'; end if;
  if exists (select 1 from public.jar_credits where user_id = f.buyer_id and source = 'paid') then raise exception 'FAIL: paid credits still present'; end if;
  if (public.revoke_dodo_payment('evt_6', 'refund.succeeded', 'pay_unknown', 'live_mode', false) ->> 'status') <> 'ignored' then raise exception 'FAIL: unknown payment'; end if;

  raise notice 'dodo_live_mode: all checks passed';
end $$;
rollback;
