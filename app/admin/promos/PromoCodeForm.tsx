"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { savePromoCodeAction, type PromoCodeState } from "./actions";

export type PromoCode = { id: string; name: string; code: string; percent_off: number; valid_until: string; status: string; max_redemptions: number };

const INITIAL_STATE: PromoCodeState = {};

export function PromoCodeForm({ promo }: { promo?: PromoCode }) {
  const [state, action, pending] = useActionState(savePromoCodeAction, INITIAL_STATE);
  return <form action={action} className="admin-promo-form">
    {promo ? <input type="hidden" name="id" value={promo.id} /> : null}
    <label className="admin-promo-form__name">Promo name<input name="name" maxLength={80} required defaultValue={promo?.name} placeholder="Diwali launch" /></label>
    {promo ? null : <label>Code<input className="admin-promo-form__code" name="code" pattern="[A-Za-z0-9_\-]{3,30}" required placeholder="DIWALI20" title="3–30 letters, numbers, - or _" /></label>}
    <label>Discount<span className="admin-promo-form__suffix"><input name="percentOff" type="number" inputMode="numeric" min={1} max={99} step={1} required defaultValue={promo?.percent_off} placeholder="20" />%</span></label>
    <label>User cap<input name="maxRedemptions" type="number" inputMode="numeric" min={1} max={1000000} step={1} required defaultValue={promo?.max_redemptions} placeholder="100" /><small>Total uses across all accounts</small></label>
    <label>Valid till<input name="validUntil" type="date" required defaultValue={promo?.valid_until} /><small>Through the end of this day, UTC</small></label>
    <fieldset className="admin-promo-form__status">
      <legend>Status</legend>
      <div>
        <label><input type="radio" name="status" value="active" defaultChecked={(promo?.status ?? "active") === "active"} />Active</label>
        <label><input type="radio" name="status" value="inactive" defaultChecked={promo?.status === "inactive"} />Inactive</label>
      </div>
    </fieldset>
    <div className="admin-promo-form__footer">
      {state.error ? <p className="field-error" role="alert">{state.error}</p> : state.success ? <p className="admin-promo-form__saved" role="status">{state.success}</p> : <span />}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : promo ? "Save changes" : "Create code"}</Button>
    </div>
  </form>;
}
