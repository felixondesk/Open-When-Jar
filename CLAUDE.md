# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Open When Jar is a mobile-first digital gifting app: a creator fills a jar with letters, photos, and voice notes ("Open when you miss me"), pays a one-time price for the jar size, and sends it to 1–10 registered recipients by username. Personal project owned by Felix. Stack: Next.js 16 (App Router, Turbopack) + React 19 + Supabase (Auth, Postgres with RLS, Storage) + TypeScript strict. No Tailwind and no component library — all styling lives in `app/globals.css` as custom classes, with fonts from `@fontsource`.

## Commands

```bash
npm install
npm run dev
npm run check      # tsc --noEmit + next build — the standard verification command
npm run typecheck  # tsc --noEmit only
npm run build && npm start
```

There is no test framework or linter; `npm run check` is what the progress docs treat as "passing".

Environment: `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (database/service keys are never used by the browser or Next.js app). `NEXT_PUBLIC_SITE_URL` is used for auth and checkout redirect origins. `DODO_PAYMENTS_MODE` (`test_mode` default, or `live_mode`) picks the Dodo environment; the app reads `DODO_PAYMENTS_API_KEY` (falling back to `DODO_PAYMENTS_TEST_API_KEY` in test mode) and the webhook function reads `DODO_PAYMENTS_WEBHOOK_KEY` (falling back to `DODO_PAYMENTS_TEST_WEBHOOK_KEY`). Catalog product IDs live in the `public.dodo_products` table per mode, not in code. The signed webhook uses `@supabase/server` and its request-scoped `supabaseAdmin` client for fulfillment. Dodo Test Mode does not require the merchant website field; set `NEXT_PUBLIC_SITE_URL` to the app URL used for checkout return redirects, then switch to the permanent public URL before launch.

Supabase URL Configuration points at `http://localhost:3127` (see `AUTH_PROVIDER_SETUP.md`), so auth email/OAuth callbacks and local checkout returns expect the dev server on port 3127.

## Working workflow — read the root markdown docs first

This repo is run through living documents at the root, not just code:

- `PROGRESS.md` — the master checklist of what's done and what's pending, with tasks split between **Felix** (the human owner) and **Codex** (the AI coding agent — that's you). Consult it before picking up work and record completed items there.
- `Open-When-Jar-PRD.md` — the product spec (scope, boundaries, pricing intent).
- `NEED_TO_BE_DISCUSSED.md` — open business/legal/ops decisions for Felix.
- `AUTH_PROVIDER_SETUP.md`, `ADMIN_PORTAL_PROGRESS.md` — provider setup steps and admin portal state.

Never add passwords, API keys, webhook secrets, or OAuth secrets to these files, the repo, or chat.

## Architecture

### Auth and session (Supabase SSR)

- `proxy.ts` at the root (Next 16's middleware replacement) delegates to `lib/supabase/proxy.ts:updateSession()`, which refreshes auth cookies on every request.
- Two clients, both typed by `lib/supabase/database.types.ts`: `lib/supabase/server.ts` (RSC/server actions) and `lib/supabase/client.ts` (browser).
- Routes: `/auth` (email/password + Google sign-in via server actions in `app/auth/actions.ts`), `/auth/callback` (PKCE code exchange; redirects to `/auth/username` when `profiles.username_finalized` is false — Google logins must pick a username on first login), `/auth/username`.
- **Usernames, not emails, are the delivery identity.** Usernames are unique, immutable, citext, and must match `^[a-z][a-z0-9_]{2,29}$`. Email is only for account access. Recipient selection is by username lookup.

### App routes

- `/` public landing; everything under `/app` and `/admin` is `force-dynamic` + `noindex` and redirects to `/auth` without claims.
- `/app` — dashboard: sent/received shelves, credit balance, new-jar form.
- `/app/jars/[id]` — jar reader with creator/recipient views. Locked envelopes render no body because RLS keeps `envelope_contents` rows from recipients until the DB-enforced unlock time; the page just checks whether content came back.
- `/app/unlock` — payment boundary page. Checkout uses server-created hosted Dodo sessions in the configured mode, and a signed webhook handled by `supabase/functions/dodo-test-webhook` grants access (`paid` entitlements in live mode, `test` in test mode) and revokes unused entitlements on full refunds and lost disputes. The function name is historical; it serves both modes.
- `/admin` — admin portal. Gate is in `lib/admin.ts:getAdminAccess()`: requires `app_metadata.role === "admin"` AND `aal === "aal2"` (TOTP MFA). All data comes from the content-free `admin_dashboard_snapshot()` Postgres function; it never exposes letter text, media, or emails.
- `/api/media/[id]` — authenticated, no-store proxy that streams private Storage objects (with HTTP Range support); media is never exposed via public object URLs.
- `/api/notifications` — polled events (received jars, newly unlocked envelopes) for the in-browser `NotificationCenter`; previews must never reveal letter content.

### Database is authoritative

`supabase/schema.sql` plus `supabase/migrations/` (applied in filename order) is the SQL source of truth. Security is server-side by design:

- Jar creation and sealing go through guarded Postgres functions `create_jar_with_first_envelope` and `seal_jar` (atomic, credit-checked, plan-limit-checked).
- Every exposed table has RLS; draft recipients stay hidden until sealing; locked letter bodies are excluded from recipient queries by the DB, not the UI.
- Plan prices and recipient limits are owned by the DB. `lib/plans.ts` (`JAR_PLANS`) mirrors them for display only — the browser must never be able to grant credits or change prices.
- Credits: every new account gets one free `one_heart` credit; a `test` credit source exists for QA so test jars don't look like paid revenue. Available credits = Σ(granted − used).

### Media pipeline

Browser-side compression (images re-encoded to WebP ≤1600px edge; voice notes ≤60s, ~32 kbps) → server-side validation in `app/app/actions.ts:validateMedia` (magic bytes, WebP dimension parsing, MIME/kind match, ≤1.5 MB) → upload to the private `jar-media` bucket plus an `attachments` row. On any post-creation failure the action compensates: uploaded objects are removed and the draft jar deleted. One photo and one voice note max per envelope (`unique (envelope_id, kind)`).

### Conventions

- Server actions use the `useActionState` pattern with typed form-state errors; raw Postgres/Supabase messages are mapped to friendly copy (see `friendlyJarError`).
- Security headers and a strict CSP are declared in `next.config.mjs` (CSP allows the Supabase origin from env). `agentRules: false` is set there intentionally. Server action body limit is 5 MB.
- Themes are `petal` / `blue` / `garden`, applied as `theme-*` classes.
- PWA: `app/manifest.ts` + `public/sw.js`.

## Gotchas

- This directory is **not a git repository** (a `.gitignore` exists but there is no `.git`). There is no history to consult and no branches — don't assume git workflows.
- `npm run check` after every change; the progress docs' verification claims are based on it.
- Design concept images live in `design/`; the shared jar illustration is `public/jar-illustration.png` (also duplicated at the root).
