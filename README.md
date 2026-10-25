# Open When Jar

A mobile-first digital gift app based on `Open-When-Jar-PRD.md`, with Supabase authentication and private username-based delivery.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3127`.

The app expects these public Supabase values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3127
RESEND_API_KEY=...
INVITATION_FROM_EMAIL=Open When Jar <hello@your-verified-domain.example>
DODO_PAYMENTS_TEST_API_KEY=...
# Production only: DODO_PAYMENTS_MODE=live_mode and DODO_PAYMENTS_API_KEY=<live key>
```

Database credentials are not used by the browser or Next.js application.
The Resend key stays server-side. During local development, `Open When Jar <onboarding@resend.dev>` can be used as the sender for Resend's test recipients and the email address associated with the Resend account. A verified sender domain is required before invitations can reach arbitrary users. Without all three invitation settings, the app shows a setup error and does not reserve a new seat.

## What is implemented

- Supabase email/password authentication with a unique public username for every account
- One-time plans for 1, 2, 3, 5, or 10 account seats; each member can send 10 Jars
- Username-based Circle requests, with one Jar sent to one accepted Circle member
- Emailed seat invitations that are claimed automatically when the invited account signs in with a confirmed matching email
- Automatic Circle connections between members of the same plan
- Authenticated shelves for jars a user has sent and received
- Atomic Jar creation and sealing through guarded Postgres functions
- Row-level security on every exposed table, including server-enforced date locks that keep locked letter bodies out of recipient responses
- Private Supabase Storage for one photo and one voice note per envelope; images are re-encoded to WebP at a maximum 1,600 px edge and voice recordings use a 32 kbps target with a 60-second limit
- Server-side media signature, dimension, MIME, and size checks, with authenticated no-store media streaming instead of public object URLs
- Opt-in generic desktop alerts for received jars and newly unlocked letters while Open When Jar is open in the browser
- Responsive landing page, seat-based plan choices, Jar reader, per-recipient favourites, themes, and reduced-motion behavior

## Production boundary

Authentication, profiles, jar credits, text letters, date locks, favourites, and sent/received shelves use the configured Supabase project. The SQL source of truth is `supabase/schema.sql`.

The plan screen runs in Dodo Test Mode by default. A signed `payment.succeeded` webhook delivered to `supabase/functions/dodo-test-webhook` grants a plan or extra Jar after confirming its product, currency, amount, and mode; `refund.succeeded`, `dispute.accepted`, and `dispute.lost` take unused entitlements back and mark the payment refunded, while partial refunds and anything already used are left as `needs_review` for an admin. The checkout session is created on the server; access is never granted from the browser return URL.

Test Mode uses `DODO_PAYMENTS_TEST_API_KEY` (app) and `DODO_PAYMENTS_TEST_WEBHOOK_KEY` (function secret). To go live, set `DODO_PAYMENTS_MODE=live_mode` on both, `DODO_PAYMENTS_API_KEY` on the app, and `DODO_PAYMENTS_WEBHOOK_KEY` on the function; one mode is active at a time. Dodo catalog IDs are stored per mode in `public.dodo_products`, so create the same six products in the live dashboard and insert their `live_mode` rows before live checkout works. Register the webhook endpoint `https://<project-ref>.supabase.co/functions/v1/dodo-test-webhook` in the matching Dodo dashboard with the four events above. The function gets its request-scoped admin client from `@supabase/server`; no database secret is added to the Next.js app. If group plans are purchased, also configure the Resend invitation secrets for the function so reserved seats are emailed.

`NEXT_PUBLIC_SITE_URL` is the app URL Dodo returns customers to after checkout. The local `.env.local` uses `http://localhost:3127`; before production, set it to the permanent public app URL. This is separate from Dodo’s merchant website field, which is part of merchant onboarding and is not needed to use Test Mode. Set `DODO_TEST_CHECKOUT_ENABLED=true` only in a production-hosted test deployment; local development does not need this flag.

Merchant approval, a real live checkout and refund rehearsal, reconciliation against Dodo's payment list, recovery tooling for `needs_review` payments, backups, deletion/export, malware scanning, and operational support remain follow-up work before a paid launch. Always-on web push when the site is closed requires a VAPID-backed push service and scheduled delivery; the current desktop alerts poll only while the authenticated site is open.

For a fresh database, apply `supabase/schema.sql` followed by the migrations in `supabase/migrations/` in filename order.
