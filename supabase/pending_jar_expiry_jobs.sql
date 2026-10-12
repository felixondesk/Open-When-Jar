-- NOT DEPLOYED: automatic approval review rejected scheduled permanent deletion.
-- Requires explicit approval and a verified recovery path; rebase this draft
-- against any reminder migration before use. Keep outside migrations.
-- Service-only lifecycle jobs. Public metadata remains for the recipient shelf;
-- letter content, cover notes, and attachment rows are removed at expiry.

create table private.jar_expiry_reminders (
  id uuid primary key default gen_random_uuid(),
  jar_id uuid not null references public.jars(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  due_at timestamptz not null,
  first_attempt_at timestamptz,
  claimed_until timestamptz,
  attempt_count integer not null default 0,
  sent_at timestamptz,
  provider_message_id text,
  unique (jar_id, recipient_id)
);
create index jar_expiry_reminders_due_idx on private.jar_expiry_reminders(due_at)
  where sent_at is null;
revoke all on private.jar_expiry_reminders from public, anon, authenticated;

create table private.expired_media_cleanup (
  storage_path text primary key,
  jar_id uuid not null,
  queued_at timestamptz not null default now(),
  claimed_until timestamptz,
  attempt_count integer not null default 0
);
revoke all on private.expired_media_cleanup from public, anon, authenticated;

create function public.claim_jar_expiry_reminders(p_limit integer default 25)
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
  on conflict (jar_id, recipient_id) do nothing;

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

create function public.finish_jar_expiry_reminder(p_id uuid, p_provider_message_id text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.jar_expiry_reminders
  set sent_at = case when nullif(btrim(p_provider_message_id), '') is not null then now() else sent_at end,
      provider_message_id = coalesce(nullif(btrim(p_provider_message_id), ''), provider_message_id),
      claimed_until = null
  where id = p_id and sent_at is null;
end;
$$;

create function public.expire_jars_batch(p_limit integer default 50)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_jar record;
  v_count integer := 0;
begin
  if p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  for v_jar in
    select id from public.jars
    where status = 'sealed' and hosting_ends_at <= now()
    order by hosting_ends_at, id limit p_limit for update skip locked
  loop
    insert into private.expired_media_cleanup(storage_path, jar_id)
    select a.storage_path, v_jar.id from public.attachments a
    join public.envelope_headers h on h.id = a.envelope_id
    where h.jar_id = v_jar.id
    on conflict (storage_path) do nothing;
    delete from public.envelope_headers where jar_id = v_jar.id;
    update public.jars set status = 'hosting_ended', cover_note = '' where id = v_jar.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.claim_expired_media_cleanup(p_limit integer default 100)
returns table(storage_path text)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  return query
  with due as (
    select cleanup.storage_path from private.expired_media_cleanup cleanup
    where cleanup.claimed_until is null or cleanup.claimed_until < now()
    order by cleanup.queued_at, cleanup.storage_path limit p_limit for update skip locked
  )
  update private.expired_media_cleanup cleanup
  set claimed_until = now() + interval '5 minutes', attempt_count = cleanup.attempt_count + 1
  from due where cleanup.storage_path = due.storage_path
  returning cleanup.storage_path;
end;
$$;

create function public.finish_expired_media_cleanup(p_storage_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from private.expired_media_cleanup where storage_path = p_storage_path;
end;
$$;

revoke all on function public.claim_jar_expiry_reminders(integer) from public, anon, authenticated;
revoke all on function public.finish_jar_expiry_reminder(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_jars_batch(integer) from public, anon, authenticated;
revoke all on function public.claim_expired_media_cleanup(integer) from public, anon, authenticated;
revoke all on function public.finish_expired_media_cleanup(text) from public, anon, authenticated;
grant execute on function public.claim_jar_expiry_reminders(integer) to service_role;
grant execute on function public.finish_jar_expiry_reminder(uuid, text) to service_role;
grant execute on function public.expire_jars_batch(integer) to service_role;
grant execute on function public.claim_expired_media_cleanup(integer) to service_role;
grant execute on function public.finish_expired_media_cleanup(text) to service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('open-when-jar-expiry', '*/10 * * * *',
  'select public.expire_jars_batch(50)');
