# Admin Portal Progress

Last updated: 2026-09-26

## 26 September follow-up

- A fresh read of the active `openwhenjar` Auth project now finds one confirmed, previously signed-in Google account for the intended administrator email. There are still zero admin roles and zero verified TOTP factors. This supersedes the earlier same-day account-absence check below; the role and MFA setup are not complete.
- A signed-in admin session at AAL1 now opens authenticator enrollment or challenge directly at `/admin`. Email OTP sign-in and the already signed-in path share the MFA setup logic, with a retry state if setup fails.
- `npm run test:admin` passes three focused access and dashboard-data tests. `npm run typecheck` and the production build pass. Signed-out `/admin` renders the sign-in page, while signed-out analytics, records, inbox, and case-history routes redirect to it.
- The current Supabase advisors were rerun. They report no new admin-specific finding beyond the intentionally authenticated, internally role-and-AAL2-checked admin RPCs. The other notices cover existing RLS-without-policy tables, leaked-password protection, one missing Dodo foreign-key index, and unused indexes.
- The Vercel CLI identity currently exposes only the excluded `ingenuity-insights-projects` team; `chris-b89f` is unavailable, so the intended deployment cannot be verified or performed from this identity.
- Dashboard sign-in through "Continue with ChatGPT" was stopped by automatic approval review because the intended Supabase login identity was unspecified. Hosted OTP-template and SMTP settings therefore remain unverified in the dashboard.

## Current status

The power center now also has `/admin/analytics`, paginated `/admin/records`, and an audited `/admin/requests` inbox with per-case history and category queues. Signed-in customers can submit support, access, correction, export, deletion, refund-review, abuse, and privacy requests at `/app/requests`; the Account section links there. The email-ticket schema migration is applied and the provider-neutral signed intake function is deployed to the active `openwhenjar` project. Local Admin Portal code displays sender, subject, and reference for email tickets; the web app still needs its normal deployment. These remain manual request records, not automated data export or deletion. The inbound mailbox/provider adapter, webhook secret, spam-filter configuration, and public support address are not configured yet.

The dashboard no longer presents mixed-currency order totals as USD revenue. Order rows format their own USD/INR amount, and the seven-day hosting shortcut filters by the actual expiry window. Jars, Orders, and People open the paginated record browser, which searches all matching rows instead of only the snapshot's latest 100.

The admin portal uses real Supabase data only. The sign-in screen now accepts an email address instead of predefining one. It sends and verifies the email OTP with the browser Supabase client, avoiding the local server-side `fetch failed` path.

Signing in is not enough by itself: the verified account must have `app_metadata.role = "admin"` and an MFA-backed AAL2 session. Both the Next.js route and the database dashboard function enforce those checks.

## Completed

### Promo codes (24 October, migration applied)

- `/admin/promos` lists codes with name, code, discount %, valid-till date (UTC), status, and used/cap. Admins can create codes and edit everything except the code itself. The page goes through the AAL2-gated, audit-logged `admin_list_promo_codes` and `admin_upsert_promo_code` RPCs. Migration `add_promo_codes` is applied to the `openwhenjar` project. The rolled-back SQL test passed, covering MFA denial, duplicate codes, the 15% → 679 price, single use per account, the cap, and expired and inactive codes.

### Administrator authentication

- Added an editable email field to `/admin`.
- Added browser-side Supabase `signInWithOtp` and six-digit `verifyOtp` handling.
- Set `shouldCreateUser: false`, so an OTP request cannot create arbitrary accounts.
- Added email validation, loading states, rate-limit messaging, invalid-code handling, and a "Use a different email" action.
- Successful verification checks the signed `app_metadata.role` claim before opening the portal.
- Removed the fixed email and fixed profile identity.
- Added TOTP authenticator enrolment for a first-time administrator and a challenge for returning administrators.
- The dashboard remains closed until Supabase upgrades the session to AAL2 after the authenticator code is verified.
- The dashboard uses the signed-in account's real profile, with the email prefix only as a display fallback.

### Real dashboard data

- Removed the development preview bypass and every generated admin KPI, jar, order, chart, and people record.
- `/admin?preview=1` behaves exactly like `/admin`.
- The portal loads only `admin_dashboard_snapshot()` output.
- Empty tables render real zero totals and empty states.

### Security and privacy

- Admin authorization uses `app_metadata`, which users cannot edit through normal client APIs.
- The database RPC independently requires the admin role and AAL2 before its `SECURITY DEFINER` queries run.
- The RPC is read-only, audited, revoked from `public` and `anon`, and granted only to authenticated users.
- Letter text, transcripts, private media, provider references, invitation tokens, and payment secrets remain excluded.
- 2026-10-30: Felix approved showing each account's login email on the People records list (searchable). Emails appear nowhere else in the admin portal.

## What to configure in Supabase

1. Create `felixondesk@gmail.com` as a normal Supabase Auth user. Use the app's account creation flow or Supabase Dashboard > Authentication > Users. The admin OTP form will not create the account, and the password must stay with Felix.
2. Assign the trusted admin role with Supabase's server-side Admin API, or run the following once in the Supabase SQL Editor after replacing the email:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || '{"role":"admin"}'::jsonb
   where lower(email) = lower('felixondesk@gmail.com');
   ```

3. In Authentication > Email Templates > Magic Link / OTP, include `{{ .Token }}` so the email contains the six-digit code.
4. When using Supabase's default test SMTP, add the address as a project-team-authorized recipient. For production or other addresses, configure custom SMTP.
5. Sign in again after assigning the role so the new JWT contains the updated `app_metadata`.
6. Scan the displayed QR code with an authenticator app and verify the current six-digit code. The admin dashboard migration is already applied.

## Verification completed

- 23 September: `npm run typecheck` and `npm run build` passed with the new routes.
- Supabase migration history contains `add_admin_request_inbox`, `add_admin_record_browser`, `add_admin_operational_analytics`, and `harden_admin_request_workflow`; `support_requests` has RLS, authenticated users cannot insert directly, and `anon` cannot execute the admin browser.
- Transaction-rolled-back AAL2 SQL calls returned paginated records, inbox rows, and seven-day analytics. An AAL1 call to the inbox RPC was denied with `ADMIN_MFA_REQUIRED`.
- A rollback-only flow submitted a request as an authenticated account, triaged it as an AAL2 admin, and returned two history events; a follow-up count confirmed zero test requests remained.
- Headless Chrome on the production build checked the signed-out admin gate at desktop/mobile widths, navigation to admin sign-in, and `/app/requests` redirecting signed-out users to `/auth`, with no console errors. Authenticated page and action QA still needs a real admin/customer session.
- A live Auth check on 24 September found the intended administrator account created, email-confirmed, and previously signed in. It has no admin role or verified MFA factor. Automatic approval review rejected assigning the role without exact privilege authorization and MFA evidence; real OTP/TOTP portal QA remains pending.
- A fresh live Auth check on 26 September found no account matching the intended administrator email, no admin role, and no verified MFA factor. The earlier account state has changed or was checked in a different context; reconfirm the account before provisioning. A signed-in non-admin Google account was denied at `/admin` in the local browser.
- Signed-out `/admin/analytics`, `/admin/records`, and request-inbox routes now redirect to the `/admin` sign-in screen; their signed-in role/MFA gate remains in place. Four local route checks and an in-app browser check passed on 26 September.
- Security and performance advisors were run after the inbox schema change. The authenticated `SECURITY DEFINER` notices include the intentionally exposed, internally role/AAL2-gated admin RPCs. Other notices include pre-existing RLS-without-policy and a Dodo test-intent foreign-key index.

- `npm run check` — TypeScript and the production build pass.
- Static scan found no remaining predefined email, fixed admin identity, or deleted admin server-action import.
- `npm run build` — passed with `/admin` as a dynamic route.
- In-app browser QA passed at `http://localhost:3127/admin`: editable email field rendered, the predefined address was absent, invalid-email submission was blocked, and no framework error overlay appeared.

## Pending before live use

### P0

- Complete the remaining Supabase configuration steps above.
- Receive and verify one real email OTP, then enrol and verify one real authenticator code.
- [x] Confirm an account without `app_metadata.role = "admin"` is denied (local browser, 26 September).
- Confirm the dashboard returns real data and writes one `private.admin_audit_log` row.

### P1

- Re-run Supabase security and performance advisors after the payment and retention migrations. The interim post-admin review is complete.
- Configure production SMTP and abuse protection before production launch.
- Add automated coverage for OTP state, role authorization, route denial, snapshot parsing, and content exclusion.

## Intentional limits

- No dummy or fallback dashboard data.
- No automatic admin account creation.
- No private letter or media access.
- No refund, deletion, role-edit, or payment-mutation controls.
- Request status changes record an internal note and actor in case history; they do not perform account deletion or export, send a customer email, or issue a refund. Submission is limited to five requests per account in a rolling 24 hours.
- Backup, expiry, keepsake, and production payment controls await their actual jobs/providers. Real administrator OTP/TOTP and browser flow tests remain pending.

## Recommended next step

Complete administrator role authorization and MFA enrolment, configure the OTP email template, then test email OTP plus authenticator MFA at `/admin`.
