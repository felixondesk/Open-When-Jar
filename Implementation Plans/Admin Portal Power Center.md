# Admin Portal Power Center — Implementation Plan

Created: 23 September 2026  
Status: In progress. The analytics, paginated records, and request-inbox foundation was implemented on 23 September 2026; later controls remain dependent on payment, lifecycle, and backup systems.

## Implementation update — 23 September 2026

- Implemented `/admin/analytics` using a content-free first-party RPC, `/admin/records` with 25-row server-side pagination and filters, and `/admin/requests` with audited status updates and per-case history.
- Implemented signed-in Account intake for support, access, correction, export, deletion, refund review, abuse, and privacy requests. Requests are manual records; submitting or resolving one does not itself export, delete, or refund data.
- Applied four additive migrations to the active Supabase project and verified RLS, grants, AAL2 acceptance/AAL1 denial, and empty-data RPC responses. The Dodo test migrations were already present in live migration history when checked this session; live payment and refund behavior was not verified.
- Corrected the dashboard's mixed-currency revenue display and expiring-jar shortcut. The old snapshot still supplies recent overview items; detail browsing now queries all matching rows.
- Remaining: real admin OTP/TOTP browser test, request-event history/assignment/customer replies, automated export/deletion, provider-backed refund controls, lifecycle jobs, backup telemetry and restore rehearsal. These are not represented as completed controls in the UI.

## Goal

Turn the existing `/admin` dashboard into Felix's operating console for product health, payments, support, privacy requests, and lifecycle work. Keep private letter text, audio, images, transcripts, invitation secrets, and payment credentials out of routine admin views. Use first-party operational data; the product decision is to launch without third-party behavioral analytics.

## What exists today

- `/admin` has email OTP, TOTP MFA, a signed `app_metadata.role = "admin"` check, and an AAL2 gate. The database snapshot also checks the role; `ADMIN_PORTAL_PROGRESS.md` says the hardened live migration is applied, but real OTP, MFA, denial, and audit checks remain pending.
- The portal offers Overview, Jars, Orders, and People. It reads one content-free `admin_dashboard_snapshot()` response and has no write controls. Its jar, order, and people lists each stop at 100 records.
- The snapshot's revenue sums `amount_cents` without separating USD and INR. It represents succeeded order amounts, not verified net revenue. “Hosting ending soon” shows a seven-day count, while its shortcut currently opens all sealed jars.
- The Account screen has a disabled Delete account button. There is no implemented request intake, full data export, refund console, automated expiry/reminders/deletion, or backup health feed.
- Dodo Test Mode checkout and webhook code exist locally; `PROGRESS.md` says their migration and function have not yet been deployed or tested end to end. Live payments and refunds are not available. A proposed control must not imply that an unavailable operation works.

## Product boundaries from `NEED_TO_BE_DISCUSSED.md`

1. Include the portal at launch, but keep it inaccessible until admin role and MFA are configured and tested.
2. Use one unified admin inbox with separate support, account deletion, data export, and other privacy queues. Signed-in users submit access, correction, export, and deletion requests from Account. Felix handles them manually at launch; email alone does not authorize account changes.
3. Felix approves exceptional refunds and Dodo processes them. Used credits need manual review; do not automatically delete a recipient's gift.
4. A sealed jar's hosting term is three years from sealing, with keepsake export and one reminder daily in the final seven days. Unused credits do not expire while the account is active.
5. Backups must cover database, required Auth mapping, and Storage separately. Show failed/stale backup evidence and restore rehearsal status. Operational/security logs have a 90-day target, subject to incident holds.
6. Admin views should expose only what is necessary for operations. Routine support must not open private jar content.

## Portal structure

| Area | Launch use | Data and controls |
|---|---|---|
| Overview | See what needs action | Today/7/30/90-day totals; queue counts; failed payments; expiring jars; backup and job health, each with freshness time and drill-down |
| Analytics | Understand volume and fulfilment | New accounts, plans/seats, jars drafted/sealed/opened, credit usage, invitation delivery, payment outcomes, refunds, storage growth. Use aggregate first-party events only; label counts, currencies, and date basis clearly |
| Jars & lifecycle | Find operational failures | Search/paginate lifecycle metadata; scheduled opening, hosting end, reminder/export/deletion job state; narrowly scoped retry after the underlying jobs exist |
| Orders & credits | Reconcile entitlements | Plan/extra-jar purchases, provider status, currency, tax, refund state, granted/revoked credits, webhook/reconciliation status; review a case and record a decision before any provider action |
| People | Resolve account issues | Search/paginate account metadata, plan membership, seat and credit balances, account status, request history; no private content or role editing from the UI |
| Inbox | Handle user requests | Queues for support, access, correction, export, deletion, refund, abuse/privacy; assignment, status, due date, internal notes, action history, and safe replies after a contact channel is configured |
| Operations | Run the service | Backup freshness, last verified restore, scheduler/job failures, email and webhook delivery, incident/maintenance state, and links to documented runbooks |
| Audit | Review privileged activity | Actor, time, target ID, action, reason, result, and provider reference where needed, with no letter/media payloads |

## Delivery sequence

### Phase 0 — Secure and correct the foundation

- Complete the real admin role, OTP, TOTP/AAL2, denial, and audit checks before granting access. Keep admin-role assignment outside the portal through a protected server-side path.
- Replace the one-shot 100-row snapshot lists with server-side, filtered pagination. Keep the aggregate dashboard query separate from detail searches; avoid sending all customer rows to the browser.
- Separate monetary metrics by currency and distinguish gross captured, refunded, and net amounts. Do not call a Test Mode amount revenue. Include a time zone, period, event date, and last-refreshed timestamp on each metric.
- Fix the expiring-jars shortcut so it shows exactly the counted seven-day set. Define empty/error/loading states and a stale-data indicator.
- Check each admin read/write route and database function independently for role and current AAL2. Deny by default, constrain returned fields, rate-limit costly searches, and audit sensitive reads.

**Exit:** An unauthorized or AAL1 account cannot fetch any admin API result; mixed USD/INR records cannot be added into one currency total; lists work beyond 100 records; dashboard counts link to matching results.

### Phase 1 — Unified inbox and manual case workflow

- Add authenticated Account request forms for access, correction, export, and deletion. Capture request type, scope, minimal description, and the authenticated user ID. Show a receipt/reference, current status, and a clear statement that completion is manual at launch.
- Add a case model with `new → triaged → waiting_on_user / in_progress → resolved / rejected` states, category, severity, owner, due date, timestamps, and a redacted audit trail. Keep requester-visible updates distinct from internal notes.
- Provide separate admin queues, filters, assignment, notes, and decision recording. Link a case to account, jar, order, or provider ID only when needed. Avoid copying letter content into cases.
- Add support/refund/abuse intake only when a working public contact route exists. An inbound email may open a case, but any account-changing request from email must direct the user to sign in and submit through Account.
- Define the manual runbooks for access/correction/export/deletion, including what is removed live, what ages out of backups, payment record exceptions, and how Felix records completion evidence. Do not present a “complete” button until its real effects or manual evidence are defined.

**Exit:** A signed-in user can submit and track each privacy request; Felix can triage it without opening jar contents; anonymous/email-only requests cannot authorize account mutation; every status change is audited.

### Phase 2 — Payments, credits, and lifecycle controls

- First finish and validate Dodo sandbox fulfilment, provider event storage, idempotency, and reconciliation. Then add order/credit detail pages showing the source event and entitlement ledger. Add live payment views only after live mode is implemented.
- Use a refund case to record Felix's approval and evidence. When Dodo refund integration is available, send the approved refund through a server-only, idempotent action; reconcile the signed provider result before revoking an unused matching credit. Send used-credit cases to manual review.
- Build the promised keepsake export, final-seven-day reminders, expiry access stop, deletion, and orphan-upload cleanup jobs before exposing retry/resolve buttons. Job controls should target one typed job or bounded batch, require a reason and confirmation, show a preview of the affected records, and preserve retry history.
- Show credit ownership per seat and remaining balance. Any manual entitlement correction should be a ledger adjustment tied to a case, reason, actor, and original transaction, never a silent balance edit.

**Exit:** A duplicate webhook does not double-grant; a refund cannot silently revoke a used gift; an expiring jar's displayed state matches enforced access and actual job results; a failed job can be retried without duplicate reminders or deletion.

### Phase 3 — Operations and recovery center

- Feed the portal signed/verified status from the backup and job runners: most recent successful database/Auth/Storage copies, age, size/checksum, last alert, and latest restore rehearsal. Alert when a job fails or a valid backup is older than 36 hours.
- Add payment/webhook, Resend invitation, notification, export, retention, and cleanup health views with incident links and runbooks. Show “not configured” when a feed or provider is absent; never infer healthy status from missing data.
- Keep dangerous operational actions behind server checks and documented runbooks. Maintenance mode, restore, key rotation, and bulk deletion should not be one-click actions in the first release.

**Exit:** Felix can tell whether the service is processing purchases and lifecycle jobs and whether all three backup components are recoverable; one full restore rehearsal is recorded before paid launch.

## Data and security design

- Use narrow, audited database functions or server endpoints for admin reads, with explicit field lists and pagination. Keep service credentials server-side. Recheck auth at execution time for every action; do not rely on hidden UI controls.
- Store case and action history in restricted tables with RLS and explicit grants. Use immutable audit entries for privileged changes. Never put private content, raw email bodies, bearer tokens, signed media URLs, or secrets into logs or analytics.
- Model payment and credit changes as provider events and ledger entries; the dashboard is a projection of those records. Never derive paid access from browser redirects or editable admin totals.
- Protect destructive/reversible actions differently: safe retries can be enabled after idempotency testing; refunds, account restriction, content deletion, and credit adjustments require reason, exact target, impact preview, and recorded outcome. Separate provider-confirmed from merely requested states.
- Use aggregate counters derived from existing product records. Do not add cross-site trackers or third-party behavioral analytics. Keep retention and deletion policies aligned with the final public policies.

## Verification plan

1. Unit/integration coverage for snapshot parsing, filters/pagination, case transitions, entitlement/refund idempotency, and currency-safe totals.
2. Database authorization tests for no session, ordinary user, admin AAL1, and admin AAL2; verify direct RPC/endpoint access and audit rows, including denied actions.
3. Browser QA for Account request submission and admin triage, plus empty/loading/error/stale states and mobile-width admin layout.
4. Sandbox payment and refund reconciliation tests with duplicate/out-of-order events; expiry/reminder/deletion tests using controllable time and sample records.
5. Restore a test database plus Auth mapping and sample Storage objects, then check RLS, login, jar access, export, and payment reconciliation. Re-run Supabase security/performance advisors after schema changes.

## Open decisions and dependencies

- **Before inbox launch:** choose the public support/privacy contact route, its owner/backup reviewer, and realistic response targets. Account privacy-request intake can be built while those are decided.
- **Before refund controls:** approve refund wording and verify Dodo's actual refund API, processing time, and live merchant setup. Dodo remains the processor; Felix remains the approver.
- **Before paid launch:** finish seller/contact details, market-specific legal review, hosting/export/deletion behavior, backups and restore rehearsal, and live payment reconciliation.
- **For abuse controls:** choose urgent same-day criteria and whether in-product block/report features are needed at launch. Restriction and takedown actions need a documented review/appeal path.
- **Metric definitions to approve during Phase 0:** whether “active accounts” means signed in during a period or simply non-deleted; whether revenue cards show captured gross or net of refunds; whether opening analytics count unique jars, recipients, or individual envelopes. Until defined, use unambiguous labels for raw counts only.

## First implementation slice

Start with Phase 0 and the Account-to-Inbox request flow. This gives the portal trustworthy numbers and a usable service queue without exposing irreversible controls before the payment, export, retention, and backup systems are real.
