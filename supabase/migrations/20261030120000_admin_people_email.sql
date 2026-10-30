-- People records now include the account email (Felix approved 2026-10-30); still no letter content or media.
create or replace function public.admin_browse_records(
  p_kind text, p_status text default null, p_query text default null, p_offset integer default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_total bigint;
  v_rows jsonb;
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('jars', 'orders', 'people', 'plans', 'payments') or p_offset is null or p_offset < 0 or p_offset > 100000
    or char_length(v_query) > 80 then
    raise exception 'INVALID_QUERY' using errcode = '22023';
  end if;
  if (p_kind = 'jars' and p_status is not null and p_status not in ('draft', 'sealed', 'hosting_ended', 'ending_soon'))
    or (p_kind = 'orders' and p_status is not null and p_status not in ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded'))
    or (p_kind in ('people', 'plans') and p_status is not null)
    or (p_kind = 'payments' and p_status is not null and p_status not in ('pending', 'succeeded', 'failed', 'needs_review')) then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  insert into private.admin_audit_log(actor_id, action) values (v_actor, 'admin.records.browse');

  if p_kind = 'jars' then
    select count(*) into v_total from public.jars j join public.profiles p on p.id = j.creator_id
    where j.status <> 'deleted'
      and (p_status is null or (p_status = 'ending_soon' and j.status = 'sealed' and j.hosting_ends_at > now() and j.hosting_ends_at <= now() + interval '7 days') or j.status::text = p_status)
      and (v_query = '' or position(v_query in lower(j.id::text)) > 0 or position(v_query in lower(p.username::text)) > 0);
    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc), '[]'::jsonb) into v_rows
    from (select j.id::text, p.username::text as creator_username, j.plan_code, j.status::text, j.created_at, j.sealed_at, j.hosting_ends_at,
      (select count(*) from public.jar_recipients r where r.jar_id = j.id) as recipient_count,
      (select count(*) from public.envelope_headers h where h.jar_id = j.id) as envelope_count
      from public.jars j join public.profiles p on p.id = j.creator_id
      where j.status <> 'deleted'
        and (p_status is null or (p_status = 'ending_soon' and j.status = 'sealed' and j.hosting_ends_at > now() and j.hosting_ends_at <= now() + interval '7 days') or j.status::text = p_status)
        and (v_query = '' or position(v_query in lower(j.id::text)) > 0 or position(v_query in lower(p.username::text)) > 0)
      order by j.created_at desc, j.id desc limit 25 offset p_offset) item;
  elsif p_kind = 'orders' then
    select count(*) into v_total from public.orders o join public.profiles p on p.id = o.user_id
    where (p_status is null or o.status::text = p_status)
      and (v_query = '' or position(v_query in lower(o.id::text)) > 0 or position(v_query in lower(p.username::text)) > 0);
    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc), '[]'::jsonb) into v_rows
    from (select o.id::text, p.username::text, o.plan_code, o.status::text, o.amount_cents, o.currency, o.created_at
      from public.orders o join public.profiles p on p.id = o.user_id
      where (p_status is null or o.status::text = p_status)
        and (v_query = '' or position(v_query in lower(o.id::text)) > 0 or position(v_query in lower(p.username::text)) > 0)
      order by o.created_at desc, o.id desc limit 25 offset p_offset) item;
  elsif p_kind = 'payments' then
    select count(*) into v_total from public.dodo_test_payment_intents i join public.profiles p on p.id=i.owner_id
    where (p_status is null or i.status=p_status) and (v_query='' or position(v_query in lower(i.id::text || ' ' || p.username::text || ' ' || coalesce(i.payment_id,''))) > 0);
    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc),'[]'::jsonb) into v_rows
    from (select i.id, p.username::text, i.purchase_type, i.plan_code, i.status, i.currency,
      i.expected_amount_minor, i.paid_amount_minor, i.tax_minor, i.payment_id, i.created_at, i.completed_at
      from public.dodo_test_payment_intents i join public.profiles p on p.id=i.owner_id
      where (p_status is null or i.status=p_status) and (v_query='' or position(v_query in lower(i.id::text || ' ' || p.username::text || ' ' || coalesce(i.payment_id,''))) > 0)
      order by i.created_at desc, i.id desc limit 25 offset p_offset) item;
  elsif p_kind = 'plans' then
    select count(*) into v_total from public.one_time_plans plan join public.profiles owner on owner.id=plan.owner_id
    where v_query='' or position(v_query in lower(plan.id::text || ' ' || owner.username::text)) > 0
      or exists(select 1 from public.plan_members m join public.profiles p on p.id=m.user_id where m.group_id=plan.id and position(v_query in lower(p.username::text))>0);
    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc),'[]'::jsonb) into v_rows
    from (select plan.id, plan.plan_code, owner.username::text as owner_username, plan.source, plan.seat_limit, plan.created_at,
      (select count(*) from public.plan_members m where m.group_id=plan.id) as joined_count,
      (select count(*) from public.plan_members m where m.group_id=plan.id and m.user_id<>plan.owner_id) as additional_members,
      (select count(*) from public.plan_invitations i where i.group_id=plan.id) as pending_invitations,
      (select string_agg('@' || p.username::text, ', ' order by m.joined_at, m.user_id) from public.plan_members m join public.profiles p on p.id=m.user_id where m.group_id=plan.id) as member_names
      from public.one_time_plans plan join public.profiles owner on owner.id=plan.owner_id
      where v_query='' or position(v_query in lower(plan.id::text || ' ' || owner.username::text)) > 0
        or exists(select 1 from public.plan_members m join public.profiles p on p.id=m.user_id where m.group_id=plan.id and position(v_query in lower(p.username::text))>0)
      order by plan.created_at desc, plan.id desc limit 25 offset p_offset) item;
  else
    select count(*) into v_total from public.profiles p left join auth.users u on u.id = p.id
    where v_query = '' or position(v_query in lower(p.id::text)) > 0 or position(v_query in lower(p.username::text)) > 0 or position(v_query in lower(p.display_name)) > 0
      or position(v_query in lower(coalesce(u.email, ''))) > 0;
    select coalesce(jsonb_agg(to_jsonb(item) order by item.created_at desc, item.id desc), '[]'::jsonb) into v_rows
    from (select p.id::text, p.username::text, p.display_name, u.email::text as email, p.created_at,
      plan.plan_code, plan.source, plan.seat_limit, owner.username::text as owner_username,
      (select count(*) from public.plan_members members where members.group_id=plan.id) as joined_count,
      (select count(*) from public.plan_invitations i where i.group_id=plan.id) as pending_invitations,
      (select count(*) from public.jars j where j.creator_id = p.id and j.status <> 'deleted') as jars_created,
      (select count(*) from public.jar_recipients r where r.recipient_id = p.id) as jars_received
      from public.profiles p
      left join auth.users u on u.id = p.id
      left join public.plan_members membership on membership.user_id=p.id
      left join public.one_time_plans plan on plan.id=membership.group_id
      left join public.profiles owner on owner.id=plan.owner_id
      where v_query = '' or position(v_query in lower(p.id::text)) > 0 or position(v_query in lower(p.username::text)) > 0 or position(v_query in lower(p.display_name)) > 0
        or position(v_query in lower(coalesce(u.email, ''))) > 0
      order by p.created_at desc, p.id desc limit 25 offset p_offset) item;
  end if;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;
revoke all on function public.admin_browse_records(text, text, text, integer) from public, anon;
grant execute on function public.admin_browse_records(text, text, text, integer) to authenticated;
