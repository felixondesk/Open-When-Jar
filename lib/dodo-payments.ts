import "server-only";
import DodoPayments from "dodopayments";
import type { JarPlanCode } from "@/lib/plans";

const DODO_TEST_PRODUCTS: Record<JarPlanCode | "extra_jar", string> = {
  one_heart: "pdt_0NoD2B2hHk4o2flDTLCHu",
  two_hearts: "pdt_0NoD2uXbJCmqczV0EoE7Z",
  close_circle: "pdt_0NoD38hZE7pJyn2jdOneN",
  family_circle: "pdt_0NoD3KvIxN5Xx4sFVP7rQ",
  big_heart: "pdt_0NoD3TOCNAxFB90JxKnyQ",
  extra_jar: "pdt_0NoD3bz3qRPPvVDlx49zW",
};

export function getDodoTestProductId(code: JarPlanCode | "extra_jar") {
  return DODO_TEST_PRODUCTS[code];
}

export function getDodoTestClient() {
  const apiKey = process.env.DODO_PAYMENTS_TEST_API_KEY?.trim();
  if (!apiKey) throw new Error("DODO_TEST_API_KEY_MISSING");
  if (process.env.NODE_ENV === "production" && process.env.DODO_TEST_CHECKOUT_ENABLED !== "true") {
    throw new Error("DODO_TEST_CHECKOUT_DISABLED");
  }

  return new DodoPayments({ bearerToken: apiKey, environment: "test_mode" });
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
