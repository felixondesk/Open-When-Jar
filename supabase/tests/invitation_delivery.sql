-- Run against a development database with at least one plan. Everything rolls back.
begin;
do $$
declare
  v_owner uuid;
  v_group uuid;
  v_email text := 'security-audit@example.invalid';
begin
  select owner_id, id into v_owner, v_group from public.one_time_plans limit 1;
  if v_owner is null then raise exception 'A plan fixture is required'; end if;
  insert into public.plan_invitations(group_id,email) values(v_group,v_email::extensions.citext);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
  delete from private.invitation_delivery_limits where user_id=v_owner;
  if not public.claim_invitation_delivery(v_email) then raise exception 'First delivery rejected'; end if;
  if public.claim_invitation_delivery(v_email) then raise exception 'Cooldown bypass'; end if;
  update private.invitation_delivery_limits set last_attempt_at=clock_timestamp()-interval '2 minutes', attempts=10 where user_id=v_owner;
  if public.claim_invitation_delivery(v_email) then raise exception 'Hourly budget bypass'; end if;
  update private.invitation_delivery_limits set window_started_at=clock_timestamp()-interval '2 hours' where user_id=v_owner;
  if not public.claim_invitation_delivery(v_email) then raise exception 'Window did not reset'; end if;
  begin
    perform public.claim_invitation_delivery('not-an-invitation@example.invalid');
    raise exception 'Ownership bypass';
  exception when raise_exception then
    if sqlerrm <> 'INVITATION_NOT_FOUND' then raise; end if;
  end;
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.claim_invitation_delivery(v_email);
    raise exception 'Anonymous bypass';
  exception when raise_exception then
    if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;
  if has_function_privilege('anon','public.claim_invitation_delivery(text)','execute') then
    raise exception 'Anonymous execute grant';
  end if;
end;
$$;
rollback;
