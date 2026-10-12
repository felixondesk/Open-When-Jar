# Open When Jar — Decisions and Implementation Plan

Last reviewed: 23 September 2026

This records the confirmed product decisions, remaining questions, and the work needed to launch them. It is product/operations planning, not legal advice. The privacy policy, terms, and refund wording should be reviewed for the countries where Open When Jar will sell.

## Already decided

- **Supabase:** start with the current `openwhenjar` project on the Free plan; move to a paid plan later as usage and production needs grow.
- **Admin portal:** include it at launch, but keep it inaccessible until the admin role and MFA are configured and tested.
- **Domain and hosting:** intentionally leave until the final launch step.
- **Payments:** use Dodo Payments; Felix will complete approval and create the required products.
- **Billing model:** one-time purchase; each seat gets 10 jars total, with extra jars available for a separate one-time purchase. There is no monthly reset or renewal.
- **Pricing currencies:** display USD globally, except for fixed INR prices in India.
- **Extra jar price:** US$1.99 globally, or ₹59 in India, per additional jar credit.
- **Extra jar ownership:** an extra jar credit belongs to the individual seat that purchases it; it is not shared across the plan.
- **Jar credit expiry:** unused jar credits do not expire while the account remains active.
- **Tax display:** listed USD and INR prices are before tax; Dodo calculates and adds applicable tax at checkout.
- **Refund responsibility:** Felix approves exceptional refunds; Dodo processes approved refunds.
- **Sent-jar hosting:** each paid Jar should expire three years after its recipient receives it. There is no hosting extension; the recipient can download a keepsake copy before expiry and will receive one email reminder seven days before expiry.
- **Analytics:** no third-party behavioral analytics at launch; retain only necessary operational, security, and payment logs.
- **Public product/brand name:** Open When Jar. Customer-facing products use this name with the plan or extra-jar label.
- **Seller structure:** **Confirmed 23 September 2026:** launch as an independent developer/individual seller. Resolve the seller identity and any legally required customer-facing address/contact details privately before sales begin; do not infer the operating location from personal origin.
- **Support/privacy contact:** create a dedicated mailbox on the production domain after the domain is chosen; do not publish a personal mailbox as the permanent contact.
- **Email:** use Supabase Auth to create and verify the login links, with Resend as the production SMTP delivery provider.

## 1. Final prices

These prices were previously approved for the one-time purchase model. Reconfirm them alongside the extra-jar price:

| Jar size | Seats | USD price | India price |
|---|---:|---:|---:|
| One Heart | 1 | US$7.99 | ₹399 |
| Two Hearts | 2 | US$14.99 | ₹699 |
| Close Circle | 3 | US$19.99 | ₹999 |
| Family Circle | 5 | US$29.99 | ₹1,499 |
| Big Heart | 10 | US$49.99 | ₹2,499 |

The INR prices are fixed market prices, not exchange-rate conversions. Each purchased seat receives 10 jars total.

An extra jar costs US$1.99 or ₹59. The INR top-up price still needs a real Dodo checkout and fee check before launch; margin from a single-jar purchase should not be assumed.

Still to decide:

- [x] USD and INR one-time plan prices reconfirmed.
- [x] Extra jar credits are purchased and owned by the individual seat; they are not shared across the plan.
- [x] Listed prices are before tax; applicable tax is calculated and added at checkout by Dodo.
- [x] Unused jar credits do not expire while the account remains active.

## 2. Refund policy

This starting policy assumes one-time jar credits; review it for both plan and extra-jar purchases before approval.

**Recommended starting policy:**

- Refund accidental duplicate charges.
- Refund a verified technical failure where Open When Jar cannot deliver the paid service.
- Do not offer change-of-mind refunds for unused or used credits, except where consumer law requires it.
- An approved refund revokes the matching unused credit. If the credit was already used, flag the case for manual review rather than deleting a recipient's gift automatically.
- State the expected refund processing time after Dodo confirms its timing.

Still to decide:

- [x] Launch sales are global, subject to Dodo eligibility and local legal restrictions.
- [x] No goodwill refund window applies to unused credits.
- [x] Felix approves exceptional refunds; Dodo processes approved refunds.

## 3. Privacy policy

The policy should explain that Open When Jar stores:

- Login email and authentication data in Supabase Auth.
- Public username and display name.
- Jar recipients, schedules, letter text, favourites, and opening history.
- Private compressed images and voice notes.
- Payment status and identifiers from Dodo, but not full card details.
- Necessary security, audit, and error logs.

Recommended promises:

- Email addresses are not used to address or discover gift recipients.
- Private jar content is visible only to authorised creators/recipients and is not shown in the admin dashboard.
- Data is not sold.
- Users can request access, export, correction where applicable, and deletion.
- Backups expire on their normal rotation rather than being edited individually.

Still to decide:

- [ ] Configure the individual seller's legal name and postal address privately before launch.
- [x] Use a dedicated support/privacy mailbox on the production domain after domain selection; do not publish a personal mailbox permanently.
- [x] Launch globally, subject to Dodo eligibility and the privacy laws applicable to each customer's region.
- [x] No third-party behavioral analytics at launch; retain only necessary operational, security, and payment logs.

## 4. Terms of service

Confirmed terms and paid-launch requirements:

- Every account holder and Jar recipient must be at least 18. Use an unticked age-confirmation checkbox; do not request a full date of birth by default.
- Accept paid customers globally where Dodo supports them and applicable law permits. Keep one-time purchases; no subscription or automatic renewal. Prices are before tax, with applicable tax added by checkout.
- Each seat in a purchased plan receives 10 Jars. An extra Jar credit belongs to the seat that bought it; unused credits do not expire while that account stays active.
- Users keep ownership of their content and grant only the limited licence required to store and deliver it.
- No illegal, threatening, hateful, sexually exploitative, infringing, malicious, or privacy-invasive content.
- Users must have permission to upload other people's images or voices.
- Each paid Jar expires three years after the recipient receives it (when it becomes available in the service). This applies to that Jar only; there is no hosting extension. The recipient can download a keepsake before expiry, and receives one email reminder seven days before expiry.
- Scheduled opening and browser notifications are convenience features; delivery can be delayed by browsers, devices, or network providers.
- Accounts may be restricted for abuse, fraud, security threats, or legal compliance.
- Draft governing law is India, while preserving consumer rights that cannot be waived under a customer's applicable law. Disputes may be brought in a forum permitted by law; do not require an exclusive local venue.

Current implementation and launch gate (24 September 2026): the app records the end date when sealing makes a Jar available to its recipient. Live payments and automatic expiry removal are not implemented. Letter/media access stops at the deadline through live RLS, and a recipient keepsake download is implemented in local app code but needs authenticated browser QA. The reminder queue and Edge Function are deployed, but sender and schedule configuration are pending. Checkout is still in test mode. The governing-law wording and market-specific consumer, warranty, and liability terms need review before paid launch.

Still to decide:

- [x] Three-year per-Jar hosting period from recipient receipt; keepsake download before expiry; one reminder email seven days before; no extension.
- [x] Use Indian law as the draft governing law, preserve mandatory local consumer rights, and avoid an exclusive local venue; keep legal review as a separate launch gate.
- [ ] Confirm the seller identity shown at checkout and in receipts.

## 5. Support contact and responsibilities

**Recommended:** create `support@<production-domain>` after the domain is selected. Until then, do not publish a personal mailbox as permanent support.

| Area | Primary owner | Proposed response target |
|---|---|---|
| General support ticket | Felix | Resolve or fulfill within 3–4 calendar days |
| Login/account recovery | Felix, using Supabase tools | Resolve within 3–4 calendar days |
| Failed jar delivery or media issue | Felix; Codex diagnoses code defects | Resolve or provide a concrete next step within 3–4 calendar days |
| Refund request | Felix reviews and submits the decision to Dodo | Review and submit within 3–4 calendar days |
| Abuse/privacy report | Felix reviews; Codex supplies technical evidence | Review and respond within 3–4 calendar days |
| Security incident | Felix owns communication; Codex contains/remediates software issue | Same day |
| Infrastructure outage | Felix checks vendor status; Codex investigates application | Same day |

Still to decide:

- [ ] Select the production domain, then create and publish the final support/privacy email. Felix confirms the domain is not selected yet.
- [ ] Check the remaining response targets against weekends and holidays.
- [ ] A backup support person if Felix is unavailable.

## 6. Backups, retention, and restoration

**Recommended recovery plan:**

- **Free phase:** run a daily encrypted export of database schema, app data, and required roles using a documented Supabase CLI workflow; keep migrations and configuration in version control. Export the required Auth account mapping separately and copy Supabase Storage objects to separate off-site storage. Keep 30 rolling daily copies.
- **Paid phase:** keep Supabase's daily backups and continue the separate off-site copies. Revisit PITR when a 24-hour recovery point is no longer enough or sales volume justifies its cost.
- **Protection:** encrypt backups in transit and at rest; keep them in a separate account or provider; require MFA; restrict access to Felix and the designated backup reviewer; do not expose backup URLs; keep secrets in a password manager rather than in backup files.
- **Monitoring:** alert on a failed job or when the newest valid backup is more than 36 hours old. Record the backup date, size, checksum, and restore status.
- **Recovery:** put the app in maintenance mode and stop writes; identify the last known-good backup; restore the database to a clean Supabase project; restore Auth account data or rebuild the account mapping as documented; restore Storage objects separately; verify RLS/access, authentication, jar sealing/opening/expiry, keepsake export, and payment/refund reconciliation; rotate keys; point the app to the recovered project; document the incident.
- **Recovery targets:** during the early phase, allow up to 24 hours of data loss and target recovery within 24 hours. Improve these targets only when usage and revenue justify the added operational cost.
- **Testing:** complete one full restore rehearsal before the first paid launch and repeat quarterly. Test an actual database restore and a sample Storage restore; a successful backup job alone is not proof of recoverability.
- **Deletion:** delete live jar content at the end of the three-year hosting period or account-deletion workflow. Keep any encrypted backup copy for no more than 30 days after live deletion, then let it expire through normal backup rotation. Keep payment and accounting records separate from jar content.
- Keep security/application logs for 90 days unless an incident requires longer.
- Keep payment/refund records for the period required by the seller's tax and accounting law.
- Automatically remove abandoned upload reservations and orphaned media on a short schedule, recommended 24 hours.

Still to decide:

- [x] Retain 30 days of off-site database exports and Storage backups while using Supabase Free.
- [x] Defer PITR until moving to a paid Supabase plan and a shorter recovery point is justified by usage or revenue.
- [x] Delete live jar content at expiry or account deletion; allow encrypted backup copies to expire within 30 days after live deletion.
- [ ] Accounting-record retention with the accountant/legal adviser.

## 7. Abuse handling

Recommended process:

1. Receive reports through the published support/privacy address.
2. Record the jar/account identifiers without copying private letter content into support tickets unless necessary.
3. Restrict access temporarily only when there is a credible safety, fraud, or legal risk.
4. Preserve relevant audit records, review, and document the decision.
5. Remove content or suspend an account when required, then notify affected users where safe and lawful.
6. Provide an appeal channel for non-emergency moderation decisions.

Still to decide:

- [ ] Who is the backup reviewer?
- [ ] What urgent reports qualify for same-day action?
- [ ] Whether blocked-user and report-user features are needed for launch or can follow in the first update.

## 8. Privacy and terms — questions to close today

The public Privacy Notice and Terms of Use drafts were revised on 23 September 2026. They now distinguish current behavior from planned product rules. This list records decisions as we discuss them; unresolved items still need answers before paid launch:

1. **Who is the legal seller/operator?** **Confirmed 23 September 2026:** launch as an independent individual seller, not through a registered company. The seller's operating location is not established by this discussion; do not infer it from personal origin or publish a city solely because the product is global. The legal name and any address/contact details required on the site or checkout remain to be determined privately before paid launch.
2. **Which countries will be enabled at first paid launch?** **Confirmed 23 September 2026:** accept payments globally, subject to Dodo eligibility and applicable local law. Before launch, check provider availability and complete the required country-specific legal review.
3. **Minimum age and age check:** **Confirmed 23 September 2026:** every account holder, including Jar recipients, must be at least 18. Require an unticked “I confirm I am at least 18” statement; do not collect full birth dates by default. This records a user's declaration, not proof of age. Review each launch market for stronger age-assurance requirements before enabling checkout there. Felix has asked an agent to implement the age confirmation.
4. **Governing law and dispute handling:** **Confirmed 23 September 2026 (founder-authored draft):** Indian law governs; preserve any consumer rights that cannot be waived under a customer's local law; do not require an exclusive local venue; allow proceedings in a forum permitted by applicable law. Felix is an independent developer without a lawyer, so this is not legal review; check the wording against enabled markets as practical.
5. **What privacy, support, and grievance contact will users reach?** **Confirmed 23 September 2026:** use one unified inbox in the Admin Portal, separated into queues such as support, deletion, export, and other privacy requests. Customers will submit support tickets in the app; people who cannot use the app should email Support. Support emails should create tickets in the Admin Portal's separate Support queue. Resolve or fulfill customer-submitted support and privacy tickets within 3–4 calendar days. Felix is the launch owner. The in-app queues and provider-neutral email intake are implemented; the production domain, mailbox/provider adapter, webhook secret, public support email, and backup coverage remain launch work.
6. **What personal-data request process can we actually operate?** **Confirmed 23 September 2026:** signed-in users submit access, correction, export, and deletion requests from the Account section; Felix handles them manually through the Admin Portal inbox at launch. The authenticated session identifies the account, so no separate email confirmation is needed. An email alone is not enough to authorize an account change; the user must sign in. Complete privacy requests within 3–4 calendar days, not just acknowledge them. As of 24 September, in-app request intake, category-specific queues, audited admin status history, and signed provider-neutral support-email ingestion have app code and applied database migrations. The mailbox/provider adapter, webhook secret, and public support address must be configured before email can be received. Authenticated browser QA, complete account export, and account-deletion cleanup remain. The retention decision is to delete live Jar content at expiry or account deletion, then let encrypted backup copies expire within 30 days.
7. **Where will production data be processed?** **Verified 23 September 2026:** the active Open When Jar Supabase project uses region `ap-southeast-1` (Singapore), where its primary project data is stored. **Confirmed 23 September 2026:** configure Vercel Functions in `sin1` (Singapore) at first deployment, close to the database; verify the live setting after deployment. Also confirm Google sign-in, Resend email, and Dodo checkout processing details and terms before finalizing the privacy notice.
8. **What expiry, keepsake export, and reminders do we promise at paid launch?** **Confirmed 23 September 2026:** each paid Jar should automatically expire three years after it is received by its recipient; this timer applies to that Jar only, not the user's account or other Jars. Treat automatic expiry as required paid-launch behavior. Recipients should be able to download a keepsake copy before that Jar expires. Send one email reminder seven days before expiry. As of 24 September, the seal operation records the end date, live RLS denies expired letter/media reads, a local keepsake download exists, and the reminder queue/function are deployed. Automated deletion and scheduled email delivery are still pending.
9. **Who will review the final wording for each launch market?** Felix says he is an indie developer without a lawyer. Treat the policies as founder-written drafts, not lawyer-reviewed; do not claim legal approval. Review the wording against the implemented product and payment/provider setup before launch. Local market-specific legal review remains unavailable and unresolved.

**Current legal research to recheck before launch:** India's DPDP Act has a [phased commencement schedule](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf), and the Consumer Protection (E-Commerce) Amendment Rules, 2026 are scheduled to take effect on 1 January 2027, according to the [Department of Consumer Affairs release](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=294532). Confirm the then-current requirements with counsel rather than treating this planning note as legal advice.

## Final approval checklist

- [x] One-time plan and extra-jar prices approved; listed prices are before tax and Dodo adds applicable tax at checkout.
- [ ] Refund wording approved.
- [x] Privacy Notice and Terms of Use drafts updated on 23 September 2026 against current product behavior.
- [ ] Privacy Notice, Terms of Use, and Refund Policy legally reviewed for the chosen launch markets.
- [ ] Seller identity and support/privacy contacts chosen.
- [ ] Hosting and deletion/retention promises aligned across the product and legal pages.
- [ ] Backup, restore, refund, support, and abuse owners accepted.

## Implementation plan for confirmed decisions

This plan covers decisions marked confirmed or checked above. An unchecked decision remains a launch dependency, not permission to invent its answer. Each phase ends with evidence of working behavior; code, a local SQL file, and a live deployment are separate milestones. Keep Test Mode entitlements distinguishable from paid purchases. The current request inbox and age checkbox provide starting points, but neither proves the complete launch flow.

### Phase 0 — Establish the baseline and protect the launch boundary

1. Trace the current account creation, Google username onboarding, Circle/seat assignment, jar sealing, checkout, webhook, admin request, and media authorization flows. Record which migrations and functions are actually present in the active Supabase project, which are local only, and whether the Dodo Test Mode webhook has completed a real sandbox round trip. Update `PROGRESS.md` when this evidence changes.
2. Keep the existing Test Mode checkout behind an explicit non-production gate. Do not count Test Mode payments as revenue or grant live paid credits from a browser return URL. Use signed provider events and durable, idempotent fulfillment for every purchase.
3. Build a small launch verification matrix: unauthenticated user, ordinary account, recipient, plan owner, admin at AAL1, and admin at AAL2; USD and INR; one-seat and multiple-seat plans; unused and spent credits; active, expiring, and expired jars. Record the exact environment used for every result.

**Exit evidence:** a current migration/deployment inventory, a documented sandbox checkout result, and a list of remaining live-provider and authenticated-browser gaps.

### Phase 1 — Account access, age declaration, and admin security

1. Finish the unticked “I confirm I am at least 18” requirement for every account creation route, including email signup and Google first-login onboarding. The checkbox exists in the current forms; verify the server rejects a missing declaration and that an existing session cannot skip a required first-login step. Record the declaration without collecting birth dates by default. Review stronger age-assurance requirements before enabling a market that requires them.
2. Configure Supabase Auth email through Resend on a verified production sender domain. Check signup, verification, login, recovery, Google login, callback, and account-linking paths on the deployed site. Keep email for authentication and seat invitations; recipient discovery and jar addressing remain username/Circle based.
3. Create and verify the intended administrator account, assign the admin role through a protected server-side process, configure OTP, enroll TOTP, and test the AAL2 gate. Check direct admin routes and RPCs as an ordinary user and at AAL1. Confirm sensitive admin actions write audit entries and routine views do not reveal private jar content.

**Exit evidence:** account and recipient signups cannot bypass the age declaration; production mail and Google journeys work; a real AAL2 admin can enter the portal while non-admin and AAL1 calls are denied.

### Phase 2 — One-time plans, checkout, credits, and refunds

1. Use the five confirmed one-time seat plans and prices in Section 1. Each purchased seat has 10 jars in total, with no renewal or monthly reset. An extra jar costs US$1.99 or ₹59 before tax and belongs only to the buying seat. Available unused credits remain valid while the account is active. Enforce price, plan, seat ownership, and allowance on the server/database as well as in the UI.
2. Finish Dodo merchant approval and product setup, including supported selling countries, USD/INR settlement and billing behavior, tax, receipts, fees, and the ₹59 margin. Show USD globally and fixed INR prices for India; verify the actual checkout currency, product, subtotal, and tax before redirecting. Do not trust a browser-selected market or displayed price as payment authority.
3. Deploy and verify the required payment and extra-credit schema/function migrations. Test RLS and grants, regenerate database types, and run security advisors. Complete the Dodo sandbox round trip for each plan and extra-jar credit: signed webhook, matching product/currency/amount, duplicate and out-of-order events, seat reservation, credit grant, invitation delivery, failure, cancellation, and reconciliation after an interrupted webhook. Only then add live-mode credentials/products and repeat with controlled live transactions.
4. Link each order, provider event, entitlement, and refund in an auditable ledger. For duplicate charges, verified delivery failures, or legally required refunds, Felix records the decision and Dodo processes the approved refund. Reconcile the provider's confirmed result before revoking the matching **unused** credit. Send any used-credit case to manual review; never automatically erase a recipient's gift. Publish processing-time wording only after Dodo confirms it.

**Exit evidence:** one successful and one failed/cancelled sandbox checkout per purchase type, a duplicate-webhook test with exactly one grant, a live checkout and refund reconciliation test before paid launch, and a balance that matches the ledger for every seat.

### Phase 3 — Three-year paid-Jar lifecycle and keepsakes

1. Define the recipient's “received” event as the instant a sealed jar first becomes available to that recipient in the service. The current seal function records `sealed_at` and `hosting_ends_at` together; verify this matches every recipient path, including late seat claims, before using it as the three-year start. Store and expose a per-Jar end time, never an account-wide expiry. Do not extend it.
2. Build an authorized keepsake download for the recipient while the paid jar is active. Include the promised readable letters and accessible media in a portable format, or finalize and state the format before implementation. Prevent one recipient from exporting another recipient's private content; give useful empty/error states when media is missing. Keep the export available until the jar's end time.
3. Send **one** email reminder seven days before each paid jar expires. Use a durable reminder record and idempotent job so retries do not send a second message. Use the verified sender, avoid private letter text in email, and record delivery/failure for admin review. The older admin portal plan mentions daily reminders in the final seven days; this document's later confirmed decision is one reminder at the seven-day mark.
4. Enforce expiry in database authorization and media delivery as soon as the end time passes, even if the cleanup job runs late. A scheduled worker then marks the jar ended and removes its live letter/media content and orphaned Storage objects, with bounded retries and an audit trail. Do not delete unrelated jars or the user's account. Clean abandoned upload reservations/orphan media on a separate short schedule.
5. Match the shelves, jar detail, reminder, keepsake screen, and public terms to the enforced state. Show the end date and a clear download action before expiry; after expiry, show a truthful ended state without opening private content.

**Exit evidence:** time-controlled tests for seven-day reminder, exact expiry boundary, retries, media denial, one-recipient isolation, export before expiry, and live-content deletion. An authenticated two-account browser check confirms the visible flow.

### Phase 4 — Support, privacy requests, retention, and admin operations

1. Extend the existing signed-in `/app/requests` intake and `/admin/requests` inbox. Show separate support, access, correction, export, deletion, refund, abuse, and other privacy queues; add owner, due date, customer-visible progress, internal notes, and an immutable action history. Felix is the launch owner and must be able to fulfill or resolve customer requests within 3–4 calendar days, subject to the still-open staffing and weekend questions.
2. Implemented in code: a signed provider-neutral intake route creates support-only tickets, stores the sender and message reference outside the exposed schema, deduplicates retries, limits each sender to five new tickets per 24 hours, and displays the ticket only through MFA-gated admin RPCs. After the production domain is chosen, create a dedicated support/privacy mailbox, connect a provider adapter, configure the webhook secret and mailbox spam filters, and publish the address. An email-only request may open a case, but account changes, export, correction, and deletion require the requester to sign in and submit through Account. Do not let an email link or sender address alone authorize a mutation.
3. Provide a documented manual launch runbook for access, correction, export, and deletion. Add a complete account-data export and a deletion workflow that revokes sessions, stops future access, removes live private jar content and Storage objects, and records completion evidence. Keep payment/accounting records only for the legally required period once that period is established; let encrypted backup copies age out within 30 days after live deletion. Do not mark a request resolved before the work is complete.
4. Add admin views for payment/refund reconciliation, expiring jars, reminder/cleanup failures, request deadlines, and backup health. Show “not configured” or “unknown” when a provider/job feed is absent. Keep routine views content-free and every privileged action server-authorized at the current AAL2 level.

**Exit evidence:** a signed-in user can submit and track each request; Felix can complete a sample case with an audit trail; email-only account-change attempts are refused; a staged account deletion removes live content and access without removing unrelated records.

### Phase 5 — Backups, restoration, and operational monitoring

1. On Supabase Free, schedule separate daily encrypted off-site copies of database/schema/required roles, Auth account mapping, and Storage objects. Keep 30 rolling daily copies in a separate secured account/provider with MFA and restricted access. Document exactly what each export contains, since a database dump alone is not a complete Auth or Storage backup.
2. Check every backup for completion, date, size, and checksum. Alert on any failed run or when the newest valid copy is older than 36 hours. Monitor failed webhooks, invitation and expiry emails, media jobs, expiry cleanup, and application errors without collecting third-party behavioral analytics. Keep necessary security/application logs for 90 days unless an incident requires longer.
3. Before paid launch, rehearse a restore into a clean project: database, Auth mapping, Storage sample, RLS, login, seat/credit balance, jar opening/expiry, keepsake export, and payment/refund reconciliation. Document the maintenance/write-stop and key-rotation steps. Repeat quarterly. Use the initial recovery targets of up to 24 hours of data loss and recovery within 24 hours; revisit a paid Supabase plan and PITR when usage requires stronger targets.

**Exit evidence:** 30-day rotation and freshness alerts are observed, and a dated full restore report shows the recovered app passes the key product and authorization flows.

### Phase 6 — Final deployment, policy alignment, and release gate

1. At the final launch step, choose the domain and hosting setup. Configure the production domain, HTTPS, Supabase site/redirect URLs, Google OAuth, Resend sender, Dodo live webhooks/products, and Vercel Functions in `sin1` (Singapore); verify the deployed region and provider behavior. Keep secrets in provider secret managers and keep Test Mode data and credentials separate from live sales.
2. Set the independent seller's legally required name, address/contact details, checkout identity, and receipt details privately. Verify Dodo's eligible countries and provider processing information. Review the founder-written Privacy Notice, Terms of Use, and Refund Policy against the **implemented** flows, provider contracts, and launch markets. Do not describe planned export, deletion, reminders, or refunds as live until they are. Obtain market-specific legal review where available; the current drafts are not lawyer-approved.
3. Complete the final approval checklist above: refund wording, contact details, support/abuse backup coverage, accounting-record retention, and legal wording. Run typecheck/build, database authorization and migration checks, Dodo sandbox and controlled live tests, backup restore, and two-account browser QA on desktop and mobile. Check loading, empty, error, success, and expired states. Record each result and block paid checkout if a required gate fails.

**Launch gate:** paid checkout opens only after live fulfillment/refunds, per-Jar expiry and keepsake, support/privacy handling, admin MFA, verified backups/restoration, production email, and the required seller/policy details all have evidence. The domain and hosting configuration happen last, but their deployed verification remains part of this gate.

### Decisions that remain open

- Exact public seller identity, address/contact details, production domain, and support/privacy mailbox.
- Final refund processing-time text and approved Refund Policy wording after Dodo confirmation; country-specific legal and age-assurance requirements.
- Accounting-record retention, final weekend/holiday support targets, backup reviewer/coverage, urgent abuse escalation criteria, and whether block/report controls are required at launch.
- The exact keepsake file format and any provider-specific operational details that cannot be confirmed until production setup. These do not change the confirmed requirement to provide a usable download before expiry.
