-- Welcome, letter-unlocked, jar-opened and 7-day expiry reminder emails, plus the
-- hosting-expiry job. Everything goes through private.email_outbox like the other
-- transactional emails. Letter content, labels and media never enter a row.

-- A support reply that also moves a request to "waiting on you" runs in one
-- transaction; sharing the dedupe key per transaction sends one email, not two.
create or replace function private.enqueue_support_reply_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_requester uuid;
begin
  if new.sender <> 'support' then return null; end if;
  select request.requester_id into v_requester from public.support_requests request where request.id = new.request_id;
  if v_requester is not null then
    perform private.enqueue_user_email('support_reply', v_requester,
      jsonb_build_object('request_id', new.request_id), 'support_update:' || new.request_id || ':' || txid_current());
  end if;
  return null;
end;
$$;

create or replace function private.enqueue_support_status_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_requester uuid;
begin
  select request.requester_id into v_requester from public.support_requests request where request.id = new.request_id;
  if v_requester is not null then
    perform private.enqueue_user_email('support_status', v_requester,
      jsonb_build_object('request_id', new.request_id, 'status', new.to_status), 'support_update:' || new.request_id || ':' || txid_current());
  end if;
  return null;
end;
$$;

-- Welcome goes out once the address is confirmed (at insert for Google sign-ins),
-- so an unconfirmed signup cannot send it to someone else's inbox.
create or replace function private.enqueue_auth_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.enqueue_email('new_registration', 'hello@openwhenjar.bond',
      jsonb_build_object('email', new.email, 'registered_at', new.created_at), 'registration:' || new.id);
  elsif new.encrypted_password is distinct from old.encrypted_password then
    perform private.enqueue_email('password_changed', new.email::text, '{}'::jsonb, gen_random_uuid()::text);
  end if;
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    perform private.enqueue_email('email_changed', old.email::text, '{}'::jsonb, gen_random_uuid()::text);
  end if;
  if new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform private.enqueue_email('welcome', new.email::text, '{}'::jsonb, 'welcome:' || new.id);
  end if;
  return null;
end;
$$;

-- The first time a recipient opens a jar with readable letters, its creator hears.
create function private.enqueue_jar_opened_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_jar uuid;
  v_creator uuid;
  v_name text;
begin
  select header.jar_id, jar.creator_id into v_jar, v_creator
  from public.envelope_headers header join public.jars jar on jar.id = header.jar_id
  where header.id = new.envelope_id;
  select profile.display_name into v_name from public.profiles profile where profile.id = new.recipient_id;
  perform private.enqueue_user_email('jar_opened', v_creator,
    jsonb_build_object('recipient', coalesce(v_name, 'Someone'), 'jar_id', v_jar),
    'jar_opened:' || v_jar || ':' || new.recipient_id);
  return null;
end;
$$;

create trigger recipient_envelope_state_enqueue_email after insert on public.recipient_envelope_state
for each row when (new.opened_at is not null)
execute function private.enqueue_jar_opened_email();

-- Time-based emails have no row change to trigger on, so the scheduler sweeps them.
-- Dedupe keys make repeated sweeps free. Unlocks older than a day are skipped so a
-- missed run never floods old letters; unlocks before sealing are covered by jar_received.
create function private.enqueue_scheduled_emails()
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    select header.id as envelope_id, jar.id as jar_id, recipient.recipient_id,
      coalesce(profile.display_name, 'Someone') as creator
    from public.envelope_headers header
    join public.jars jar on jar.id = header.jar_id
    join public.jar_recipients recipient on recipient.jar_id = jar.id
    left join public.profiles profile on profile.id = jar.creator_id
    where jar.status = 'sealed' and header.unlock_at <= now()
      and header.unlock_at > now() - interval '1 day' and header.unlock_at > jar.sealed_at
  loop
    perform private.enqueue_user_email('envelope_unlocked', r.recipient_id,
      jsonb_build_object('creator', r.creator, 'jar_id', r.jar_id),
      'envelope_unlocked:' || r.envelope_id || ':' || r.recipient_id);
  end loop;

  for r in
    select jar.id as jar_id, recipient.recipient_id, jar.hosting_ends_at
    from public.jars jar join public.jar_recipients recipient on recipient.jar_id = jar.id
    where jar.status = 'sealed' and jar.hosting_ends_at > now()
      and jar.hosting_ends_at <= now() + interval '7 days'
  loop
    perform private.enqueue_user_email('jar_expiry_reminder', r.recipient_id,
      jsonb_build_object('jar_id', r.jar_id, 'hosting_ends_at', r.hosting_ends_at),
      'jar_expiry_7d:' || r.jar_id || ':' || r.recipient_id);
  end loop;
end;
$$;

-- Hosting expiry: letter content, cover notes and attachment rows are deleted for
-- good; the jar row stays for the shelf and its status change sends jar_hosting_ended.
-- shortcut: storage paths are queued but nothing deletes the objects yet; add a
-- cleanup worker before the first jar ends (earliest is 2029-09).
create table private.expired_media_cleanup (
  storage_path text primary key,
  jar_id uuid not null,
  queued_at timestamptz not null default now()
);
alter table private.expired_media_cleanup enable row level security;
revoke all on private.expired_media_cleanup from public, anon, authenticated;

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

revoke all on function private.enqueue_jar_opened_email() from public, anon, authenticated;
revoke all on function private.enqueue_scheduled_emails() from public, anon, authenticated;
revoke all on function public.expire_jars_batch(integer) from public, anon, authenticated;
grant execute on function public.expire_jars_batch(integer) to service_role;

select cron.schedule('scheduled-emails', '*/5 * * * *', 'select private.enqueue_scheduled_emails()');
select cron.schedule('expire-jars', '17 * * * *', 'select public.expire_jars_batch(50)');
