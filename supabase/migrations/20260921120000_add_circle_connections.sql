-- Mutual, username-addressed connections used by the paid My Circle workspace.

create table public.circle_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  requester_username_snapshot extensions.citext not null,
  requester_display_name_snapshot text not null,
  addressee_username_snapshot extensions.citext not null,
  addressee_display_name_snapshot text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint circle_connections_different_people check (requester_id <> addressee_id),
  constraint circle_connections_known_status check (status in ('pending', 'accepted', 'declined')),
  constraint circle_connections_response_time check (
    (status = 'pending' and responded_at is null)
    or (status in ('accepted', 'declined') and responded_at is not null)
  )
);

create unique index circle_connections_unique_pair_idx
  on public.circle_connections (
    least(requester_id::text, addressee_id::text),
    greatest(requester_id::text, addressee_id::text)
  );
create index circle_connections_requester_idx on public.circle_connections(requester_id, status, created_at desc);
create index circle_connections_addressee_idx on public.circle_connections(addressee_id, status, created_at desc);

alter table public.circle_connections enable row level security;

create policy "Circle members can read their connection"
on public.circle_connections for select
to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create or replace function public.send_circle_request(p_username text)
returns public.circle_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester public.profiles%rowtype;
  v_addressee public.profiles%rowtype;
  v_existing public.circle_connections%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_requester from public.profiles where id = auth.uid();
  select * into v_addressee
  from public.profiles
  where username = lower(btrim(p_username))::extensions.citext;

  if v_addressee.id is null then
    raise exception 'CIRCLE_USER_NOT_FOUND';
  end if;
  if v_addressee.id = v_requester.id then
    raise exception 'CIRCLE_SELF';
  end if;

  select * into v_existing
  from public.circle_connections
  where least(requester_id::text, addressee_id::text) = least(v_requester.id::text, v_addressee.id::text)
    and greatest(requester_id::text, addressee_id::text) = greatest(v_requester.id::text, v_addressee.id::text)
  for update;

  if v_existing.id is not null and v_existing.status = 'accepted' then
    raise exception 'CIRCLE_ALREADY_CONNECTED';
  end if;
  if v_existing.id is not null and v_existing.status = 'pending' then
    if v_existing.addressee_id = v_requester.id then
      raise exception 'CIRCLE_REQUEST_WAITING_FOR_YOU';
    end if;
    raise exception 'CIRCLE_ALREADY_PENDING';
  end if;

  if v_existing.id is not null then
    update public.circle_connections
    set requester_id = v_requester.id,
        addressee_id = v_addressee.id,
        requester_username_snapshot = v_requester.username,
        requester_display_name_snapshot = v_requester.display_name,
        addressee_username_snapshot = v_addressee.username,
        addressee_display_name_snapshot = v_addressee.display_name,
        status = 'pending',
        created_at = now(),
        responded_at = null
    where id = v_existing.id
    returning * into v_existing;
  else
    insert into public.circle_connections (
      requester_id,
      addressee_id,
      requester_username_snapshot,
      requester_display_name_snapshot,
      addressee_username_snapshot,
      addressee_display_name_snapshot
    ) values (
      v_requester.id,
      v_addressee.id,
      v_requester.username,
      v_requester.display_name,
      v_addressee.username,
      v_addressee.display_name
    ) returning * into v_existing;
  end if;

  return v_existing;
end;
$$;

create or replace function public.respond_circle_request(p_request_id uuid, p_accept boolean)
returns public.circle_connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.circle_connections%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_connection
  from public.circle_connections
  where id = p_request_id
  for update;

  if v_connection.id is null or v_connection.addressee_id <> auth.uid() then
    raise exception 'CIRCLE_REQUEST_NOT_FOUND';
  end if;
  if v_connection.status <> 'pending' then
    raise exception 'CIRCLE_REQUEST_ALREADY_ANSWERED';
  end if;

  update public.circle_connections
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_request_id
  returning * into v_connection;

  return v_connection;
end;
$$;

revoke all on public.circle_connections from public, anon, authenticated;
grant select on public.circle_connections to authenticated;

revoke all on function public.send_circle_request(text) from public, anon;
revoke all on function public.respond_circle_request(uuid, boolean) from public, anon;
grant execute on function public.send_circle_request(text) to authenticated;
grant execute on function public.respond_circle_request(uuid, boolean) to authenticated;
