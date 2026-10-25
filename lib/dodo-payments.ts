import "server-only";
import DodoPayments from "dodopayments";

export type DodoMode = "test_mode" | "live_mode";

export function getDodoMode(): DodoMode {
  return process.env.DODO_PAYMENTS_MODE?.trim() === "live_mode" ? "live_mode" : "test_mode";
}

export function getDodoClient() {
  const mode = getDodoMode();
  const apiKey = (process.env.DODO_PAYMENTS_API_KEY ?? (mode === "test_mode" ? process.env.DODO_PAYMENTS_TEST_API_KEY : undefined))?.trim();
  if (!apiKey) throw new Error("DODO_API_KEY_MISSING");
  // A production host never runs sandbox checkouts unless explicitly enabled for a hosted test deployment.
  if (mode === "test_mode" && process.env.NODE_ENV === "production" && process.env.DODO_TEST_CHECKOUT_ENABLED !== "true") {
    throw new Error("DODO_TEST_CHECKOUT_DISABLED");
  }

  return new DodoPayments({ bearerToken: apiKey, environment: mode });
}

export function getDodoCheckoutHost() {
  return getDodoMode() === "live_mode" ? "checkout.dodopayments.com" : "test.checkout.dodopayments.com";
}

export function getCheckoutCurrency(market: string): "USD" | "INR" | null {
  if (market === "global") return "USD";
  if (market === "india") return "INR";
  return null;
}

export function getCheckoutSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const siteUrl = new URL(configured);
    if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") return null;
    return siteUrl.origin;
  } catch {
    return null;
  }
}
