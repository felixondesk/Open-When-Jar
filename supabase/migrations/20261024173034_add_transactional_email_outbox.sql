-- Transactional email outbox. Triggers enqueue rows in the same transaction as the
-- change, so an email exists only if the change committed. The send-emails Edge
-- Function drains rows through service-only RPCs. Letter content never enters a row.

create table private.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (char_length(kind) between 1 and 60),
  to_email text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  due_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  claimed_until timestamptz,
  attempt_count integer not null default 0,
  sent_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default now()
);
create index email_outbox_due_idx on private.email_outbox(due_at) where sent_at is null;
alter table private.email_outbox enable row level security;
revoke all on private.email_outbox from public, anon, authenticated;

-- Invalid or missing addresses are skipped here, never raised: a raise inside an
-- auth trigger would block signup or password changes.
create function private.enqueue_email(p_kind text, p_to text, p_payload jsonb, p_dedupe_key text)
returns void language sql security definer set search_path = '' as $$
  insert into private.email_outbox (kind, to_email, payload, dedupe_key)
  select p_kind, p_to, p_payload, p_dedupe_key
  where p_to ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'
  on conflict (dedupe_key) do nothing;
$$;

create function private.enqueue_user_email(p_kind text, p_user uuid, p_payload jsonb, p_dedupe_key text)
returns void language sql security definer set search_path = '' as $$
  select private.enqueue_email(p_kind, (select account.email::text from auth.users account where account.id = p_user), p_payload, p_dedupe_key);
$$;

-- 1 and 7: a Jar is sealed (recipients are told) or its hosting ends (everyone is told).
create function private.enqueue_jar_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_creator_name text;
  r record;
begin
  if new.status = 'sealed' then
    select profile.display_name into v_creator_name from public.profiles profile where profile.id = new.creator_id;
    for r in select recipient.recipient_id as user_id from public.jar_recipients recipient where recipient.jar_id = new.id loop
      perform private.enqueue_user_email('jar_received', r.user_id,
        jsonb_build_object('creator', coalesce(v_creator_name, 'Someone'), 'jar_id', new.id),
        'jar_received:' || new.id || ':' || r.user_id);
    end loop;
  elsif new.status = 'hosting_ended' then
    for r in
      select recipient.recipient_id as user_id from public.jar_recipients recipient where recipient.jar_id = new.id
      union select new.creator_id
    loop
      perform private.enqueue_user_email('jar_hosting_ended', r.user_id, jsonb_build_object('jar_id', new.id),
        'jar_ended:' || new.id || ':' || r.user_id);
    end loop;
  end if;
  return null;
end;
$$;

create trigger jars_enqueue_email after update of status on public.jars
for each row when (old.status is distinct from new.status)
execute function private.enqueue_jar_emails();

-- 4: a Circle request reaches the addressee; an acceptance reaches the requester.
-- Re-requests after a decline also notify, so their dedupe key is unique per event.
create function private.enqueue_circle_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform private.enqueue_user_email('circle_request', new.addressee_id,
      jsonb_build_object('requester', new.requester_display_name_snapshot), gen_random_uuid()::text);
  elsif new.status = 'accepted' and tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform private.enqueue_user_email('circle_accepted', new.requester_id,
      jsonb_build_object('addressee', new.addressee_display_name_snapshot), 'circle_accepted:' || new.id);
  end if;
  return null;
end;
$$;

create trigger circle_connections_enqueue_email after insert or update of status on public.circle_connections
for each row execute function private.enqueue_circle_emails();

-- 5 and 6: request receipts, replies from support, and status changes. Email-sourced
-- requests have no requester account, so they are answered from the support mailbox.
create function private.enqueue_support_request_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_user_email('support_received', new.requester_id,
    jsonb_build_object('request_id', new.id, 'category', new.category), 'support_received:' || new.id);
  return null;
end;
$$;

create trigger support_requests_enqueue_email after insert on public.support_requests
for each row when (new.requester_id is not null)
execute function private.enqueue_support_request_email();

create function private.enqueue_support_reply_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_requester uuid;
begin
  if new.sender <> 'support' then return null; end if;
  select request.requester_id into v_requester from public.support_requests request where request.id = new.request_id;
  if v_requester is not null then
    perform private.enqueue_user_email('support_reply', v_requester,
      jsonb_build_object('request_id', new.request_id), 'support_reply:' || new.id);
  end if;
  return null;
end;
$$;

create trigger support_messages_enqueue_email after insert on private.support_request_messages
for each row execute function private.enqueue_support_reply_email();

create function private.enqueue_support_status_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_requester uuid;
begin
  select request.requester_id into v_requester from public.support_requests request where request.id = new.request_id;
  if v_requester is not null then
    perform private.enqueue_user_email('support_status', v_requester,
      jsonb_build_object('request_id', new.request_id, 'status', new.to_status), 'support_status:' || new.id);
  end if;
  return null;
end;
$$;

create trigger support_events_enqueue_email after insert on private.support_request_events
for each row when (new.to_status in ('waiting_on_user', 'resolved', 'rejected'))
execute function private.enqueue_support_status_email();

-- 8 and the registration alert: new accounts notify hello@, and password or email
-- changes notify the account's address (the old one, for an email change).
create function private.enqueue_auth_emails()
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
  return null;
end;
$$;

create trigger auth_users_enqueue_email after insert or update on auth.users
for each row execute function private.enqueue_auth_emails();

create function public.claim_email_outbox(p_limit integer default 25)
returns table(id uuid, kind text, to_email text, payload jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  return query
  with due as (
    select outbox.id from private.email_outbox outbox
    where outbox.sent_at is null and outbox.due_at <= now()
      and (outbox.claimed_until is null or outbox.claimed_until < now())
      -- Resend keeps idempotency keys for 24 hours; older uncertain sends stop retrying.
      and (outbox.first_attempt_at is null or outbox.first_attempt_at > now() - interval '23 hours')
    order by outbox.due_at, outbox.id limit p_limit for update skip locked
  ), claimed as (
    update private.email_outbox outbox
    set claimed_until = now() + interval '5 minutes',
      first_attempt_at = coalesce(outbox.first_attempt_at, now()),
      attempt_count = outbox.attempt_count + 1
    from due where outbox.id = due.id
    returning outbox.id, outbox.kind, outbox.to_email, outbox.payload
  )
  select claimed.id, claimed.kind, claimed.to_email, claimed.payload from claimed;
end;
$$;

create function public.finish_email_outbox(p_id uuid, p_provider_message_id text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.email_outbox
  set sent_at = case when nullif(btrim(p_provider_message_id), '') is not null then now() else sent_at end,
      provider_message_id = coalesce(nullif(btrim(p_provider_message_id), ''), provider_message_id),
      claimed_until = null
  where id = p_id and sent_at is null;
end;
$$;

revoke all on function private.enqueue_email(text, text, jsonb, text) from public, anon, authenticated;
revoke all on function private.enqueue_user_email(text, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.claim_email_outbox(integer) from public, anon, authenticated;
revoke all on function public.finish_email_outbox(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(integer) to service_role;
grant execute on function public.finish_email_outbox(uuid, text) to service_role;
