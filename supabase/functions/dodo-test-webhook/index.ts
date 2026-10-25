import DodoPayments from "npm:dodopayments@2.51.0";
import { readWebhookBody } from "./body.ts";
import { withSupabase } from "npm:@supabase/server@^1";

const mode = Deno.env.get("DODO_PAYMENTS_MODE")?.trim() === "live_mode" ? "live_mode" : "test_mode";
const webhookKey = (Deno.env.get("DODO_PAYMENTS_WEBHOOK_KEY")
  ?? (mode === "test_mode" ? Deno.env.get("DODO_PAYMENTS_TEST_WEBHOOK_KEY") : undefined))?.trim();

const dodo = webhookKey
  ? new DodoPayments({ bearerToken: "", environment: mode, webhookKey })
  : null;

// Full refunds and lost/accepted disputes take the entitlement back; other events are acknowledged and ignored.
const REVOKING_EVENTS = new Set(["refund.succeeded", "dispute.accepted", "dispute.lost"]);

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
    if (!dodo) return jsonResponse({ error: "Webhook is not configured" }, 503);

    const webhookId = request.headers.get("webhook-id");
    const webhookSignature = request.headers.get("webhook-signature");
    const webhookTimestamp = request.headers.get("webhook-timestamp");
    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      return jsonResponse({ error: "Missing webhook signature headers" }, 400);
    }

    let event;
    const rawBody = await readWebhookBody(request);
    if (rawBody === null) return jsonResponse({ error: "Request body is too large or invalid" }, 413);
    try {
      event = dodo.webhooks.unwrap(rawBody, {
        headers: {
          "webhook-id": webhookId,
          "webhook-signature": webhookSignature,
          "webhook-timestamp": webhookTimestamp,
        },
      });
    } catch {
      return jsonResponse({ error: "Invalid webhook signature" }, 401);
    }

    if (REVOKING_EVENTS.has(event.type)) {
      const refund = event.data as { payment_id?: unknown; is_partial?: unknown };
      if (typeof refund.payment_id !== "string") return jsonResponse({ error: "Refund data is incomplete" }, 400);
      const { data, error } = await ctx.supabaseAdmin.rpc("revoke_dodo_payment", {
        p_event_id: webhookId,
        p_event_type: event.type,
        p_payment_id: refund.payment_id,
        p_mode: mode,
        p_partial: refund.is_partial === true,
      });
      if (error) {
        console.error("[dodo-test-webhook] Refund revocation failed");
        return jsonResponse({ error: "Refund could not be recorded" }, 500);
      }
      return jsonResponse({ received: true, status: (data as { status?: string } | null)?.status ?? "ignored" });
    }

    if (event.type !== "payment.succeeded") return jsonResponse({ received: true, ignored: true });

    const payment = event.data;
    const intentId = payment.metadata?.owj_intent_id;
    const cart = payment.product_cart;
    const product = cart?.length === 1 ? cart[0] : null;
    const tax = payment.tax ?? 0;
    if (
      typeof intentId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intentId) ||
      !product || product.quantity !== 1 ||
      !Number.isSafeInteger(payment.total_amount) || !Number.isSafeInteger(tax)
    ) {
      return jsonResponse({ error: "Payment data is incomplete" }, 400);
    }

    const { data, error } = await ctx.supabaseAdmin.rpc("fulfill_dodo_test_payment", {
      p_event_id: webhookId,
      p_intent_id: intentId,
      p_payment_id: payment.payment_id,
      p_product_id: product.product_id,
      p_currency: payment.currency,
      p_total_amount: payment.total_amount,
      p_tax: tax,
      p_mode: mode,
    });

    if (error) {
      console.error("[dodo-test-webhook] Payment fulfillment failed");
      return jsonResponse({ error: "Payment could not be confirmed" }, 500);
    }

    const result = data as { status?: string; invite_emails?: string[] } | null;
    if (result?.status === "fulfilled" && result.invite_emails?.length) {
      await sendReservedInvitations(result.invite_emails);
    }

    return jsonResponse({ received: true, status: result?.status ?? "ignored" });
  }),
};

async function sendReservedInvitations(emails: string[]) {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("INVITATION_FROM_EMAIL")?.trim();
  const siteUrlValue = Deno.env.get("NEXT_PUBLIC_SITE_URL")?.trim();
  if (!apiKey || !from || !siteUrlValue) {
    console.error("[dodo-test-webhook] Invitation email is not configured");
    return;
  }

  let siteUrl: string;
  try {
    const parsed = new URL(siteUrlValue);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return;
    siteUrl = parsed.origin;
  } catch {
    return;
  }

  const deliveries = await Promise.all(emails.map(async (email) => {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "You have a seat on Open When Jar",
          text: `Someone saved a seat for you on Open When Jar. Sign up or sign in with ${email} at ${siteUrl}/auth to join their plan and Circle. Each member can send 10 Jars.`,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }));
  if (deliveries.some((sent) => !sent)) console.error("[dodo-test-webhook] Some invitation emails could not be sent");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
