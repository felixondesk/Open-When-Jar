# Security audit — 2026-10-12

## Fixed

- OAuth callback accepted slash-backslash and control-character redirects that URL parsing could resolve to another origin. Redirects now reject those characters and compare the parsed origin. Regression tests cover hostile and valid paths.
- Invitation and resend actions had no shared email budget. A private RLS-enabled database table and authenticated, ownership-checked RPC now allow one attempt per minute and ten per hour per sender. Failed sends consume a slot. The application fails closed when the budget cannot be checked.
- Payment webhook read the entire unauthenticated request before verifying the signature. It now limits streamed input to 256 KiB, rejects malformed UTF-8, and retains signature verification. Deployed as Edge Function version 3; live invalid-signature and oversized-body probes returned 401 and 413.
- Private media responses now include a sandbox CSP as defense in depth against active uploaded content.
- Enabled Supabase **Secure password change** and **Require current password when updating** in the live project's Email provider. Reopened the settings and confirmed both are enabled. Existing email confirmation and secure email change remain enabled.

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
- Supabase advisor warnings for authenticated SECURITY DEFINER RPCs require function-by-function authorization review; these are not automatically public data leaks. Do not revoke all RPC access indiscriminately.

## Deployment

- Database migration applied to project saplipdgsbpwlgxyhxjg.
- Webhook version 3 deployed and verified.
- Web application changes deploy through the existing GitHub main → Vercel production integration. Check the deployment commit before considering the application fixes live.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/password-security
- https://github.com/supabase/auth/blob/master/internal/api/user.go
