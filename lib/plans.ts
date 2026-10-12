export const JAR_PLANS = [
  { code: "one_heart", name: "One Heart", seatCount: 1, amountCents: 799, amountInrPaise: 39900, description: "Your own space to send and receive" },
  { code: "two_hearts", name: "Two Hearts", seatCount: 2, amountCents: 1499, amountInrPaise: 69900, description: "A shared space for two people" },
  { code: "close_circle", name: "Close Circle", seatCount: 3, amountCents: 1999, amountInrPaise: 99900, description: "Bring two people along" },
  { code: "family_circle", name: "Family Circle", seatCount: 5, amountCents: 2999, amountInrPaise: 149900, description: "Bring your closest people together" },
  { code: "big_heart", name: "Big Heart", seatCount: 10, amountCents: 4999, amountInrPaise: 249900, description: "Room for a bigger Circle" },
] as const;

export type PricingMarket = "global" | "india";
export const EXTRA_JAR_PRICE = { amountCents: 199, amountInrPaise: 5900 } as const;

export type JarPlanCode = (typeof JAR_PLANS)[number]["code"];

export function getJarPlan(code: string) {
  return JAR_PLANS.find((plan) => plan.code === code) ?? JAR_PLANS[0];
}

export function formatPlanPrice(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

export function formatMarketPrice(amount: { amountCents: number; amountInrPaise: number }, market: PricingMarket) {
  return market === "india"
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount.amountInrPaise / 100)
    : formatPlanPrice(amount.amountCents);
}
