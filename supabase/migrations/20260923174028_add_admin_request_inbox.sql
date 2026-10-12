-- Authenticated customer requests and an audited, MFA-gated admin inbox.
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('support', 'access', 'correction', 'export', 'deletion', 'refund', 'abuse', 'privacy')),
  details text not null check (char_length(btrim(details)) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'triaged', 'waiting_on_user', 'in_progress', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index support_requests_requester_created_idx on public.support_requests(requester_id, created_at desc);
create index support_requests_status_created_idx on public.support_requests(status, created_at desc);
create trigger support_requests_set_updated_at before update on public.support_requests
for each row execute function private.set_updated_at();
alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;
grant select on public.support_requests to authenticated;
create policy "Customers read their own requests" on public.support_requests
for select to authenticated using ((select auth.uid()) = requester_id);

create table private.support_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.support_requests(id) on delete cascade,
  actor_id uuid not null,
  from_status text,
  to_status text not null,
  note text check (note is null or char_length(note) between 1 and 1000),
  occurred_at timestamptz not null default now()
);
create index support_request_events_request_idx on private.support_request_events(request_id, occurred_at desc);
revoke all on private.support_request_events from public, anon, authenticated;

create function public.submit_support_request(p_category text, p_details text)
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
  insert into public.support_requests(requester_id, category, details)
  values (v_actor, p_category, v_details) returning id into v_request;
  insert into private.support_request_events(request_id, actor_id, to_status)
  values (v_request, v_actor, 'new');
  return v_request;
end;
$$;

create function public.admin_list_support_requests(p_status text default null, p_offset integer default 0)
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
  if p_offset < 0 or p_offset > 100000 then raise exception 'INVALID_OFFSET' using errcode = '22023'; end if;
  insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.requests.list');
  select jsonb_build_object(
    'total', (select count(*) from public.support_requests r where p_status is null or r.status = p_status),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc)
      from (
        select r.id, r.requester_id, p.username, r.category, r.details, r.status, r.created_at, r.updated_at, r.resolved_at
        from public.support_requests r join public.profiles p on p.id = r.requester_id
        where p_status is null or r.status = p_status
        order by r.created_at desc, r.id desc limit 25 offset p_offset
      ) item
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create function public.admin_update_support_request(p_request_id uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_previous text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  if p_status not in ('triaged', 'waiting_on_user', 'in_progress', 'resolved', 'rejected')
    or v_note is null or char_length(v_note) > 1000 then
    raise exception 'INVALID_UPDATE' using errcode = '22023';
  end if;
  select status into v_previous from public.support_requests where id = p_request_id for update;
  if v_previous is null then raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_previous = p_status then raise exception 'STATUS_UNCHANGED' using errcode = '22023'; end if;
  update public.support_requests set status = p_status,
    resolved_at = case when p_status in ('resolved', 'rejected') then now() else null end
  where id = p_request_id;
  insert into private.support_request_events(request_id, actor_id, from_status, to_status, note)
  values (p_request_id, v_actor, v_previous, p_status, v_note);
  insert into private.admin_audit_log(actor_id, action)
  values (v_actor, 'admin.requests.update');
end;
$$;

revoke all on function public.submit_support_request(text, text) from public, anon;
revoke all on function public.admin_list_support_requests(text, integer) from public, anon;
revoke all on function public.admin_update_support_request(uuid, text, text) from public, anon;
grant execute on function public.submit_support_request(text, text) to authenticated;
grant execute on function public.admin_list_support_requests(text, integer) to authenticated;
grant execute on function public.admin_update_support_request(uuid, text, text) to authenticated;
