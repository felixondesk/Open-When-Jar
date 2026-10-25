# Dodo Live Payments Handoff

## Current status

- **Dodo Live catalog:** six products created with the matching USD and fixed INR prices below.
- **Live webhook:** created and enabled at `https://saplipdgsbpwlgxyhxjg.supabase.co/functions/v1/dodo-test-webhook` with `payment.succeeded`, `refund.succeeded`, `dispute.accepted`, and `dispute.lost`.
- **Product mapping:** done on 25 October 2026; the six `live_mode` rows are in `public.dodo_products` and verified alongside the six `test_mode` rows.
- **Vercel Production:** `DODO_PAYMENTS_MODE=live_mode` is already saved (added by CLI on 25 October). `DODO_PAYMENTS_API_KEY` has not been saved; enter the live API key as a Secret variable.
- **Supabase Edge Function secrets:** the form is prepared with `DODO_PAYMENTS_MODE=live_mode` and `DODO_PAYMENTS_WEBHOOK_KEY`; the signing-secret value has not been entered or saved.
- **Deployment and payment check:** production has not been redeployed, and no live checkout or refund has been performed.

No API key or signing-secret value is included in this file. Enter both directly in their dashboards; do not send them in chat.

## Dodo Live products

| Product | USD | INR | Product ID |
|---|---:|---:|---|
| One Heart | $7.99 | ₹399 | `pdt_0NqU4qhLOyoZte9RqlWFm` |
| Two Hearts | $14.99 | ₹699 | `pdt_0NqU4qknB6Hv61HvnwMip` |
| Close Circle | $19.99 | ₹999 | `pdt_0NqU4qdLbtmbBBV4hCaPl` |
| Family Circle | $29.99 | ₹1,499 | `pdt_0NqU4qZHFMhwDwGjz1Gw5` |
| Big Heart | $49.99 | ₹2,499 | `pdt_0NqU4qQWqQalvtZFjv6kG` |
| Extra Jar | $1.99 | ₹59 | `pdt_0NqU4qLARk8ekaDYQNsPa` |

## 1. Insert Live product IDs in Supabase

In the Supabase SQL Editor for project `saplipdgsbpwlgxyhxjg`, run this upsert. It is safe to rerun; it updates the matching `live_mode` row if one already exists.

```sql
insert into public.dodo_products (mode, purchase_key, product_id) values
  ('live_mode', 'one_heart', 'pdt_0NqU4qhLOyoZte9RqlWFm'),
  ('live_mode', 'two_hearts', 'pdt_0NqU4qknB6Hv61HvnwMip'),
  ('live_mode', 'close_circle', 'pdt_0NqU4qdLbtmbBBV4hCaPl'),
  ('live_mode', 'family_circle', 'pdt_0NqU4qZHFMhwDwGjz1Gw5'),
  ('live_mode', 'big_heart', 'pdt_0NqU4qQWqQalvtZFjv6kG'),
  ('live_mode', 'extra_jar', 'pdt_0NqU4qLARk8ekaDYQNsPa')
on conflict (mode, purchase_key)
do update set product_id = excluded.product_id;
```

Verify the mapping:

```sql
select purchase_key, product_id
from public.dodo_products
where mode = 'live_mode'
order by purchase_key;
```

## 2. Save Vercel Production variables

In Vercel project `open-when-jar` → **Settings → Environment Variables**, set these for **Production**:

- `DODO_PAYMENTS_MODE` = `live_mode`
- `DODO_PAYMENTS_API_KEY` = your Dodo **Live** API key; keep it as a Secret variable

The app reads its payment mode and API key from Vercel. Save the variables after entering the key.

## 3. Save Supabase Edge Function secrets

In Supabase project `saplipdgsbpwlgxyhxjg` → **Edge Functions → Secrets**, set:

- `DODO_PAYMENTS_MODE` = `live_mode`
- `DODO_PAYMENTS_WEBHOOK_KEY` = the signing secret for the Live webhook endpoint above

The function reads its mode and webhook signing key from Supabase Function secrets. Reveal/copy the signing secret from the Dodo endpoint page directly into the Supabase value field, then save.

## 4. Redeploy and validate

After the product mapping and both sets of variables are saved, redeploy the Vercel Production deployment. Then use the lowest-priced product for one real checkout (Extra Jar: ₹59 or $1.99, depending on checkout currency) and refund that payment.

The real payment and refund are user-operated actions. Afterward, verify the payment intent, webhook event, plan/credit rows, and Supabase function logs. No live transaction has been run yet.
