# Open When Jar — Progress and Production Readiness

Last reviewed: 26 September 2026

## One-time seat plan redesign (live database rules, local app changes)

- Plans now represent 1, 2, 3, 5, or 10 account seats for a single payment. Each member has 10 Jars, and each Jar goes to one accepted Circle member.
- The owner can invite members by email. An invited account with a confirmed matching email claims the seat on login; members of one plan join each other’s Circle automatically.
- The Send workspace shows the Circle empty state and per-member Jar balance. Received is grouped by sender, then Jar. The demo still sends to self and shows the recipient Jar without a size choice.
- The Circle and one-time seat migrations were applied to the live Supabase project on 21 September 2026. The earlier transaction-only database flow checks passed; authenticated browser flow checks remain pending.
- Invitation email code uses Resend but needs a verified sender, API key, and site URL before it can send. Dodo checkout is wired to Test Mode; no live payments are enabled.

## Current status

The application is **not ready for a paid production launch**. The Dodo Test Mode migrations and webhook are active in the current Supabase project, and one test payment intent is recorded as succeeded; this is not proof of a complete, independently observed sandbox round trip. The previously documented `@jar_*_test` profiles are absent as of 26 September. Live payments, admin MFA, content deletion/recovery, production authentication, and full authenticated browser testing remain incomplete.

Deployed 23 October 2026 to Vercel project `open-when-jar` (team Ingenuity Insights, region sin1) at https://open-when-jar-eight.vercel.app with only the public Supabase vars and `NEXT_PUBLIC_SITE_URL` set. Still to do for that host: **Felix** adds it to the Supabase Auth URL configuration and the Turnstile hostnames, adds the Dodo/Resend server secrets in Vercel, and grants the Vercel GitHub app access to `felixondesk/Open-When-Jar` so pushes deploy automatically. **23 October 2026 check:** pushing `eea0a80` triggered a Vercel deployment, but it landed in a different Vercel team (`chris-b89f`), not the `ingenuity-insights` project behind the production URL, so production was not updated by the push. **Felix:** point the GitHub integration at the `open-when-jar` project in the Ingenuity Insights team (or remove the other team's connection), then redeploy; until then, deploy with `vercel --prod` from the linked folder.

Do not add passwords, API keys, webhook secrets, database passwords, or OAuth client secrets to this file.

## Completed

### Product and interface

- [x] Consistent Open When Jar branding and top logo.
- [x] Landing page without the old “Make a jar” and “Open a sample” actions.
- [x] Account-first journey: the included free jar is available only after login.
- [x] Username-based profiles and recipient lookup; email is used only for authentication.
- [x] Sent and received jar shelves for each user.
- [x] Five one-time jar sizes:
  - One Heart — 1 recipient — US$7.99
  - Two Hearts — 2 recipients — US$14.99
  - Close Circle — 3 recipients — US$19.99
  - Family Circle — 5 recipients — US$29.99
  - Big Heart — 10 recipients — US$49.99
- [x] Multi-recipient jar creation with plan-specific recipient limits.
- [x] Per-recipient opening and favourite state.
- [x] Scheduled unlock dates enforced by the database, not only by the browser clock.
- [x] Responsive desktop and mobile layouts for the landing page and plans.
- [x] Redesigned sending flow as five numbered steps: "Open when…" is now a dropdown of moments with a write-your-own option, theme choice updates a live recipient-view preview instantly (recipient, cover note, and first envelope reflect the form), and the first letter and cover note are merged into one stationery section.
- [x] Redesigned sent/received shelves: theme-tinted cards, status pills (draft/sent/received/hosting ended), plan and envelope meta, and a clearer action hierarchy.
- [x] Redesigned the payment screen to show only the plans and the payment ask (plan selection, price summary, primary CTA). A single "View demo" link redirects to `/app/demo`, a dedicated client-side-only demo page offering Send or Receive; the send path addresses the demo jar to the user's own username and the receive path renders sample envelopes with favourites and a locked letter. The demo writes nothing to the database.
- [x] 21 September 2026 keepsake-studio pass: payment now leads with the one-time completion action while keeping View Demo visible; the sender composer uses a shared stationery treatment for the first letter and cover note; and the demo Send, sent confirmation, and Receive surfaces share a polished responsive visual system.
- [x] 23 September 2026 Dodo sandbox integration: the plan and extra-Jar screens create hosted Test Mode sessions; a signed, idempotent webhook grants test-only entitlements after product/currency/amount checks. Seat invitations are reserved on fulfillment and emailed from the Edge Function when delivery is configured. The Test Mode migrations and webhook are active in the current Supabase project; no live payment path exists.
- [x] 23 October 2026 SEO baseline: `metadataBase` from `NEXT_PUBLIC_SITE_URL`, Open Graph/Twitter tags and canonical URLs on the public pages, `/robots.txt` (disallows `/app`, `/admin`, `/api`, `/auth`), `/sitemap.xml` for the landing and legal pages, and Organization/WebSite/WebApplication JSON-LD on the landing page. The square brand mark is used as the share image; a 1200×630 Open Graph image is still to be designed.

- [x] 24 October 2026 promo codes (migration `add_promo_codes` applied to the `openwhenjar` project on 24 October; the web app still needs deploying): admins create and edit percentage codes (1–99%, valid-till date in UTC, active/inactive, total-use cap) at `/admin/promos`; the plan checkout has an optional code field. The database validates the code, enforces one use per account and the cap, and stores the discounted price on the intent. The checkout action mirrors it into a single-use Dodo discount, so the webhook's existing amount check covers discounted payments. Plans only; extra Jars do not accept codes. The migration also pins the correct extra-Jar Dodo product id. The live project was already correct, but replaying the local files in filename order ended on `20260923150020`'s wrong id. `npm run check` passes. `supabase/tests/promo_codes.sql` passed against the live project inside a rolled-back transaction, which left no fixture rows. The security advisor reported nothing new: the new RPCs carry the same intended signed-in SECURITY DEFINER notice as the existing ones. A sandbox checkout with a code has not been run yet.

### Authentication and database

- [x] Supabase email/password authentication and email-confirmation callback.
- [x] Immutable unique usernames and display names.
- [x] One included One Heart credit created for a new account.
- [x] Private creator/recipient access through Row Level Security.
- [x] Draft recipients remain hidden until the jar is sealed.
- [x] Server-authoritative plan prices and recipient limits.
- [x] Atomic jar creation and sealing database functions.
- [x] Private media storage and authorized media delivery.
- [x] Private, expiring admin provisioning records for accounts created through Supabase Studio.
- [x] A separate `test` credit source so QA access does not appear as paid revenue.
- [x] Google sign-in UI, OAuth callback handling, and a one-time username selection flow are implemented in code.

### Media and notifications

- [x] Browser image compression before upload.
- [x] Voice-note recording limited to 60 seconds and compressed by the browser-supported codec.
- [x] Server-side 1.5 MB processed-file limit and media-type validation.
- [x] Desktop notifications for received jars and unlocked letters while the authenticated site is open.
- [x] Service worker and web-app manifest.
- [x] 24 October 2026 transactional email: database triggers queue rows in `private.email_outbox`; the `send-emails` Edge Function sends them through Resend every minute. Emails cover: jar received, letter unlocked, recipient opened your jar, 7-day expiry reminder, hosting ended, Circle request/accepted, support received/reply/status (one email when a reply also changes status), password/email changed, welcome (after email confirmation), and new-registration alerts to hello@. Letter text, labels and media never enter an email. Live in production.
- [x] 24 October 2026 hosting expiry: `expire_jars_batch` runs hourly (deletes letter content at hosting end; earliest jar ends September 2029). Unlock and expiry-reminder emails are queued by `enqueue_scheduled_emails` every 5 minutes.
- [x] Expired media: `send-emails` removes Storage objects listed in `private.expired_media_cleanup` each minute (migration `20261024183717_expired_media_cleanup`, live in production). The unused `jar-expiry-reminder` function, its RPCs and queue table are removed; delete the deployed function from the Supabase dashboard.

### Test accounts

- [ ] Identify or create two designated disposable test accounts. The earlier `@jar_creator_test` and `@jar_recipient_test` profiles are absent from the live project on 26 September.
- [ ] Confirm their non-billable test credits and arrange sign-in without sharing passwords or one-time codes in chat.
- [ ] Verify both accounts can sign in in separate browser sessions.
- [ ] Run a complete creator-to-recipient jar exchange using these accounts.

### Verification completed

- [x] `npm run check` passes: TypeScript and the Next.js production build.
- [x] 20 September 2026 redesign pass: `npm run check` passes; verified in Chrome with Playwright at 1440 px and 390 px — form steps, moment dropdown, instant theme preview, a real draft creation through the new form, the shelf card, the payment screen, and the full demo flow (send-to-self and receive paths, envelope opening, favourites). Only console error is a pre-existing missing `favicon.ico` (404).
- [x] 21 September 2026 keepsake-studio pass: `npm run check` passes; static route smoke checks confirm the public page remains 200 and protected `/app/demo` and `/app/unlock` routes still redirect unauthenticated visitors to `/auth`. Authenticated visual QA was not rerun because no logged-in browser session was available in this task.
- [x] Landing page checked at desktop and 390 px mobile widths without horizontal overflow.
- [x] Landing browser console had no errors or warnings during the completed visual QA.
- [x] Database transaction tests covered multi-recipient creation, free-credit sealing, recipient visibility, and rollback.
- [x] Earlier live verification confirmed two test profiles and their test-credit rows; the named profiles were no longer present on 26 September. Recheck credits after designating replacement test accounts.
- [x] Google username-onboarding and hardened admin snapshot migrations are applied to the current Supabase project.
- [x] Supabase Security and Performance Advisors were reviewed again on 26 September. They report 19 authenticated `SECURITY DEFINER` RPCs (none executable by `anon`; each contains an `auth.uid()` check), five service-only tables with RLS and no policies, disabled leaked-password protection, one missing Dodo intent foreign-key index, and six unused indexes. These findings still need a final release review.
- [x] 26 September: `npm run check` passed; a local production server returned CSP, HSTS, frame, referrer, permissions, and MIME-sniffing headers. HTTPS deployment headers remain unverified.
- [x] 26 September: the existing Two Hearts sandbox payment matched between Dodo and the succeeded Supabase intent on status, product, currency, and paid total. The Extra Jar USD/INR previews matched the displayed prices. A new checkout round trip remains pending.
- [x] 26 September: Google Auth was enabled and reached the first-login username screen in the browser. An existing Google session created one confirmed account with an unfinished profile; no username or age confirmation was submitted. A signed-in non-admin account was denied at `/admin`.
- [x] 26 September: checkout-return messaging no longer claims payment success from a redirect or an unrelated active plan; desktop letter notifications no longer include envelope labels.
- [x] 26 September: signed-out admin subpages route to `/admin` sign-in instead of showing a misleading MFA-required screen; four local route checks passed.
- [x] 26 September: Vercel access was rechecked. The connector returned 403 for the approved `chris-b89f` scope, while the installed CLI identity lists only the explicitly excluded `ingenuity-insights-projects` team. No deployment was attempted or verified.

## Decisions recorded

- [x] 22 September: one-time plan prices are USD $7.99/$14.99/$19.99/$29.99/$49.99 globally and fixed INR ₹399/₹699/₹999/₹1,499/₹2,499 in India. Extra Jars are $1.99 or ₹59 each, owned by the buying seat. Listed prices exclude applicable tax.
- [x] Public plans and the test checkout now display the selected USD or INR price and the approved extra-Jar terms. Currency selection is display-only until Dodo checkout is connected.
- [x] The later `add_dodo_test_payments` migration created live `extra_jar_credits` and test-only allowance spending. The earlier `supabase/extra_jar_credits.sql` is an obsolete local draft; its previous rejection does not describe the current schema. Live-mode purchase and refund behavior remain unimplemented.
- [x] Start on the current Supabase Free plan; defer a paid plan and PITR until usage or recovery needs justify them.
- [x] Keep sealed Jars for three years from sealing; unused credits remain valid while the account is active. RLS now stops letter/media access at the deadline; a recipient keepsake download is implemented locally. The reminder queue and Edge Function are deployed but need sender/scheduler configuration. Automatic content deletion remains blocked pending approval and a restore path.
- [x] Use the current Supabase project for production.
- [x] Felix selected `felixondesk@gmail.com` as the intended administrator account. The 24 September check found it confirmed, but the 26 September live check found no matching Auth account and no admin role or verified MFA factor. Reconfirm the intended account before provisioning; automatic approval review previously rejected the role assignment without exact privilege authorization and MFA evidence.
- [x] Include the admin portal at launch, protected by an admin role, MFA/AAL2, and audited content-free queries.
- [x] Use Resend through Supabase custom SMTP for production authentication email.
- [x] Leave the production domain and hosting-provider choice until the final launch step.
- [x] Business, legal, operational, refund, and retention questions are collected in `NEED_TO_BE_DISCUSSED.md`.

## Pending before production

### P0 — Launch blockers

- [ ] **Felix:** Complete Dodo Payments merchant approval and confirm that this digital product, countries, settlement currency, refunds, taxes, and final fees are supported.
- [x] **Felix:** Create Dodo Test Mode products for the five seat plans and extra Jar credit.
- [ ] **Felix:** Create a code at `/admin/promos` and complete one sandbox plan checkout with it (migration and SQL test are done). Check that Dodo's discount line matches the price shown in the app.
- [ ] **Felix:** Add the Test Mode API key to the local server environment; deploy the migration and Edge Function, then set the Dodo webhook and invitation-email secrets in Supabase. Confirm Dodo's INR pricing/adaptive-pricing configuration before testing India checkout.
- [x] **Codex:** Implement Test Mode hosted checkout, signed webhook verification, idempotent test fulfilment, and test-only plan/extra-Jar grants.
- [x] 25 October 2026 live-mode payment path (migration `20261025090000_add_dodo_live_mode` is local; applying it to the live project was blocked by the tool permission, so **Felix** applies it, then redeploys `dodo-test-webhook`, in that order, since the new fulfilment signature takes a mode): `DODO_PAYMENTS_MODE=live_mode` with `DODO_PAYMENTS_API_KEY` (app) and `DODO_PAYMENTS_WEBHOOK_KEY` (function) switches both to Dodo live; test mode stays the default and still reads the old `*_TEST_*` names. Catalog IDs now live in `public.dodo_products` per mode; checkout refuses with `PRODUCT_NOT_CONFIGURED` until the six `live_mode` rows are inserted. Live fulfilment grants `paid` plans and credits, and extra Jars sealed on a paid plan record `paid` entitlement. `refund.succeeded`, `dispute.accepted`, and `dispute.lost` revoke unused entitlements (extra credit marked refunded; an unused plan and its allowance deleted) and mark the intent `refunded`; partial refunds or anything already used go to `needs_review` for a human. `supabase/tests/dodo_live_mode.sql` passed against the live project inside a rolled-back transaction together with the migration. `npm run check` passes.
- [ ] **Felix:** Create the six products in the Dodo live dashboard with the same USD/INR prices, insert their IDs into `public.dodo_products` as `live_mode` rows, register the live webhook (`payment.succeeded`, `refund.succeeded`, `dispute.accepted`, `dispute.lost`) and set the three live env values above. Then run one real low-value checkout and one refund end to end.
- [ ] **Codex + Felix:** Test the sandbox payment and webhook round trip; reconciliation (comparing Dodo's payment list with intents) and recovery tooling for `needs_review` intents are still missing before a paid production launch.
- [ ] **Felix (final launch step):** Choose the production domain and hosting provider, then configure DNS.
- [x] **Felix:** Use the current Supabase project as production. Before launch, remove or clearly isolate test data and keep all secret keys in the deployment secret manager.
- [ ] **Codex:** Configure production environment variables, Supabase site URL, allowed redirect URLs, and the deployment pipeline. Secure response headers are implemented in code and still need deployed verification.
- [ ] **Codex:** Run the full authenticated two-account browser journey for every critical permission boundary.
- [ ] **Codex:** Add automated tests for authentication, RLS boundaries, unlock times, plan limits, payment transitions, duplicate webhooks, and media authorization.
- [ ] **Felix + Codex:** Finish the unchecked decisions in `NEED_TO_BE_DISCUSSED.md`, including refund wording, seller identity, privacy policy, terms, and support contact. Prices and hosting duration are confirmed.
- [x] 23 October 2026: Terms, Privacy Notice, and Refund Policy rewritten as production versions (pre-launch banner removed). Seller shown as Dodo Payments Merchant of Record with no personal details; contact is hello@openwhenjar.bond; Cloudflare Turnstile, Vercel hosting, keepsake download, breach notice, liability cap, and retention periods added. Still blocked: export/deletion requests have no admin tooling (the `test_mode` hard-coding was removed on 25 October).

### Google login

- [ ] **Felix:** Create/configure the Google Cloud OAuth consent screen and Web OAuth client.
- [ ] **Felix:** Add the Supabase Google callback URL to Google’s authorized redirect URIs and add the client ID/secret to Supabase Auth.
- [ ] **Felix:** Add the production domain and localhost URLs to Supabase URL Configuration as appropriate.
- [x] **Codex:** Add “Continue with Google,” callback/error handling, and a first-login username selection screen. Google authentication alone does not provide the required unique Open When Jar username.
- [x] **Codex:** Apply and verify the Google username-onboarding migration in the live project.
- [ ] **Codex:** Test new Google signup, returning login, cancelled consent, duplicate email/identity linking, and username collision behavior.

### Security, privacy, and operations

- [ ] **Felix:** Use the current Supabase Free plan initially. Upgrade when needed for production capacity or recovery; review leaked-password protection when the paid tier is enabled.
- [ ] **Felix + Codex:** Set up daily encrypted off-site database/Auth/Storage backups with 30-day rotation, alert on stale or failed backups, and complete a restore rehearsal before paid launch.
- [x] **Codex:** 23 October 2026 app security audit: upgraded Next.js 16.3.8 → 16.4.2 (clears the critical image-optimization/`use cache` RCE and Server Actions DoS advisories; `npm audit` is clean) and made `/auth/google` derive its OAuth redirect origin from the allow-listed `getAuthOrigin` helper instead of raw Host/Origin/Referer headers. `npm run check` passes.
- [ ] **Codex:** Run a final Supabase security/performance advisor review after the payment and retention migrations. An interim post-auth/admin review is complete.
- [ ] **Codex:** Verify the implemented CSP, HSTS, framing restrictions, Referrer-Policy, Permissions-Policy, request limits, and production-safe error responses on the deployed HTTPS site.
- [ ] **Codex:** Add stronger upload inspection/malware handling and cleanup for abandoned upload reservations.
- [ ] **Codex:** Implement account deletion, jar deletion, data export/keepsake rules, and documented retention cleanup.
- [ ] **Felix:** Configure automated database/storage backups and define the retention period.
- [ ] **Codex + Felix:** Perform and document a restore rehearsal before accepting payments.
- [x] **Felix:** Select Resend as the preferred production SMTP provider for Supabase Auth.
- [ ] **Felix:** Verify a sending domain in Resend and add its SMTP credentials to Supabase Auth.
- [ ] **Codex:** Add monitoring for application errors, failed webhooks, failed media processing, notification failures, and expiring hosting.
- [ ] **Felix + Codex:** Finalise the responsibility table in `NEED_TO_BE_DISCUSSED.md` for refunds, failed delivery, abuse reports, backups, and account recovery.

### Notifications and delivery

- [ ] **Codex:** Add VAPID-backed Web Push plus scheduled delivery if notifications must work while the site is closed.
- [ ] **Codex:** Add an explicit share/copy-link delivery flow without silently emailing recipients.
- [ ] **Codex:** Ensure notification titles/previews never reveal private letter content.

### Admin portal

- [x] A content-free, read-only admin dashboard implementation exists locally.
- [x] **Felix:** Include the admin portal in the first production release.
- [x] **Codex:** Harden the admin gate to accept any explicitly assigned `app_metadata` admin account and require an AAL2/MFA session; no personal email is hardcoded.
- [x] **Codex:** Apply the hardened, content-free admin snapshot and audit migration to the current Supabase project.
- [x] **Codex:** Add TOTP MFA enrolment and returning-admin challenge flows.
- [x] **Codex:** Add first-party operational analytics, paginated metadata browsing, and a signed-in support/privacy/refund-review request inbox with category queues and audited admin status history. The request migrations are applied to the current Supabase project. Request handling is manual and performs no account export, deletion, or refund.
- [x] **Codex:** Add provider-neutral, HMAC-signed inbound support email intake with sender throttling, duplicate delivery protection, private sender metadata, and AAL2-gated display in the Admin Portal.
- [ ] **Codex + Felix:** Connect an inbound-mail provider adapter, set the webhook secret and mailbox spam filters, publish the support address after the production domain is chosen, and verify the Account/email-to-inbox flows in customer and AAL2 admin sessions.
- [ ] **Felix:** Create or confirm the Supabase Auth account for `felixondesk@gmail.com` without sharing its password, then tell Codex the account is ready.
- [ ] **Codex:** Assign the admin role to that account through the protected provisioning path and test real email OTP, TOTP, access denial, and audit logging.

### Final QA and release

- [ ] Test Chrome, Edge, Safari/iPhone, and Android Chrome, including installed-PWA behavior.
- [ ] Test microphone permissions, image/audio compression, slow networks, upload cancellation, expired sessions, and browser storage restrictions on physical devices.
- [ ] Test accessibility: keyboard-only use, focus order, screen-reader labels, contrast, zoom, and reduced motion.
- [ ] Test the real Dodo sandbox checkout and webhook from start to finish before enabling live mode.
- [ ] Run a limited internal beta with non-sensitive content and review logs, storage growth, notification behavior, and support questions.
- [ ] Complete a go/no-go review against the P0 checklist before making checkout public.

## Recommended next sequence

1. Identify or create two designated test accounts, confirm test credits, and verify both sign-ins.
2. Run the complete free/test-credit jar exchange in two browser sessions.
3. Complete Felix's Google provider setup from `AUTH_PROVIDER_SETUP.md`, then test Google login and username onboarding.
4. Deploy and run the Dodo sandbox checkout and webhook round trip.
5. Finish recovery, deletion/export, backups, monitoring, and security headers.
6. Deploy a password-protected staging build and complete cross-browser/device QA.
7. Complete legal/business approvals and a production go/no-go review.
