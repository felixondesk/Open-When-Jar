-- Read-only operational dashboard for an MFA-authenticated administrator.
-- The snapshot intentionally excludes letter content, transcripts, media paths,
-- recipient emails, provider references, and invitation secrets.

create table private.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null,
  occurred_at timestamptz not null default now(),
  constraint admin_audit_log_action_length check (char_length(action) between 1 and 80)
);

create index admin_audit_log_actor_occurred_idx
  on private.admin_audit_log(actor_id, occurred_at desc);

revoke all on private.admin_audit_log from public, anon, authenticated;

create index profiles_created_at_idx on public.profiles(created_at desc);
create index jars_active_created_at_idx on public.jars(created_at desc) where status <> 'deleted';
create index jars_sealed_at_idx on public.jars(sealed_at desc) where sealed_at is not null;
create index jars_hosting_ends_at_idx on public.jars(hosting_ends_at) where status = 'sealed';
create index orders_status_updated_at_idx on public.orders(status, updated_at desc);

create function public.admin_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_snapshot jsonb;
begin
  if v_actor_id is null
    or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin access requires the signed admin role'
      using errcode = '42501';
  end if;

  insert into private.admin_audit_log(actor_id, action)
  values (v_actor_id, 'admin.dashboard.snapshot');

  select jsonb_build_object(
    'generated_at', now(),
    'summary', jsonb_build_object(
      'people', (select count(*) from public.profiles),
      'jars_created', (select count(*) from public.jars where status <> 'deleted'),
      'sealed_jars', (select count(*) from public.jars where status in ('sealed', 'hosting_ended')),
      'revenue_cents', (select coalesce(sum(amount_cents), 0) from public.orders where status = 'succeeded')
    ),
    'lifecycle', jsonb_build_object(
      'draft', (select count(*) from public.jars where status = 'draft'),
      'sealed', (select count(*) from public.jars where status = 'sealed'),
      'hosting_ended', (select count(*) from public.jars where status = 'hosting_ended')
    ),
    'attention', jsonb_build_object(
      'pending_payments', (select count(*) from public.orders where status in ('created', 'pending')),
      'failed_payments', (select count(*) from public.orders where status = 'failed' and updated_at >= now() - interval '30 days'),
      'hosting_ending_soon', (
        select count(*) from public.jars
        where status = 'sealed'
          and hosting_ends_at > now()
          and hosting_ends_at <= now() + interval '7 days'
      )
    ),
    'activity', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', activity.day,
        'jars_created', activity.jars_created,
        'jars_sealed', activity.jars_sealed,
        'people_joined', activity.people_joined,
        'revenue_cents', activity.revenue_cents
      ) order by activity.day), '[]'::jsonb)
      from (
        select
          series.day::date as day,
          (select count(*) from public.jars j where j.created_at >= series.day and j.created_at < series.day + interval '1 day' and j.status <> 'deleted') as jars_created,
          (select count(*) from public.jars j where j.sealed_at >= series.day and j.sealed_at < series.day + interval '1 day') as jars_sealed,
          (select count(*) from public.profiles p where p.created_at >= series.day and p.created_at < series.day + interval '1 day') as people_joined,
          (select coalesce(sum(o.amount_cents), 0) from public.orders o where o.status = 'succeeded' and o.updated_at >= series.day and o.updated_at < series.day + interval '1 day') as revenue_cents
        from generate_series(current_date - interval '89 days', current_date, interval '1 day') as series(day)
      ) activity
    ),
    'jars', (
      select coalesce(jsonb_agg(to_jsonb(recent_jar) order by recent_jar.created_at desc), '[]'::jsonb)
      from (
        select
          j.id::text as id,
          p.username::text as creator_username,
          j.plan_code,
          j.status::text as status,
          j.created_at,
          j.sealed_at,
          j.hosting_ends_at,
          (select count(*) from public.jar_recipients r where r.jar_id = j.id) as recipient_count,
          (select count(*) from public.envelope_headers h where h.jar_id = j.id) as envelope_count
        from public.jars j
        join public.profiles p on p.id = j.creator_id
        where j.status <> 'deleted'
        order by j.created_at desc
        limit 100
      ) recent_jar
    ),
    'orders', (
      select coalesce(jsonb_agg(to_jsonb(recent_order) order by recent_order.created_at desc), '[]'::jsonb)
      from (
        select
          o.id::text as id,
          p.username::text as username,
          o.plan_code,
          o.status::text as status,
          o.amount_cents,
          o.currency,
          o.created_at
        from public.orders o
        join public.profiles p on p.id = o.user_id
        order by o.created_at desc
        limit 100
      ) recent_order
    ),
    'people', (
      select coalesce(jsonb_agg(to_jsonb(recent_person) order by recent_person.created_at desc), '[]'::jsonb)
      from (
        select
          p.id::text as id,
          p.username::text as username,
          p.display_name,
          p.created_at,
          (select count(*) from public.jars j where j.creator_id = p.id and j.status <> 'deleted') as jars_created,
          (select count(*) from public.jar_recipients r where r.recipient_id = p.id) as jars_received
        from public.profiles p
        order by p.created_at desc
        limit 100
      ) recent_person
    )
  ) into v_snapshot;

  return v_snapshot;
end;
$$;

comment on function public.admin_dashboard_snapshot() is
  'Returns content-free operational metrics to email-verified accounts with the signed admin role and records the access.';

revoke all on function public.admin_dashboard_snapshot() from public, anon;
grant execute on function public.admin_dashboard_snapshot() to authenticated;
