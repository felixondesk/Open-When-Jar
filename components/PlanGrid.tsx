import { EXTRA_JAR_PRICE, formatMarketPrice, JAR_PLANS, type JarPlanCode } from "@/lib/plans";

type MarketPriceAmount = {
  readonly amountCents: number;
  readonly amountInrPaise: number;
};

function MarketPrice({ amount }: { amount: MarketPriceAmount }) {
  return (
    <>
      <span className="market-price__global">{formatMarketPrice(amount, "global")}</span>
      <span className="market-price__india">{formatMarketPrice(amount, "india")}</span>
    </>
  );
}

export function PlanGrid({ selectedCode }: { selectedCode?: JarPlanCode }) {
  return (
    <>
      <div className="pricing-market"><label htmlFor="public-pricing-market">Prices for</label><select defaultValue="global" id="public-pricing-market"><option value="global">Global · USD</option><option value="india">India · INR</option></select></div>
      <div className="plan-grid">
        {JAR_PLANS.map((plan) => (
          <article className={plan.code === selectedCode ? "plan-card is-selected" : "plan-card"} key={plan.code}>
            {plan.code === "family_circle" ? <span className="plan-card__badge">Family favourite</span> : null}
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <strong><MarketPrice amount={plan} /></strong>
            <span>{plan.seatCount} {plan.seatCount === 1 ? "seat" : "seats"} · 10 Jars per member</span>
            <small>One-time price · before tax</small>
          </article>
        ))}
      </div>
      <p className="pricing-note">Extra Jars: <MarketPrice amount={EXTRA_JAR_PRICE} /> each, owned by the purchasing seat. Unused Jars do not expire while the account is active. Listed prices exclude applicable tax, which Dodo will add at checkout.</p>
    </>
  );
}
