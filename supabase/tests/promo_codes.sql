-- Run after the migration. All fixtures and audit writes are rolled back.
begin;
set local statement_timeout = '20s';
create temporary table promo_fixture(admin_id uuid, buyer_id uuid, other_id uuid, third_id uuid);
insert into promo_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text || '@example.invalid',jsonb_build_object('username','promoqa_' || left(replace(id::text,'-',''),20),'display_name','Promo QA')
from promo_fixture f cross join lateral (values(f.admin_id),(f.buyer_id),(f.other_id),(f.third_id)) users(id);
grant select on promo_fixture to authenticated;
set local role authenticated;
do $$
declare f record; v_id uuid; v_row record; v_list jsonb;
begin
  select * into f from promo_fixture;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.admin_id,'aal','aal1','app_metadata',jsonb_build_object('role','admin'))::text,true);
  begin
    perform public.admin_upsert_promo_code(null,'QA','QA20',20,current_date + 7,'active',2);
    raise exception 'FAIL: MFA bypass';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.admin_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'))::text,true);
  v_id := public.admin_upsert_promo_code(null,'QA launch',' qa20 ',15,current_date + 7,'active',2);
  perform public.admin_upsert_promo_code(null,'Expired','QAOLD',10,current_date - 1,'active',5);
  begin
    perform public.admin_upsert_promo_code(null,'Dup','QA20',10,current_date,'active',5);
    raise exception 'FAIL: duplicate code';
  exception when unique_violation then null; end;

  -- 799 * 0.85 = 679.15 -> 679
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.buyer_id,'role','authenticated')::text,true);
  if public.check_promo_code('qa20') <> 15 then raise exception 'FAIL: check percent'; end if;
  select * into v_row from public.create_dodo_test_payment_intent(gen_random_uuid(),'plan','one_heart','USD','{}','qa20');
  if v_row.expected_amount_minor <> 679 or v_row.list_amount_minor <> 799 or v_row.percent_off <> 15 then
    raise exception 'FAIL: discounted amount %', v_row.expected_amount_minor;
  end if;
  begin
    perform public.check_promo_code('QA20');
    raise exception 'FAIL: second use by same user';
  exception when raise_exception then
    if sqlerrm <> 'PROMO_ALREADY_USED' then raise; end if;
  end;
  begin
    perform public.check_promo_code('QAOLD');
    raise exception 'FAIL: expired code';
  exception when raise_exception then
    if sqlerrm <> 'PROMO_INVALID' then raise; end if;
  end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.other_id,'role','authenticated')::text,true);
  perform public.create_dodo_test_payment_intent(gen_random_uuid(),'plan','one_heart','INR','{}','QA20');

  -- Two pending reservations fill a cap of 2.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.third_id,'role','authenticated')::text,true);
  begin
    perform public.check_promo_code('QA20');
    raise exception 'FAIL: cap exceeded';
  exception when raise_exception then
    if sqlerrm <> 'PROMO_USED_UP' then raise; end if;
  end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.admin_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'))::text,true);
  perform public.admin_upsert_promo_code(v_id,'QA launch','IGNORED',15,current_date + 7,'inactive',10);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.third_id,'role','authenticated')::text,true);
  begin
    perform public.check_promo_code('QA20');
    raise exception 'FAIL: inactive code';
  exception when raise_exception then
    if sqlerrm <> 'PROMO_INVALID' then raise; end if;
  end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.admin_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'))::text,true);
  v_list := public.admin_list_promo_codes();
  if not exists (select 1 from jsonb_array_elements(v_list) item where item->>'code' = 'QA20' and item->>'status' = 'inactive') then
    raise exception 'FAIL: admin list';
  end if;
end $$;
rollback;
