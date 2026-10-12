create function public.admin_list_support_requests(p_status text, p_offset integer, p_category text)
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
  if p_status is not null and p_status not in ('new', 'triaged', 'waiting_on_user', 'in_progress', 'resolved', 'rejected') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  if p_category is not null and p_category not in ('support', 'access', 'correction', 'export', 'deletion', 'refund', 'abuse', 'privacy') then
    raise exception 'INVALID_CATEGORY' using errcode = '22023';
  end if;
  if p_offset < 0 or p_offset > 100000 then raise exception 'INVALID_OFFSET' using errcode = '22023'; end if;
  insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.requests.list');
  select jsonb_build_object(
    'total', (select count(*) from public.support_requests r
      where (p_status is null or r.status = p_status) and (p_category is null or r.category = p_category)),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc)
      from (
        select r.id, r.requester_id, p.username, r.category, r.details, r.status, r.created_at, r.updated_at, r.resolved_at
        from public.support_requests r join public.profiles p on p.id = r.requester_id
        where (p_status is null or r.status = p_status) and (p_category is null or r.category = p_category)
        order by r.created_at desc, r.id desc limit 25 offset p_offset
      ) item
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_list_support_requests(text, integer, text) from public, anon;
grant execute on function public.admin_list_support_requests(text, integer, text) to authenticated;
