-- Enforce mutual Circle membership at both draft creation and sealing.
-- The latter also covers drafts created before this rule was introduced.

create function private.require_circle_for_jar_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.circle_connections connection
    where connection.status = 'accepted'
      and (
        (connection.requester_id = new.creator_id and connection.addressee_id = new.recipient_id)
        or (connection.addressee_id = new.creator_id and connection.requester_id = new.recipient_id)
      )
  ) then
    raise exception 'CIRCLE_REQUIRED' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger jar_recipient_requires_circle
before insert or update of creator_id, recipient_id on public.jar_recipients
for each row execute function private.require_circle_for_jar_recipient();

create function private.require_circle_before_seal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.jar_recipients recipient
    where recipient.jar_id = new.id
      and not exists (
        select 1 from public.circle_connections connection
        where connection.status = 'accepted'
          and (
            (connection.requester_id = new.creator_id and connection.addressee_id = recipient.recipient_id)
            or (connection.addressee_id = new.creator_id and connection.requester_id = recipient.recipient_id)
          )
      )
  ) then
    raise exception 'CIRCLE_REQUIRED' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger sealed_jar_requires_circle
before update of status on public.jars
for each row when (old.status = 'draft' and new.status = 'sealed')
execute function private.require_circle_before_seal();

revoke all on function private.require_circle_for_jar_recipient() from public, anon, authenticated;
revoke all on function private.require_circle_before_seal() from public, anon, authenticated;
