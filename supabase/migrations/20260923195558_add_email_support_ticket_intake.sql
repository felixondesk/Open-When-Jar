-- Allow verified inbound support email to open a support-only case.
alter table public.support_requests
  alter column requester_id drop not null,
  add column source text not null default 'app'
    check (source in ('app', 'email'));

alter table public.support_requests
  drop constraint support_requests_details_check,
  add constraint support_requests_details_check
    check (char_length(btrim(details)) between 1 and 10000);

alter table private.support_request_events
  alter column actor_id drop not null;

create table private.support_request_contacts (
  request_id uuid primary key references public.support_requests(id) on delete cascade,
  sender_email text not null
    check (char_length(sender_email) between 3 and 254
      and sender_email ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'),
  subject text check (subject is null or char_length(subject) <= 300),
  source_reference text not null
    check (char_length(source_reference) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint support_request_contacts_reference_key unique (source_reference)
);
create index support_request_contacts_sender_created_idx
  on private.support_request_contacts (lower(sender_email), created_at desc);
alter table private.support_request_contacts enable row level security;
revoke all on private.support_request_contacts from public, anon, authenticated;

create function public.ingest_support_email(
  p_source_reference text,
  p_sender_email text,
  p_subject text,
  p_details text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reference text := pg_catalog.btrim(coalesce(p_source_reference, ''));
  v_email text := pg_catalog.btrim(coalesce(p_sender_email, ''));
  v_subject text := nullif(pg_catalog.btrim(coalesce(p_subject, '')), '');
  v_details text := pg_catalog.btrim(coalesce(p_details, ''));
  v_request uuid;
  v_sender_request_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_reference) not between 1 and 500
    or pg_catalog.char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'
    or (v_subject is not null and pg_catalog.char_length(v_subject) > 300)
    or pg_catalog.char_length(v_details) not between 1 and 10000 then
    raise exception 'INVALID_SUPPORT_EMAIL' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('support-email-reference:' || v_reference, 0)
  );
  select request_id into v_request
  from private.support_request_contacts
  where source_reference = v_reference;
  if found then
    return pg_catalog.jsonb_build_object('request_id', v_request, 'duplicate', true);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('support-email-sender:' || pg_catalog.lower(v_email), 0)
  );
  select pg_catalog.count(*) into v_sender_request_count
  from private.support_request_contacts
  where pg_catalog.lower(sender_email) = pg_catalog.lower(v_email)
    and created_at >= pg_catalog.now() - interval '24 hours';
  if v_sender_request_count >= 5 then
    raise exception 'EMAIL_REQUEST_LIMIT_REACHED' using errcode = '22023';
  end if;

  insert into public.support_requests(requester_id, category, details, source)
  values (null, 'support', v_details, 'email')
  returning id into v_request;
  insert into private.support_request_contacts(request_id, sender_email, subject, source_reference)
  values (v_request, v_email, v_subject, v_reference);
  insert into private.support_request_events(request_id, actor_id, to_status)
  values (v_request, null, 'new');

  return pg_catalog.jsonb_build_object('request_id', v_request, 'duplicate', false);
end;
$$;
revoke all on function public.ingest_support_email(text, text, text, text) from public, anon, authenticated;
grant execute on function public.ingest_support_email(text, text, text, text) to service_role;

create or replace function public.admin_list_support_requests(p_status text, p_offset integer, p_category text)
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
        select r.id, r.requester_id, p.username, r.category, r.details, r.status, r.source, r.created_at,
          c.sender_email as contact_email, c.subject, c.source_reference
        from public.support_requests r
        left join public.profiles p on p.id = r.requester_id
        left join private.support_request_contacts c on c.request_id = r.id
        where (p_status is null or r.status = p_status) and (p_category is null or r.category = p_category)
        order by r.created_at desc, r.id desc limit 25 offset p_offset
      ) item
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_support_request_history(p_request_id uuid)
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
      select r.id, r.requester_id, p.username, r.category, r.details, r.status, r.source, r.created_at,
        c.sender_email as contact_email, c.subject, c.source_reference
      from public.support_requests r
      left join public.profiles p on p.id = r.requester_id
      left join private.support_request_contacts c on c.request_id = r.id
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
