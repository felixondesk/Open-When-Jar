"use server";

import { redirect } from "next/navigation";
import { JAR_PLANS } from "@/lib/plans";
import {
  getCheckoutCurrency,
  getCheckoutSiteOrigin,
  getDodoTestClient,
  getDodoTestProductId,
} from "@/lib/dodo-payments";
import { getSeatInvitationEmailConfig } from "@/lib/seat-invitation-email";
import { createClient } from "@/lib/supabase/server";

export type CheckoutState = { error?: string };

export async function startPlanCheckoutAction(
  _previousState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const planCode = String(formData.get("checkoutPlan") ?? "");
  const plan = JAR_PLANS.find((choice) => choice.code === planCode);
  const currency = getCheckoutCurrency(String(formData.get("checkoutCurrency") ?? "global"));
  if (!plan || !currency) return { error: "Choose a valid plan and checkout currency." };

  const inviteEmails = formData.getAll("inviteEmails").map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  if (inviteEmails.length > plan.seatCount - 1 || inviteEmails.some((email) => !/^\S+@\S+\.\S+$/.test(email) || email.length > 320)) {
    return { error: "Enter valid email addresses for up to the number of extra seats." };
  }
  if (new Set(inviteEmails).size !== inviteEmails.length) {
    return { error: "Use a different email address for each extra seat." };
  }
  const promoCode = normalizePromoCode(formData.get("promoCode"));
  if (promoCode === null) return { error: promoErrorMessage() };
  if (inviteEmails.length && !getSeatInvitationEmailConfig()) {
    return { error: "Invitation email is not configured yet. No checkout was started." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  const email = userData.user?.email?.trim().toLowerCase();
  if (!email) return { error: "Your account needs a confirmed email before checkout." };
  if (inviteEmails.includes(email)) return { error: "Enter someone else’s email for the extra seat." };

  const intentId = crypto.randomUUID();
  const { data: intentRows, error: intentError } = await supabase.rpc("create_dodo_test_payment_intent", {
    p_intent_id: intentId,
    p_purchase_type: "plan",
    p_plan_code: plan.code,
    p_currency: currency,
    p_invite_emails: inviteEmails,
    p_promo_code: promoCode || null,
  });
  if (intentError || !intentRows?.length) return { error: checkoutIntentError(intentError?.message) };
  const productId = intentRows[0].product_id;
  if (productId !== getDodoTestProductId(plan.code)) {
    await markCheckoutFailed(supabase, intentId);
    return { error: "The sandbox product mapping is out of date. Please contact support." };
  }

  const origin = getCheckoutSiteOrigin();
  if (!origin) {
    await markCheckoutFailed(supabase, intentId);
    return { error: "Set NEXT_PUBLIC_SITE_URL before starting checkout." };
  }

  let checkoutUrl: string;
  try {
    const dodo = getDodoTestClient();
    const { list_amount_minor: listAmount, expected_amount_minor: expectedAmount, percent_off: percentOff } = intentRows[0];
    const productCart = [{ product_id: productId, quantity: 1 }];
    // A single-use Dodo discount mirrors the DB-validated promo; users can never type codes into Dodo directly.
    const discountCode = percentOff
      ? (await dodo.discounts.create({
        type: "percentage",
        amount: percentOff * 100,
        code: `OWJ${intentId.replaceAll("-", "").slice(0, 16).toUpperCase()}`,
        usage_limit: 1,
        restricted_to: [productId],
        expires_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      })).code
      : undefined;
    const preview = await dodo.checkoutSessions.preview({ product_cart: productCart, billing_currency: currency, discount_code: discountCode });
    if (
      preview.currency !== currency ||
      preview.product_cart.length !== 1 ||
      preview.product_cart[0].product_id !== productId ||
      preview.current_breakup.subtotal !== listAmount ||
      preview.current_breakup.subtotal - preview.current_breakup.discount !== expectedAmount
    ) {
      throw new Error("DODO_PRODUCT_PRICE_MISMATCH");
    }
    const session = await dodo.checkoutSessions.create({
      product_cart: productCart,
      discount_code: discountCode,
      customer: { email, name: profile?.display_name ?? undefined },
      billing_currency: currency,
      return_url: checkoutReturnUrl(origin, intentId),
      cancel_url: planCancelUrl(origin, intentId),
      metadata: { owj_intent_id: intentId },
      feature_flags: { allow_currency_selection: false, allow_discount_code: false },
      customization: { theme: "dark" },
    });
    if (!session.checkout_url) throw new Error("CHECKOUT_URL_MISSING");
    const parsedUrl = new URL(session.checkout_url);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "test.checkout.dodopayments.com") {
      throw new Error("CHECKOUT_URL_INVALID");
    }
    checkoutUrl = parsedUrl.toString();
  } catch (error) {
    await markCheckoutFailed(supabase, intentId);
    if (error instanceof Error && error.message === "DODO_PRODUCT_PRICE_MISMATCH") {
      return { error: "The Dodo Test Mode product price or currency does not match the price shown here. Check the product and adaptive pricing settings." };
    }
    return { error: "We couldn’t start Dodo’s sandbox checkout. Check the test API key and product setup, then try again." };
  }

  redirect(checkoutUrl);
}

export async function startExtraJarCheckoutAction(formData: FormData): Promise<void> {
  const currency = getCheckoutCurrency(String(formData.get("currency") ?? "global"));
  if (!currency) redirect(accountCheckoutError("Choose a supported checkout currency and try again."));

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.trim().toLowerCase();
  if (!email) redirect(accountCheckoutError("Your account needs a confirmed email before checkout."));

  const intentId = crypto.randomUUID();
  const { data: intentRows, error: intentError } = await supabase.rpc("create_dodo_test_payment_intent", {
    p_intent_id: intentId,
    p_purchase_type: "extra_jar",
    p_plan_code: null,
    p_currency: currency,
    p_invite_emails: [],
  });
  if (intentError || !intentRows?.length) {
    if (intentError?.message.includes("PLAN_REQUIRED")) redirect("/app/unlock");
    redirect(accountCheckoutError("We couldn’t prepare this checkout. Please refresh and try again."));
  }
  if (intentRows[0].product_id !== getDodoTestProductId("extra_jar")) {
    await markCheckoutFailed(supabase, intentId);
    redirect(accountCheckoutError("The sandbox product mapping is out of date. Please contact support."));
  }
  const origin = getCheckoutSiteOrigin();
  if (!origin) {
    await markCheckoutFailed(supabase, intentId);
    redirect(accountCheckoutError("Set NEXT_PUBLIC_SITE_URL before starting checkout."));
  }

  let checkoutUrl: string;
  try {
    const dodo = getDodoTestClient();
    const productId = intentRows[0].product_id;
    const productCart = [{ product_id: productId, quantity: 1 }];
    const preview = await dodo.checkoutSessions.preview({ product_cart: productCart, billing_currency: currency });
    if (
      preview.currency !== currency ||
      preview.product_cart.length !== 1 ||
      preview.product_cart[0].product_id !== productId ||
      preview.current_breakup.discount !== 0 ||
      preview.current_breakup.subtotal !== intentRows[0].expected_amount_minor
    ) {
      throw new Error("DODO_PRODUCT_PRICE_MISMATCH");
    }
    const session = await dodo.checkoutSessions.create({
      product_cart: productCart,
      customer: { email },
      billing_currency: currency,
      return_url: checkoutReturnUrl(origin, intentId),
      cancel_url: `${origin}/app/checkout/cancel?intent=${encodeURIComponent(intentId)}&return=account`,
      metadata: { owj_intent_id: intentId },
      feature_flags: { allow_currency_selection: false, allow_discount_code: false },
      customization: { theme: "dark" },
    });
    if (!session.checkout_url) throw new Error("CHECKOUT_URL_MISSING");
    const parsedUrl = new URL(session.checkout_url);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "test.checkout.dodopayments.com") {
      throw new Error("CHECKOUT_URL_INVALID");
    }
    checkoutUrl = parsedUrl.toString();
  } catch (error) {
    await markCheckoutFailed(supabase, intentId);
    if (error instanceof Error && error.message === "DODO_PRODUCT_PRICE_MISMATCH") {
      redirect(accountCheckoutError("The Dodo Test Mode price or currency does not match the price shown. Check the product and adaptive pricing settings."));
    }
    redirect(accountCheckoutError("We couldn’t start Dodo’s sandbox checkout. Check the test API key and product setup, then try again."));
  }

  redirect(checkoutUrl);
}

export type PromoCheckState = { percentOff?: number; code?: string; error?: string };

export async function checkPromoCodeAction(_previousState: PromoCheckState, formData: FormData): Promise<PromoCheckState> {
  const code = normalizePromoCode(formData.get("promoCode"));
  if (!code) return { error: code === "" ? "Enter a promo code." : promoErrorMessage() };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");
  const { data, error } = await supabase.rpc("check_promo_code", { p_code: code });
  if (error || !data) return { error: promoErrorMessage(error?.message) };
  return { percentOff: data, code };
}

/** Returns "" for no code, null for a malformed one. */
function normalizePromoCode(value: FormDataEntryValue | null) {
  const code = String(value ?? "").trim().toUpperCase();
  if (!code) return "";
  return /^[A-Z0-9_-]{3,30}$/.test(code) ? code : null;
}

function promoErrorMessage(message?: string) {
  if (message?.includes("PROMO_ALREADY_USED")) return "You’ve already used this promo code.";
  if (message?.includes("PROMO_USED_UP")) return "This promo code has reached its limit.";
  return "That promo code isn’t valid or has expired.";
}

function checkoutReturnUrl(origin: string, intentId: string) {
  return `${origin}/app?checkout=returned&intent=${encodeURIComponent(intentId)}`;
}

function planCancelUrl(origin: string, intentId: string) {
  return `${origin}/app/checkout/cancel?intent=${encodeURIComponent(intentId)}`;
}

function accountCheckoutError(message: string) {
  return `/app?view=account&error=${encodeURIComponent(message)}`;
}

async function markCheckoutFailed(supabase: Awaited<ReturnType<typeof createClient>>, intentId: string) {
  await supabase.rpc("fail_dodo_test_payment_intent", { p_intent_id: intentId });
}

function checkoutIntentError(message?: string) {
  if (message?.includes("PROMO_")) return promoErrorMessage(message);
  if (message?.includes("PLAN_ALREADY_ACTIVE")) return "Your account already has a plan.";
  if (message?.includes("CHECKOUT_ALREADY_PENDING")) return "A plan checkout is already open. Finish or close it before trying again.";
  if (message?.includes("INVITEE_ALREADY_HAS_SEAT")) return "One of those emails already has a seat or invitation. Choose different addresses.";
  if (message?.includes("INVALID_INVITE_COUNT") || message?.includes("INVALID_EMAIL") || message?.includes("DUPLICATE_EMAIL")) {
    return "Check the email addresses for the extra seats and try again.";
  }
  return "We couldn’t prepare this checkout. Please refresh and try again.";
}
