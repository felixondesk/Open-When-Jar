-- Defense in depth: support contact data is accessed only inside audited
-- SECURITY DEFINER admin functions and the service-role ingestion function.
create policy "Support contacts are not directly accessible"
  on private.support_request_contacts
  for all
  to anon, authenticated
  using (false)
  with check (false);
