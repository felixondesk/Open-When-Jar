-- Reapply the jar creation RPC with explicit aliases so profile.username is never ambiguous.
-- The canonical corrected function body is in 20260920143606_add_jar_sizes.sql.

create or replace function public.create_jar_with_first_envelope(
  p_recipient_usernames text[],
  p_plan_code text,
  p_cover_note text,
  p_theme text,
  p_label text,
  p_message text,
  p_unlock_at timestamptz default null,
  p_unlock_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid := auth.uid();
  v_first_recipient public.profiles%rowtype;
  v_jar_id uuid;
  v_envelope_id uuid;
  v_active_drafts integer;
  v_recipient_count integer := coalesce(cardinality(p_recipient_usernames), 0);
  v_recipient_limit smallint;
  v_amount_cents integer;
begin
  if v_creator_id is null then raise exception 'Authentication required'; end if;

  select plan.recipient_limit, plan.amount_cents into v_recipient_limit, v_amount_cents
  from (values
    ('one_heart', 1::smallint, 799), ('two_hearts', 2::smallint, 1499),
    ('close_circle', 3::smallint, 1999), ('family_circle', 5::smallint, 2999),
    ('big_heart', 10::smallint, 4999)
  ) as plan(code, recipient_limit, amount_cents)
  where plan.code = p_plan_code;

  if not found then raise exception 'Choose a valid jar size'; end if;
  if v_recipient_count < 1 or v_recipient_count > v_recipient_limit then
    raise exception 'Choose between 1 and % recipients for this jar size', v_recipient_limit;
  end if;
  if exists (
    select 1 from unnest(p_recipient_usernames) as requested(username_value)
    where lower(btrim(requested.username_value)) !~ '^[a-z][a-z0-9_]{2,29}$'
  ) then raise exception 'Enter exact Open When Jar usernames'; end if;
  if (
    select count(distinct lower(btrim(requested.username_value)))
    from unnest(p_recipient_usernames) as requested(username_value)
  ) <> v_recipient_count then raise exception 'Each recipient username must be unique'; end if;
  if (
    select count(*) from unnest(p_recipient_usernames) as requested(username_value)
    join public.profiles p on p.username = lower(btrim(requested.username_value))::extensions.citext
  ) <> v_recipient_count then raise exception 'One or more Open When Jar usernames could not be found'; end if;
  if exists (
    select 1 from unnest(p_recipient_usernames) as requested(username_value)
    join public.profiles p on p.username = lower(btrim(requested.username_value))::extensions.citext
    where p.id = v_creator_id
  ) then raise exception 'Choose other people for this jar'; end if;

  select p.* into v_first_recipient
  from unnest(p_recipient_usernames) with ordinality as requested(username_value, position)
  join public.profiles p on p.username = lower(btrim(requested.username_value))::extensions.citext
  order by requested.position limit 1;

  if p_theme not in ('petal', 'blue', 'garden') then raise exception 'Choose a valid theme'; end if;
  if char_length(coalesce(p_cover_note, '')) > 240 then raise exception 'Cover note is too long'; end if;
  if char_length(btrim(coalesce(p_label, ''))) not between 1 and 80 then raise exception 'Envelope label must be 1-80 characters'; end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 1 and 3000 then raise exception 'Letter must be 1-3000 characters'; end if;
  if char_length(coalesce(p_unlock_timezone, '')) > 80 or not exists (
    select 1 from pg_catalog.pg_timezone_names
    where name = coalesce(nullif(btrim(p_unlock_timezone), ''), 'UTC')
  ) then raise exception 'Choose a valid timezone'; end if;

  select count(*) into v_active_drafts from public.jars
  where creator_id = v_creator_id and status = 'draft';
  if v_active_drafts >= 3 then raise exception 'You can have up to three active drafts'; end if;

  insert into public.jars (
    creator_id, recipient_id, recipient_username_snapshot,
    plan_code, recipient_limit, amount_cents, cover_note, theme
  ) values (
    v_creator_id, v_first_recipient.id, v_first_recipient.username,
    p_plan_code, v_recipient_limit, v_amount_cents, coalesce(p_cover_note, ''), p_theme
  ) returning id into v_jar_id;

  insert into public.jar_recipients (jar_id, recipient_id, creator_id, username_snapshot, position)
  select v_jar_id, p.id, v_creator_id, p.username, requested.position::smallint
  from unnest(p_recipient_usernames) with ordinality as requested(username_value, position)
  join public.profiles p on p.username = lower(btrim(requested.username_value))::extensions.citext
  order by requested.position;

  insert into public.envelope_headers (jar_id, position, label, unlock_at, unlock_timezone)
  values (v_jar_id, 1, btrim(p_label), p_unlock_at, coalesce(nullif(btrim(p_unlock_timezone), ''), 'UTC'))
  returning id into v_envelope_id;
  insert into public.envelope_contents (envelope_id, text_body) values (v_envelope_id, p_message);
  return v_jar_id;
end;
$$;
