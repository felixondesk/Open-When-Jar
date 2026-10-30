-- iPhone browsers (WebKit) can't encode WebP from a canvas, so the client falls back to JPEG.
alter table public.attachments drop constraint attachments_mime_kind;
alter table public.attachments add constraint attachments_mime_kind check (
  (kind = 'image' and mime_type in ('image/webp', 'image/jpeg'))
  or (kind = 'audio' and mime_type in ('audio/webm', 'audio/ogg', 'audio/mp4'))
);

update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'audio/webm', 'audio/ogg', 'audio/mp4']
where id = 'jar-media';
