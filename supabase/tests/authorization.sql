-- Synthetic accounts and all writes are rolled back. No emails or Storage API calls.
begin;
set local statement_timeout = '20s';
create temporary table security_fixture (actor uuid, recipient uuid, stranger uuid, recipient_name text, jar uuid, envelope uuid, stranger_name text);
insert into security_fixture values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null,null,null);
insert into auth.users(id,email,raw_user_meta_data)
select id, id::text || '@example.invalid',
  jsonb_build_object('username','audit_' || left(replace(id::text,'-',''),20),'display_name','Security fixture')
from security_fixture f cross join lateral (values(f.actor),(f.recipient),(f.stranger)) users(id);
update security_fixture f set recipient_name=p.username from public.profiles p where p.id=f.recipient;
update security_fixture f set stranger_name=p.username from public.profiles p where p.id=f.stranger;
insert into public.one_time_plans(owner_id,plan_code,seat_limit,source)
select actor,'one_heart',1,'test' from security_fixture;
insert into public.plan_members(group_id,user_id)
select p.id,f.actor from security_fixture f join public.one_time_plans p on p.owner_id=f.actor;
insert into public.circle_connections(requester_id,addressee_id,requester_username_snapshot,requester_display_name_snapshot,addressee_username_snapshot,addressee_display_name_snapshot,status,responded_at)
select f.actor,f.recipient,a.username,a.display_name,r.username,r.display_name,'accepted',now()
from security_fixture f join public.profiles a on a.id=f.actor join public.profiles r on r.id=f.recipient;
grant select,update on security_fixture to authenticated;

-- Use the actual API role, not the privileged SQL executor, for every assertion.
set local role authenticated;
do $$
declare f record; v_id uuid; v_request uuid; v_call text;
begin
  select * into f from security_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.stranger,'role','authenticated','aal','aal2','user_metadata',jsonb_build_object('role','admin'))::text,true);
  begin
    perform public.send_circle_request(f.recipient_name);
    raise exception 'FAIL: unpaid Circle request accepted';
  exception when raise_exception then
    if sqlerrm <> 'PLAN_REQUIRED' then raise; end if;
  end;
  for i in 1..2 loop
    if i=2 then
      perform set_config('request.jwt.claims',jsonb_build_object('sub',f.stranger,'role','authenticated','aal','aal1','app_metadata',jsonb_build_object('role','admin'))::text,true);
    end if;
    foreach v_call in array array[
      'select public.admin_dashboard_snapshot()',
      'select public.admin_browse_records(''people'',null,null,0)',
      'select public.admin_list_support_requests(null,0,null)',
      'select public.admin_operational_analytics(7)',
      'select public.admin_support_request_history(null)',
      'select public.admin_update_support_request(null,''resolved'',''Test'')'
    ] loop
      begin
        execute v_call;
        raise exception 'FAIL: admin role or MFA bypass: %',v_call;
      exception when insufficient_privilege then null;
      end;
    end loop;
  end loop;
  if public.cancel_plan_invitation('absent@example.invalid') then raise exception 'FAIL: stranger cancelled invitation'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.actor,'role','authenticated')::text,true);
  select id into v_request from public.send_circle_request(f.stranger_name);
  begin
    perform public.respond_circle_request(v_request,true);
    raise exception 'FAIL: sender accepted their own request';
  exception when raise_exception then
    if sqlerrm <> 'CIRCLE_REQUEST_NOT_FOUND' then raise; end if;
  end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.stranger,'role','authenticated')::text,true);
  perform public.respond_circle_request(v_request,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.actor,'role','authenticated')::text,true);
  for i in 1..3 loop
    v_id := public.create_jar_with_first_envelope(array[f.recipient_name],'one_heart','','petal','Test','Private fixture',now()+interval '1 day','UTC');
    if i=1 then update security_fixture set jar=v_id; end if;
  end loop;
  begin
    perform public.create_jar_with_first_envelope(array[f.recipient_name],'one_heart','','petal','Test','Fourth');
    raise exception 'FAIL: fourth draft accepted';
  exception when raise_exception then
    if sqlerrm <> 'You can have up to three active drafts' then raise; end if;
  end;
  select * into f from security_fixture;
  select id into v_id from public.envelope_headers where jar_id=f.jar;
  update security_fixture set envelope=v_id;
  insert into public.attachments(envelope_id,owner_id,kind,storage_path,mime_type,byte_size)
  values(v_id,f.actor,'image',f.actor::text || '/' || f.jar::text || '/' || v_id::text || '/fixture.webp','image/webp',100);
  if not exists(select 1 from public.envelope_contents where envelope_id=v_id) then raise exception 'FAIL: creator cannot read draft'; end if;
  perform public.seal_jar(f.jar);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.stranger,'role','authenticated')::text,true);
  if exists(select 1 from public.jars where id=f.jar) or exists(select 1 from public.envelope_contents where envelope_id=v_id) then
    raise exception 'FAIL: unrelated user can read jar';
  end if;
  begin
    perform public.seal_jar(f.jar);
    raise exception 'FAIL: stranger can seal jar';
  exception when raise_exception then if sqlerrm <> 'Jar not found' then raise; end if;
  end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.recipient,'role','authenticated')::text,true);
  if not exists(select 1 from public.jars where id=f.jar) then raise exception 'FAIL: recipient cannot see sealed jar'; end if;
  if exists(select 1 from public.envelope_contents where envelope_id=v_id) then raise exception 'FAIL: future letter exposed'; end if;
  if exists(select 1 from public.attachments where envelope_id=v_id) then raise exception 'FAIL: future media exposed'; end if;
  begin
    insert into public.recipient_envelope_state(recipient_id,envelope_id,favourite) values(f.recipient,v_id,true);
    raise exception 'FAIL: locked letter state accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
update public.envelope_headers set unlock_at=now()-interval '1 minute' where id=(select envelope from security_fixture);
set local role authenticated;
do $$
declare f record;
begin
  select * into f from security_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.recipient,'role','authenticated')::text,true);
  if not exists(select 1 from public.envelope_contents where envelope_id=f.envelope) then raise exception 'FAIL: unlocked letter unreadable'; end if;
  if not exists(select 1 from public.attachments where envelope_id=f.envelope) then raise exception 'FAIL: unlocked media unreadable'; end if;
  insert into public.recipient_envelope_state(recipient_id,envelope_id,favourite) values(f.recipient,f.envelope,true);
end;
$$;
reset role;
update public.jars set hosting_ends_at=now()-interval '1 minute' where id=(select jar from security_fixture);
set local role authenticated;
do $$
declare f record;
begin
  select * into f from security_fixture;
  if exists(select 1 from public.envelope_contents where envelope_id=f.envelope) then raise exception 'FAIL: expired letter exposed'; end if;
  if exists(select 1 from public.attachments where envelope_id=f.envelope) then raise exception 'FAIL: expired media exposed'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute')) then
    raise exception 'FAIL: anonymous privileged RPC access';
  end if;
  if has_function_privilege('authenticated','public.fulfill_dodo_test_payment(text,uuid,text,text,text,integer,integer)','execute')
    or has_function_privilege('authenticated','public.claim_jar_expiry_reminders(integer)','execute') then
    raise exception 'FAIL: service-only RPC exposed';
  end if;
end;
$$;
reset role;
select 'PASS: Circle plan gate, admin metadata rejection, draft quota, cross-user ownership, timed content, expiry and RPC grants' as result;
rollback;
