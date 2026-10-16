-- Run after the migration. All fixtures and audit writes are rolled back.
begin;
set local statement_timeout = '20s';
create temporary table admin_fixture(owner_id uuid, member_id uuid, unpaid_id uuid, plan_id uuid);
insert into admin_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text || '@example.invalid',jsonb_build_object('username','adminqa_' || left(replace(id::text,'-',''),20),'display_name','Admin QA')
from admin_fixture f cross join lateral (values(f.owner_id),(f.member_id),(f.unpaid_id)) users(id);
insert into public.one_time_plans(id,owner_id,plan_code,seat_limit,source)
select plan_id,owner_id,'close_circle',3,'test' from admin_fixture;
insert into public.plan_members(group_id,user_id)
select plan_id,id from admin_fixture f cross join lateral (values(f.owner_id),(f.member_id)) users(id);
insert into public.plan_invitations(group_id,email)
select plan_id,plan_id::text || '@example.invalid' from admin_fixture;
insert into public.dodo_test_payment_intents(id,owner_id,purchase_type,plan_code,product_id,currency,expected_amount_minor,status,paid_amount_minor,tax_minor,payment_id)
select gen_random_uuid(),owner_id,'plan','close_circle','fixture','INR',99900,'succeeded',100000,100,plan_id::text || n
from admin_fixture cross join generate_series(1,26) n;
grant select on admin_fixture to authenticated;
set local role authenticated;
do $$
declare f record; result jsonb; row jsonb; kind text;
begin
  select * into f from admin_fixture;
  -- Both an editable metadata role and an admin without MFA must be rejected.
  foreach kind in array array['people','plans','payments'] loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'aal','aal2','user_metadata',jsonb_build_object('role','admin'))::text,true);
    begin
      perform public.admin_browse_records(kind);
      raise exception 'FAIL: editable metadata accepted';
    exception when insufficient_privilege then null; end;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'aal','aal1','app_metadata',jsonb_build_object('role','admin'))::text,true);
    begin
      perform public.admin_browse_records(kind);
      raise exception 'FAIL: MFA bypass';
    exception when insufficient_privilege then null; end;
  end loop;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'))::text,true);
  result := public.admin_browse_records('plans',null,f.plan_id::text);
  row := result->'rows'->0;
  if result->>'total' <> '1' or row->>'joined_count' <> '2' or row->>'seat_limit' <> '3'
    or row->>'additional_members' <> '1' or row->>'pending_invitations' <> '1' then
    raise exception 'FAIL: shared plan counts: %', result;
  end if;
  result := public.admin_browse_records('people',null,f.member_id::text);
  row := result->'rows'->0;
  if row->>'plan_code' <> 'close_circle' or row->>'joined_count' <> '2' or row->>'owner_username' is null then
    raise exception 'FAIL: member plan missing';
  end if;
  result := public.admin_browse_records('people',null,f.unpaid_id::text);
  if result->>'total' <> '1' or result->'rows'->0->>'plan_code' is not null then raise exception 'FAIL: unpaid account'; end if;
  result := public.admin_browse_records('payments','succeeded',f.plan_id::text);
  if result->>'total' <> '26' or jsonb_array_length(result->'rows') <> 25
    or result->'rows'->0->>'paid_amount_minor' <> '100000' then raise exception 'FAIL: payment amounts/pagination'; end if;
  result := public.admin_browse_records('payments','succeeded',f.plan_id::text,25);
  if jsonb_array_length(result->'rows') <> 1 then raise exception 'FAIL: second page'; end if;
  result := public.admin_browse_records('payments','failed',f.plan_id::text);
  if result->>'total' <> '0' then raise exception 'FAIL: status filter'; end if;
  begin
    perform public.admin_browse_records('payments','refunded');
    raise exception 'FAIL: invalid status accepted';
  exception when invalid_parameter_value then null; end;
  -- Existing lists must still execute.
  perform public.admin_browse_records('jars');
  perform public.admin_browse_records('orders');
end;
$$;
rollback;
