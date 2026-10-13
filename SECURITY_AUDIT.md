# Security audit — 2026-10-12

## Fixed

- OAuth callback accepted slash-backslash and control-character redirects that URL parsing could resolve to another origin. Redirects now reject those characters and compare the parsed origin. Regression tests cover hostile and valid paths.
- Invitation and resend actions had no shared email budget. A private RLS-enabled database table and authenticated, ownership-checked RPC now allow one attempt per minute and ten per hour per sender. Failed sends consume a slot. The application fails closed when the budget cannot be checked.
- Payment webhook read the entire unauthenticated request before verifying the signature. It now limits streamed input to 256 KiB, rejects malformed UTF-8, and retains signature verification. Deployed as Edge Function version 3; live invalid-signature and oversized-body probes returned 401 and 413.
- Private media responses now include a sandbox CSP as defense in depth against active uploaded content.
- Enabled Supabase **Secure password change** and **Require current password when updating** in the live project's Email provider. Reopened the settings and confirmed both are enabled. Existing email confirmation and secure email change remain enabled.
- Resend domain transport changed from Opportunistic to Enforced TLS: messages fail if the recipient mail server cannot accept an encrypted connection.

## Verified

- Production dependencies: npm audit reported zero known vulnerabilities.
- Five security tests and three existing admin tests passed.
- TypeScript and Next.js production build passed.
- Database assertions passed inside a rolled-back transaction: initial email allowance, immediate retry rejection, hourly quota, expired-window reset, ownership rejection, anonymous rejection, and anonymous EXECUTE denial. No test emails were sent.
- Live public schema has no tables without RLS and no views. Media bucket is private with size and MIME restrictions.
- Existing RLS policies restrict letters, attachments and storage by membership, unlock date and hosting expiry.
- Privileged payment fulfillment and support intake RPCs deny anonymous and ordinary authenticated execution. Admin dashboard requires trusted app_metadata role plus AAL2.
- Production Vercel environment lists Resend and elevated database keys as server-side secrets; no .env files are tracked in Git. No credential values were revealed.

## Remaining limits and follow-up

- This targeted audit is not a guarantee that every vulnerability has been found. Full authenticated multi-user penetration tests, Google login, password recovery, and email delivery still need an end-to-end test with dedicated accounts.
- Leaked-password protection is unavailable on the current Supabase Free plan; enabling it requires Pro. CAPTCHA is disabled and requires a provider configuration plus app integration before it can safely be enabled.
- CSP still permits inline application scripts. A nonce-based CSP would require coordinated rendering changes and browser regression tests.
- Production auth allows exact local-development callback URLs alongside the production URLs. Use a separate development Supabase project before removing those callbacks.
- The payment integration is explicitly Dodo Test Mode; this audit does not make it a live-payment integration.
- Vercel contains unused integration-generated privileged database secrets. Review and remove them through the integration configuration after verifying that no external jobs depend on them.
- The authenticated SECURITY DEFINER RPC authorization review was continued on 2026-10-13 (below). These intentional RPC entry points still produce advisor warnings; do not revoke all RPC access indiscriminately.

## Deployment

- Database migration applied to project saplipdgsbpwlgxyhxjg.
- Webhook version 3 deployed and verified.
- Web application commit 507e743 is Ready and Current in Vercel Production, assigned to openwhenjar.bond. Deployment: B6Cd79naLJrYU4gfA4SSQPESTGag.
- Live smoke checks: / and /auth returned 200; /app redirected to /auth; unauthenticated notifications and media APIs returned 401. Responses include DENY framing, nosniff, and no-store caching.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/password-security
- https://github.com/supabase/auth/blob/master/internal/api/user.go

## Follow-up audit — 2026-10-13

### Fixed and applied to the live database

- `send_circle_request` allowed accounts without a plan to bypass the plan requirement enforced by Circle search and the workspace. A synthetic authenticated-role test reproduced the bypass before the fix. The RPC now checks plan membership before looking up or contacting another account. Existing recipients can still accept incoming requests.
- `create_jar_with_first_envelope` checked the three-draft quota without serializing concurrent calls. It now takes a transaction-scoped advisory lock per creator before counting and inserting drafts. The sequential quota boundary passed; a simultaneous multi-connection stress test was not run.
- Migration `20261013044552_security_rpc_authorization.sql` was applied to `saplipdgsbpwlgxyhxjg`, and its local version matches the live migration history. The application has a corresponding friendly plan-required error message, pending web deployment.

### Verification

- `supabase/tests/authorization.sql` creates three synthetic accounts and rolls back every write. It passed against the patched live database using `SET LOCAL ROLE authenticated`, rather than relying on the SQL executor's privileged role.
- Tests cover unpaid Circle rejection, paid request success, sender self-acceptance rejection, recipient acceptance, three-draft quota, creator draft access, unrelated-user jar access and sealing rejection, recipient unlock/expiry restrictions for letters and attachment metadata, and recipient state writes.
- All six admin RPCs reject both user-editable admin metadata and a trusted admin role without AAL2. Anonymous execution of public SECURITY DEFINER functions is denied; payment fulfillment and reminder claiming deny ordinary authenticated execution.
- Reviewed the 20 authenticated public SECURITY DEFINER entry points: admin access uses trusted app metadata plus AAL2; invitation operations use ownership or confirmed account email; profile claiming uses caller identity; checkout and jar mutations use caller ownership and plan/credit enforcement; Circle responses require the addressee; support submissions enforce caller identity and a daily quota. No dynamic user-supplied SQL was found in these definitions.
- Five security tests, three admin tests, TypeScript, and the production build passed. The build required a retry outside the filesystem sandbox after an EPERM on generated output. `npm audit --omit=dev` reported zero known vulnerabilities.
- Advisors still report 20 intentionally authenticated SECURITY DEFINER RPCs, six RLS tables without policies (deny-by-default internal state), and disabled leaked-password protection. See [RPC advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### Still pending

- User confirmed no CAPTCHA provider is configured. Create a Turnstile or hCaptcha site for the production domain, store its secret in Supabase Auth, integrate token acquisition into the auth forms and adjust CSP, then enable CAPTCHA and test signup/login/recovery together. No secret should be pasted into chat.
- Leaked-password protection remains disabled; the prior audit found it unavailable on the current Free plan. No paid upgrade was performed.
- Browser-based Google login, recovery email delivery, password reset, real media downloads, and concurrent abuse testing remain unverified by this SQL suite. It tests database authorization, not complete browser/provider flows.
- The earlier CSP, development callback, unused Vercel integration-secret, and Dodo Test Mode follow-ups remain open. Circle-request rate limiting is also not established by the plan gate.
- The two database fixes are already live. Source, regression tests, and this report are included in the follow-up security release.

### Browser and release follow-up — 2026-10-13

- Production Google sign-in reached Google's account chooser. The user selected their account, and the callback returned successfully to `/app/unlock`. The authenticated account page loaded the profile and correctly identified the Google-only account as having no email password to update.
- Visiting `/auth/reset-password` with that ordinary Google session displayed “Reset link unavailable” rather than a password-change form. The recovery request form also loaded. Email delivery and successful password recovery still require an email/password test account and the user's completion of any password change.
- Supabase's live Email settings confirm leaked-password protection is only available on Pro and above; the organization remains Free. Secure email change, secure password change, and current-password requirements remain enabled.
- Cloudflare requires sign-in before a Turnstile widget can be created. CAPTCHA remains disabled until provider configuration and app integration can be completed together.

### Turnstile integration — 2026-10-13

- User created a Managed Turnstile widget restricted to `openwhenjar.bond`. Its public site key is in `lib/captcha.ts`; the secret is not stored in the repository.
- Sign-in, signup, and recovery-request forms now render a shared widget, disable submission until a token exists, clear expired tokens, and refresh verification after a returned action result. Loading failures have a retry control.
- Server actions reject missing, malformed and oversized tokens, then pass the token to Supabase Auth for provider verification. CSP permits only the required Cloudflare script and frame origin.
- Six security tests, three admin tests, TypeScript, and the production build passed. Supabase enforcement and live browser verification are pending the deployment and credential-transfer approval.
