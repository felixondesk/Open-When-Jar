-- Exercise real authenticated-role ownership and MFA checks. All fixture writes roll back.
begin;
set local statement_timeout = '20s';
create temporary table support_fixture (customer uuid, stranger uuid, admin uuid, request uuid);
insert into support_fixture values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), null);
insert into auth.users(id, email, raw_user_meta_data)
select id, id::text || '@example.invalid', jsonb_build_object('username', 'support_' || left(replace(id::text, '-', ''), 18), 'display_name', 'Support QA fixture')
from support_fixture f cross join lateral (values (f.customer), (f.stranger), (f.admin)) users(id);
grant select, update on support_fixture to authenticated;
set local role authenticated;
do $$
declare f record; result jsonb; call text;
begin
  select * into f from support_fixture;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.customer, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  update support_fixture set request = public.submit_support_request('support', 'Synthetic support conversation test.');
  select * into f from support_fixture;
  result := public.support_request_conversation(f.request);
  if result -> 'request' ->> 'status' <> 'new' or jsonb_array_length(result -> 'messages') <> 0 then raise exception 'FAIL: initial conversation'; end if;
  begin
    perform public.reply_to_support_request(f.request, '   ');
    raise exception 'FAIL: empty reply accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.reply_to_support_request(f.request, repeat('x', 2001));
    raise exception 'FAIL: oversized reply accepted';
  exception when invalid_parameter_value then null; end;
  -- Neither a stranger nor forged user metadata can read/reply/update.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.stranger, 'role', 'authenticated', 'aal', 'aal2', 'user_metadata', jsonb_build_object('role', 'admin'))::text, true);
  foreach call in array array[
    format('select public.support_request_conversation(%L)', f.request),
    format('select public.reply_to_support_request(%L, ''Stranger reply'')', f.request),
    format('select public.admin_update_support_request_with_message(%L, ''waiting_on_user'', ''Internal'', ''Public'')', f.request)
  ] loop
    begin execute call; raise exception 'FAIL: cross-user access: %', call;
    exception when insufficient_privilege then null; end;
  end loop;
  if exists(select 1 from public.support_requests where id = f.request) then raise exception 'FAIL: cross-user list access'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.admin, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
  begin
    perform public.admin_update_support_request_with_message(f.request, 'waiting_on_user', 'Internal', 'Public');
    raise exception 'FAIL: admin MFA bypass';
  exception when insufficient_privilege then null; end;
  begin
    perform public.support_request_conversation(f.request);
    raise exception 'FAIL: conversation MFA bypass';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.admin, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
  begin
    perform public.admin_update_support_request_with_message(f.request, 'waiting_on_user', 'Secret internal note', '');
    raise exception 'FAIL: waiting without customer message';
  exception when invalid_parameter_value then null; end;
  perform public.admin_update_support_request_with_message(f.request, 'waiting_on_user', 'Secret internal note', 'Which screen needs help?');
  result := public.support_request_conversation(f.request);
  if result -> 'request' ->> 'status' <> 'waiting_on_user' or jsonb_array_length(result -> 'messages') <> 1 then raise exception 'FAIL: admin update'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.customer, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  result := public.support_request_conversation(f.request);
  if result::text like '%Secret internal note%' then raise exception 'FAIL: private note leaked'; end if;
  if result -> 'messages' -> 0 ->> 'body' <> 'Which screen needs help?' then raise exception 'FAIL: customer message missing'; end if;
  perform public.reply_to_support_request(f.request, 'The Account screen.');
  result := public.support_request_conversation(f.request);
  if result -> 'request' ->> 'status' <> 'in_progress' or jsonb_array_length(result -> 'messages') <> 2 then raise exception 'FAIL: reply status or conversation'; end if;
  for i in 1..19 loop perform public.reply_to_support_request(f.request, 'Reply quota fixture.'); end loop;
  begin
    perform public.reply_to_support_request(f.request, 'Reply over quota.');
    raise exception 'FAIL: reply quota bypass';
  exception when invalid_parameter_value then
    if sqlerrm <> 'REPLY_LIMIT_REACHED' then raise; end if;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.admin, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
  perform public.admin_update_support_request_with_message(f.request, 'resolved', 'Completed synthetic QA.', 'All done.');
  result := public.admin_support_request_history(f.request);
  if result::text not like '%Customer replied.%' then raise exception 'FAIL: reply not audited'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', f.customer, 'role', 'authenticated')::text, true);
  begin
    perform public.reply_to_support_request(f.request, 'Closed reply.');
    raise exception 'FAIL: reply to closed request';
  exception when invalid_parameter_value then
    if sqlerrm <> 'REQUEST_CLOSED' then raise; end if;
  end;
end;
$$;
reset role;
do $$
begin
  if has_function_privilege('anon', 'public.support_request_conversation(uuid)', 'execute')
    or has_function_privilege('anon', 'public.reply_to_support_request(uuid,text)', 'execute')
    or has_function_privilege('anon', 'public.admin_update_support_request_with_message(uuid,text,text,text)', 'execute')
    or has_table_privilege('authenticated', 'private.support_request_messages', 'select') then
    raise exception 'FAIL: privileged direct access';
  end if;
end;
$$;
select 'PASS: conversation ownership, private note isolation, MFA, message validation, reply lifecycle, quotas and closed requests' as result;
rollback;
