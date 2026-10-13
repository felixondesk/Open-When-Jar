-- Customer-visible messages are separate from private administrative decision notes.
create table private.support_request_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.support_requests(id) on delete cascade,
  actor_id uuid not null,
  sender text not null check (sender in ('support', 'customer')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_request_messages_request_idx on private.support_request_messages(request_id, created_at, id);
create index support_request_messages_actor_created_idx on private.support_request_messages(actor_id, created_at) where sender = 'customer';
alter table private.support_request_messages enable row level security;
revoke all on private.support_request_messages from public, anon, authenticated;
revoke all on sequence private.support_request_messages_id_seq from public, anon, authenticated;

-- RPCs need access to the private message table. Every definer RPC checks identity
-- and ownership (or the trusted admin role plus MFA) before accessing any data.
create function public.support_request_conversation(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_request public.support_requests%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_request from public.support_requests where id = p_request_id;
  if not found or (v_request.requester_id is distinct from v_actor and not (
    coalesce(v_claims -> 'app_metadata' ->> 'role', '') = 'admin'
    and coalesce(v_claims ->> 'aal', '') = 'aal2'
  )) then raise exception 'REQUEST_NOT_FOUND' using errcode = '42501'; end if;
  return jsonb_build_object(
    'request', jsonb_build_object('id', v_request.id, 'category', v_request.category,
      'details', v_request.details, 'status', v_request.status, 'created_at', v_request.created_at),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'sender', m.sender, 'body', m.body, 'created_at', m.created_at
    ) order by m.created_at, m.id) from private.support_request_messages m where m.request_id = p_request_id), '[]'::jsonb)
  );
end;
$$;

-- Keep the original three-argument status RPC working for existing deployments.
-- New admin forms use this atomic wrapper to save status + optional public message.
create function public.admin_update_support_request_with_message(p_request_id uuid, p_status text, p_note text, p_message text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_message text := btrim(coalesce(p_message, ''));
  v_request public.support_requests%rowtype;
begin
  if v_actor is null or coalesce(v_claims -> 'app_metadata' ->> 'role', '') <> 'admin'
    or coalesce(v_claims ->> 'aal', '') <> 'aal2' then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  if char_length(v_message) > 2000 or (p_status = 'waiting_on_user' and v_message = '') then
    raise exception 'CUSTOMER_MESSAGE_REQUIRED' using errcode = '22023';
  end if;
  select * into v_request from public.support_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_message <> '' and (v_request.requester_id is null or v_request.source <> 'app') then
    raise exception 'ACCOUNT_CONVERSATION_REQUIRED' using errcode = '22023';
  end if;
  perform public.admin_update_support_request(p_request_id, p_status, p_note);
  if v_message <> '' then
    insert into private.support_request_messages(request_id, actor_id, sender, body)
    values (p_request_id, v_actor, 'support', v_message);
  end if;
end;
$$;

create function public.reply_to_support_request(p_request_id uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_message text := btrim(coalesce(p_message, ''));
  v_request public.support_requests%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if char_length(v_message) not between 1 and 2000 then raise exception 'INVALID_REPLY' using errcode = '22023'; end if;
  -- Serialize replies per account before checking the shared account reply quota.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 731));
  select * into v_request from public.support_requests where id = p_request_id and requester_id = v_actor and source = 'app' for update;
  if not found then raise exception 'REQUEST_NOT_FOUND' using errcode = '42501'; end if;
  if v_request.status in ('resolved', 'rejected') then raise exception 'REQUEST_CLOSED' using errcode = '22023'; end if;
  if (select count(*) from private.support_request_messages
    where actor_id = v_actor and sender = 'customer' and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'REPLY_LIMIT_REACHED' using errcode = '22023';
  end if;
  insert into private.support_request_messages(request_id, actor_id, sender, body)
  values (p_request_id, v_actor, 'customer', v_message);
  update public.support_requests set status = case when status = 'waiting_on_user' then 'in_progress' else status end
  where id = p_request_id;
  insert into private.support_request_events(request_id, actor_id, from_status, to_status, note)
  values (p_request_id, v_actor, v_request.status,
    case when v_request.status = 'waiting_on_user' then 'in_progress' else v_request.status end, 'Customer replied.');
end;
$$;

revoke all on function public.support_request_conversation(uuid) from public, anon;
revoke all on function public.admin_update_support_request_with_message(uuid, text, text, text) from public, anon;
revoke all on function public.reply_to_support_request(uuid, text) from public, anon;
grant execute on function public.support_request_conversation(uuid) to authenticated;
grant execute on function public.admin_update_support_request_with_message(uuid, text, text, text) to authenticated;
grant execute on function public.reply_to_support_request(uuid, text) to authenticated;
