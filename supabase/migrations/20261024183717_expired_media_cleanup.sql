-- The outbox reminder replaced the jar-expiry-reminder Edge Function, so its queue goes.
drop function public.claim_jar_expiry_reminders(integer);
drop function public.finish_jar_expiry_reminder(uuid, text);
drop table private.jar_expiry_reminders;

-- send-emails drains this queue each minute: Storage objects can only be removed
-- through the Storage API, not SQL. Removal is idempotent, so overlapping runs are safe.
create function public.list_expired_media(p_limit integer default 100)
returns table(storage_path text) language sql security definer set search_path = '' as $$
  select cleanup.storage_path from private.expired_media_cleanup cleanup
  order by cleanup.queued_at limit least(greatest(p_limit, 1), 100);
$$;

create function public.finish_expired_media(p_paths text[])
returns void language sql security definer set search_path = '' as $$
  delete from private.expired_media_cleanup where storage_path = any(p_paths);
$$;

revoke all on function public.list_expired_media(integer) from public, anon, authenticated;
revoke all on function public.finish_expired_media(text[]) from public, anon, authenticated;
grant execute on function public.list_expired_media(integer) to service_role;
grant execute on function public.finish_expired_media(text[]) to service_role;
