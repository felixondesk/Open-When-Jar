-- Do not reveal draft membership to recipients before the creator seals the jar.

alter table public.jar_recipients add column revealed_at timestamptz;
update public.jar_recipients r
set revealed_at = j.sealed_at
from public.jars j
where j.id = r.jar_id and j.status in ('sealed', 'hosting_ended');

drop policy "Creators see all recipients and recipients see themselves" on public.jar_recipients;
create policy "Creators see all recipients and sealed recipients see themselves"
on public.jar_recipients for select to authenticated
using (
  creator_id = (select auth.uid())
  or (recipient_id = (select auth.uid()) and revealed_at is not null)
);

create or replace function public.seal_jar(p_jar_id uuid)
returns table (
  id uuid,
  status public.jar_status,
  entitlement_source public.credit_source,
  hosting_ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_jar public.jars%rowtype;
  v_credit public.jar_credits%rowtype;
  v_recipient_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_jar from public.jars where jars.id = p_jar_id for update;
  if not found or v_jar.creator_id <> v_user_id then raise exception 'Jar not found'; end if;
  if v_jar.status <> 'draft' then raise exception 'This jar is already sealed'; end if;
  if not exists (select 1 from public.envelope_headers where jar_id = p_jar_id) then raise exception 'Add an envelope before sealing'; end if;

  select count(*) into v_recipient_count from public.jar_recipients where jar_id = p_jar_id;
  if v_recipient_count < 1 or v_recipient_count > v_jar.recipient_limit then raise exception 'This jar has an invalid recipient count'; end if;

  select * into v_credit from public.jar_credits
  where user_id = v_user_id and plan_code = v_jar.plan_code
    and recipient_limit >= v_recipient_count and used_count < granted_count
  order by case when source = 'free' then 0 else 1 end, created_at
  for update skip locked limit 1;

  if not found then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'JAR_CREDIT_REQUIRED', 'planCode', v_jar.plan_code, 'amountCents', v_jar.amount_cents)::text,
      detail = json_build_object('status', 402)::text;
  end if;

  update public.jar_credits set used_count = used_count + 1 where jar_credits.id = v_credit.id;
  update public.jars
  set status = 'sealed', entitlement_source = v_credit.source,
      sealed_at = now(), hosting_ends_at = now() + interval '3 years'
  where jars.id = p_jar_id;
  update public.jar_recipients set revealed_at = now() where jar_id = p_jar_id;

  return query select j.id, j.status, j.entitlement_source, j.hosting_ends_at
  from public.jars j where j.id = p_jar_id;
end;
$$;
