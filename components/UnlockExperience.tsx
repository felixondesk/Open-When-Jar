"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { startPlanCheckoutAction } from "@/app/app/unlock/actions";
import { EXTRA_JAR_PRICE, formatMarketPrice, getJarPlan, JAR_PLANS, type JarPlanCode, type PricingMarket } from "@/lib/plans";
import { Button } from "./ui";

export function UnlockExperience({ checkoutNotice }: { checkoutNotice?: string }) {
  const [planCode, setPlanCode] = useState<JarPlanCode>("one_heart");
  const [market, setMarket] = useState<PricingMarket>("global");
  const [inviteFieldCount, setInviteFieldCount] = useState(0);
  const [checkoutState, checkoutAction, checkoutPending] = useActionState(startPlanCheckoutAction, {});
  const plan = getJarPlan(planCode);

  return (
    <section className="payment-page" aria-labelledby="payment-heading">
      <div className="payment-page__topbar">
        <span className="payment-page__brand"><i aria-hidden="true">♡</i> Open When Jar</span>
        <div className="payment-page__account">
          <Link href="/app/demo">Show Demo <span aria-hidden="true">→</span></Link>
          <Link href="/app/account">Account</Link>
          <form action={signOutAction}><button type="submit">Sign out</button></form>
        </div>
      </div>

      <div className="payment-page__focus">
        <header className="payment-page__heading">
          <span aria-hidden="true" className="payment-page__mark">❦</span>
          <h1 id="payment-heading">Choose your plan.<br /><em>Pay only once.</em></h1>
          <p>Choose how many accounts can join. Every member can send 10 Jars.</p>
        </header>

        <form action={checkoutAction} className="payment-card payment-card--focused">
          <div className="payment-card__header">
            <div><span>One-time access</span><strong>Choose seats for your people.</strong></div>
          </div>
          <div className="pricing-market"><label htmlFor="checkout-pricing-market">Prices for</label><select id="checkout-pricing-market" name="checkoutCurrency" value={market} onChange={(event) => setMarket(event.target.value as PricingMarket)}><option value="global">Global · USD</option><option value="india">India · INR</option></select></div>

          <fieldset className="payment-plan-list">
            <legend>How many account seats?</legend>
            {JAR_PLANS.map((choice) => (
              <label className={`payment-plan ${choice.code === planCode ? "is-selected" : ""}`} key={choice.code}>
                <input checked={choice.code === planCode} name="checkoutPlan" onChange={() => { setPlanCode(choice.code); setInviteFieldCount((count) => Math.min(count, choice.seatCount - 1)); }} type="radio" value={choice.code} />
                <span className="payment-plan__radio" aria-hidden="true" />
                <span className="payment-plan__copy"><strong>{choice.name}</strong><small>{choice.seatCount} {choice.seatCount === 1 ? "seat" : "seats"} · 10 Jars each</small></span>
                <span className="payment-plan__price"><b>{formatMarketPrice(choice, market)}</b><small>one time</small></span>
              </label>
            ))}
          </fieldset>

          {plan.seatCount > 1 ? <div className="payment-card__invites">
            <strong>Invite people now (optional)</strong>
            <p>Add anyone you know now, or leave seats open and invite people later from Account. After the sandbox payment is confirmed, we’ll email anyone listed here.</p>
            {Array.from({ length: inviteFieldCount }, (_, index) => <label key={index}>
              <span>Member {index + 2} email (optional)</span>
              <input autoComplete="email" name="inviteEmails" placeholder="name@example.com" type="email" />
            </label>)}
            {inviteFieldCount < plan.seatCount - 1 ? <button className="payment-card__add-invite" onClick={() => setInviteFieldCount((count) => count + 1)} type="button">+ Add an email now</button> : null}
          </div> : null}

          <div className="payment-card__total"><span>Listed one-time price</span><strong>{formatMarketPrice(plan, market)}</strong><small>Tax is added at checkout. No recurring charge.</small></div>
          <p className="pricing-note">Each seat can buy extra Jars for {formatMarketPrice(EXTRA_JAR_PRICE, market)} each. Extra Jars belong to that seat. Unused Jars do not expire while the account is active.</p>

          <Button className="payment-card__cta" disabled={checkoutPending} type="submit">{checkoutPending ? "Opening checkout…" : "Continue to test checkout"} <span aria-hidden="true">→</span></Button>
          <p className="checkout-boundary" role="note">
            Dodo sandbox checkout only. No real payment is collected. Access is added after Dodo confirms the test payment.
          </p>
          {checkoutNotice ? <p className="dashboard-notice" role="status">{checkoutNotice}</p> : null}
          {checkoutState.error ? <p className="field-error" role="alert">{checkoutState.error}</p> : null}
        </form>

      </div>
    </section>
  );
}
