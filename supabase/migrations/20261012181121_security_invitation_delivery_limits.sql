-- Durable email budget shared by every application instance.
create table private.invitation_delivery_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_attempt_at timestamptz not null,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts between 1 and 10)
);
alter table private.invitation_delivery_limits enable row level security;
revoke all on private.invitation_delivery_limits from public, anon, authenticated;

create function public.claim_invitation_delivery(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_claimed uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  -- Only an existing invitation owned by the caller is eligible.
  if not exists (
    select 1 from public.plan_invitations i
    join public.one_time_plans p on p.id = i.group_id
    where p.owner_id = v_user and i.email = lower(btrim(p_email))::extensions.citext
  ) then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  insert into private.invitation_delivery_limits as budget
    (user_id, last_attempt_at, window_started_at, attempts)
  values (v_user, v_now, v_now, 1)
  on conflict (user_id) do update
  set last_attempt_at = v_now,
      window_started_at = case when budget.window_started_at <= v_now - interval '1 hour' then v_now else budget.window_started_at end,
      attempts = case when budget.window_started_at <= v_now - interval '1 hour' then 1 else budget.attempts + 1 end
  where budget.last_attempt_at <= v_now - interval '1 minute'
    and (budget.window_started_at <= v_now - interval '1 hour' or budget.attempts < 10)
  returning user_id into v_claimed;
  return v_claimed is not null;
end;
$$;
revoke all on function public.claim_invitation_delivery(text) from public, anon;
grant execute on function public.claim_invitation_delivery(text) to authenticated;
comment on function public.claim_invitation_delivery(text) is
  'Claims one email attempt for an owned invitation: one per minute and ten per hour across all recipients. Failures consume a slot.';
