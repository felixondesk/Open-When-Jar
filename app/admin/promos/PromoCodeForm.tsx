"use client";

import { useActionState } from "react";
import { savePromoCodeAction, type PromoCodeState } from "./actions";

export type PromoCode = { id: string; name: string; code: string; percent_off: number; valid_until: string; status: string; max_redemptions: number };

const INITIAL_STATE: PromoCodeState = {};

export function PromoCodeForm({ promo }: { promo?: PromoCode }) {
  const [state, action, pending] = useActionState(savePromoCodeAction, INITIAL_STATE);
  return <form action={action} className="admin-request-form admin-promo-form" onReset={promo ? (event) => event.preventDefault() : undefined}>
    {promo ? <input type="hidden" name="id" value={promo.id} /> : null}
    <label>Promo name<input name="name" maxLength={80} required defaultValue={promo?.name} placeholder="Launch week" /></label>
    <label>Promo code<input name="code" pattern="[A-Za-z0-9_\-]{3,30}" required={!promo} disabled={Boolean(promo)} defaultValue={promo?.code} placeholder="LAUNCH20" /></label>
    <label>Valid till (UTC, inclusive)<input name="validUntil" type="date" required defaultValue={promo?.valid_until} /></label>
    <label>Status<select name="status" defaultValue={promo?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
    <label>Discount %<input name="percentOff" type="number" min={1} max={99} step={1} required defaultValue={promo?.percent_off} /></label>
    <label>User cap (total uses)<input name="maxRedemptions" type="number" min={1} max={1000000} step={1} required defaultValue={promo?.max_redemptions} /></label>
    <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : promo ? "Save changes" : "Create promo code"}</button>
    {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
