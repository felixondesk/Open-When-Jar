-- Metadata may remain on shelves, but private letters and media stop being
-- readable at the stored hosting deadline even if the cleanup job is late.

drop policy if exists "Jar members can read envelope headers" on public.envelope_headers;
create policy "Jar members can read envelope headers"
on public.envelope_headers for select to authenticated
using (exists (
  select 1 from public.jars j
  where j.id = envelope_headers.jar_id
    and (
      (j.status = 'draft' and j.creator_id = (select auth.uid()))
      or (j.status = 'sealed' and j.hosting_ends_at > now()
        and (j.creator_id = (select auth.uid()) or exists (
          select 1 from public.jar_recipients r
          where r.jar_id = j.id and r.recipient_id = (select auth.uid())
        )))
    )
));

drop policy if exists "Creators and unlocked recipients can read letter contents" on public.envelope_contents;
create policy "Creators and unlocked recipients can read letter contents"
on public.envelope_contents for select to authenticated
using (exists (
  select 1 from public.envelope_headers h
  join public.jars j on j.id = h.jar_id
  where h.id = envelope_contents.envelope_id
    and (
      (j.status = 'draft' and j.creator_id = (select auth.uid()))
      or (j.status = 'sealed' and j.hosting_ends_at > now()
        and (j.creator_id = (select auth.uid()) or (
          (h.unlock_at is null or h.unlock_at <= now())
          and exists (select 1 from public.jar_recipients r
            where r.jar_id = j.id and r.recipient_id = (select auth.uid()))
        )))
    )
));

drop policy if exists "Creators and unlocked recipients can read attachments" on public.attachments;
create policy "Creators and unlocked recipients can read attachments"
on public.attachments for select to authenticated
using (exists (
  select 1 from public.envelope_headers h
  join public.jars j on j.id = h.jar_id
  where h.id = attachments.envelope_id
    and (
      (j.status = 'draft' and j.creator_id = (select auth.uid()))
      or (j.status = 'sealed' and j.hosting_ends_at > now()
        and (j.creator_id = (select auth.uid()) or (
          (h.unlock_at is null or h.unlock_at <= now())
          and exists (select 1 from public.jar_recipients r
            where r.jar_id = j.id and r.recipient_id = (select auth.uid()))
        )))
    )
));

drop policy if exists "Jar members download authorized media" on storage.objects;
create policy "Jar members download authorized media"
on storage.objects for select to authenticated
using (bucket_id = 'jar-media' and exists (
  select 1 from public.attachments a
  join public.envelope_headers h on h.id = a.envelope_id
  join public.jars j on j.id = h.jar_id
  where a.storage_path = storage.objects.name
    and (
      (j.status = 'draft' and j.creator_id = (select auth.uid()))
      or (j.status = 'sealed' and j.hosting_ends_at > now()
        and (j.creator_id = (select auth.uid()) or (
          (h.unlock_at is null or h.unlock_at <= now())
          and exists (select 1 from public.jar_recipients r
            where r.jar_id = j.id and r.recipient_id = (select auth.uid()))
        )))
    )
));

drop policy if exists "Recipients add state only for their jars" on public.recipient_envelope_state;
create policy "Recipients add state only for their jars"
on public.recipient_envelope_state for insert to authenticated
with check (recipient_id = (select auth.uid()) and exists (
  select 1 from public.envelope_headers h
  join public.jars j on j.id = h.jar_id
  where h.id = recipient_envelope_state.envelope_id
    and j.status = 'sealed' and j.hosting_ends_at > now()
    and (h.unlock_at is null or h.unlock_at <= now())
    and exists (select 1 from public.jar_recipients r
      where r.jar_id = j.id and r.recipient_id = (select auth.uid()))
));

drop policy if exists "Recipients update their own envelope state" on public.recipient_envelope_state;
create policy "Recipients update their own envelope state"
on public.recipient_envelope_state for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()) and exists (
  select 1 from public.envelope_headers h
  join public.jars j on j.id = h.jar_id
  where h.id = recipient_envelope_state.envelope_id
    and j.status = 'sealed' and j.hosting_ends_at > now()
    and (h.unlock_at is null or h.unlock_at <= now())
    and exists (select 1 from public.jar_recipients r
      where r.jar_id = j.id and r.recipient_id = (select auth.uid()))
));
