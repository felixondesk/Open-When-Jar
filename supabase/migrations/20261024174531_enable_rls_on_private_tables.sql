-- Service-only tables. Access goes through security-definer RPCs and the service role, which bypass RLS.
alter table private.pending_account_profiles enable row level security;
alter table private.admin_audit_log enable row level security;
alter table private.support_request_events enable row level security;
alter table private.jar_expiry_reminders enable row level security;
