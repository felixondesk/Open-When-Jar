-- Limit request flooding and let MFA-backed administrators review case history.
create or replace function public.submit_support_request(p_category text, p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request uuid;
  v_details text := btrim(coalesce(p_details, ''));
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_category not in ('support', 'access', 'correction', 'export', 'deletion', 'refund', 'abuse', 'privacy')
    or char_length(v_details) not between 10 and 2000 then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text, 0));
  if (select count(*) from public.support_requests
      where requester_id = v_actor and created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'REQUEST_LIMIT_REACHED' using errcode = '22023';
  end if;
  insert into public.support_requests(requester_id, category, details)
  values (v_actor, p_category, v_details) returning id into v_request;
  insert into private.support_request_events(request_id, actor_id, to_status)
  values (v_request, v_actor, 'new');
  return v_request;
end;
$$;

create function public.admin_support_request_history(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_result jsonb;
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.requests.history');
  select jsonb_build_object(
    'request', (select to_jsonb(item) from (
      select r.id, r.requester_id, p.username, r.category, r.details, r.status, r.created_at, r.updated_at, r.resolved_at
      from public.support_requests r join public.profiles p on p.id = r.requester_id
      where r.id = p_request_id
    ) item),
    'events', coalesce((select jsonb_agg(to_jsonb(event) order by event.occurred_at, event.id)
      from (select e.id, e.actor_id, e.from_status, e.to_status, e.note, e.occurred_at
        from private.support_request_events e where e.request_id = p_request_id
        order by e.occurred_at, e.id limit 100) event), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_support_request_history(uuid) from public, anon;
grant execute on function public.admin_support_request_history(uuid) to authenticated;
