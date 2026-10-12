-- Return-column names in a RETURNS TABLE function are PL/pgSQL variables;
-- name the unique constraint explicitly to avoid an ambiguous jar_id.
create or replace function public.claim_jar_expiry_reminders(p_limit integer default 25)
returns table(id uuid, jar_id uuid, recipient_id uuid, email text, hosting_ends_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  insert into private.jar_expiry_reminders(jar_id, recipient_id, due_at)
  select j.id, r.recipient_id, j.hosting_ends_at - interval '7 days'
  from public.jars j join public.jar_recipients r on r.jar_id = j.id
  where j.status = 'sealed'
    and j.hosting_ends_at > now()
    and j.hosting_ends_at - interval '7 days' <= now()
  on conflict on constraint jar_expiry_reminders_jar_id_recipient_id_key do nothing;

  return query
  with due as (
    select reminder.id from private.jar_expiry_reminders reminder
    join public.jars jar on jar.id = reminder.jar_id
    where reminder.sent_at is null and reminder.due_at <= now()
      and (reminder.claimed_until is null or reminder.claimed_until < now())
      and (reminder.first_attempt_at is null or reminder.first_attempt_at > now() - interval '23 hours')
      and jar.status = 'sealed' and jar.hosting_ends_at > now()
    order by reminder.due_at, reminder.id limit p_limit for update of reminder skip locked
  ), claimed as (
    update private.jar_expiry_reminders reminder
    set claimed_until = now() + interval '5 minutes',
      first_attempt_at = coalesce(reminder.first_attempt_at, now()),
      attempt_count = reminder.attempt_count + 1
    from due where reminder.id = due.id
    returning reminder.id, reminder.jar_id, reminder.recipient_id
  )
  select claimed.id, claimed.jar_id, claimed.recipient_id, account.email::text, jar.hosting_ends_at
  from claimed join auth.users account on account.id = claimed.recipient_id
    join public.jars jar on jar.id = claimed.jar_id;
end;
$$;

revoke all on function public.claim_jar_expiry_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_jar_expiry_reminders(integer) to service_role;
