-- First-party operational counts; no private content, tracking SDK, or combined-currency revenue.
create function public.admin_operational_analytics(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_start timestamptz;
  v_result jsonb;
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  if p_days not in (7, 30, 90) then raise exception 'INVALID_RANGE' using errcode = '22023'; end if;
  v_start := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - (p_days - 1) * interval '1 day';
  insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.analytics.read');
  select jsonb_build_object(
    'generated_at', now(),
    'days', p_days,
    'accounts_joined', (select count(*) from public.profiles where created_at >= v_start),
    'jars_created', (select count(*) from public.jars where created_at >= v_start and status <> 'deleted'),
    'jars_sealed', (select count(*) from public.jars where sealed_at >= v_start),
    'envelopes_opened', (select count(*) from public.recipient_envelope_state where opened_at >= v_start),
    'plan_members', (select count(*) from public.plan_members),
    'pending_invitations', (select count(*) from public.plan_invitations),
    'available_extra_credits', (select count(*) from public.extra_jar_credits where used_by_jar is null and refunded_at is null),
    'sandbox_payment_statuses', (
      select coalesce(jsonb_object_agg(status, count), '{}'::jsonb) from (
        select status, count(*) as count from public.dodo_test_payment_intents
        where created_at >= v_start group by status
      ) s
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', series.day::date,
        'accounts', (select count(*) from public.profiles p where p.created_at >= series.day and p.created_at < series.day + interval '1 day'),
        'created', (select count(*) from public.jars j where j.created_at >= series.day and j.created_at < series.day + interval '1 day' and j.status <> 'deleted'),
        'sealed', (select count(*) from public.jars j where j.sealed_at >= series.day and j.sealed_at < series.day + interval '1 day'),
        'opens', (select count(*) from public.recipient_envelope_state s where s.opened_at >= series.day and s.opened_at < series.day + interval '1 day')
      ) order by series.day), '[]'::jsonb)
      from generate_series(v_start, v_start + (p_days - 1) * interval '1 day', interval '1 day') as series(day)
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_operational_analytics(integer) from public, anon;
grant execute on function public.admin_operational_analytics(integer) to authenticated;
