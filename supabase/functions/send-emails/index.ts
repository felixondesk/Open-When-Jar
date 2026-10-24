import { withSupabase } from "npm:@supabase/server@^1";

type OutboxRow = { id: string; kind: string; to_email: string; payload: Record<string, string> };
type Message = { subject: string; text: string };

// Copy only what the outbox row holds. Letter text, media and private notes never reach email.
const messages: Record<string, (payload: Record<string, string>, site: string) => Message> = {
  jar_received: (payload, site) => ({
    subject: `${payload.creator} sent you a jar`,
    text: `${payload.creator} sent you a jar on Open When Jar. Sign in with this email address to open it: ${site}/app/jars/${payload.jar_id}`,
  }),
  envelope_unlocked: (payload, site) => ({
    subject: `A letter from ${payload.creator} just opened`,
    text: `A letter in the jar ${payload.creator} sent you on Open When Jar is ready to read: ${site}/app/jars/${payload.jar_id}`,
  }),
  jar_opened: (payload, site) => ({
    subject: `${payload.recipient} opened your jar`,
    text: `${payload.recipient} opened the jar you sent on Open When Jar: ${site}/app/jars/${payload.jar_id}`,
  }),
  jar_expiry_reminder: (payload, site) => ({
    subject: "Save your Open When Jar keepsake",
    text: `A jar you received on Open When Jar will reach the end of its three-year hosting on ${new Date(payload.hosting_ends_at).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}. Sign in and download your keepsake before then: ${site}/app/jars/${payload.jar_id}`,
  }),
  welcome: (_payload, site) => ({
    subject: "Welcome to Open When Jar",
    text: `Welcome to Open When Jar. Fill a jar with letters, photos and voice notes for someone you love, and they open each one when the moment comes. Start your first jar: ${site}/app`,
  }),
  jar_hosting_ended: (_payload, site) => ({
    subject: "A jar has reached the end of its hosting",
    text: `A jar on Open When Jar has reached the end of its three-year hosting. Sign in to save anything you want to keep: ${site}/app`,
  }),
  circle_request: (payload, site) => ({
    subject: `${payload.requester} wants to join your Circle`,
    text: `${payload.requester} sent you a Circle request on Open When Jar. Accept or decline it here: ${site}/app?view=circle`,
  }),
  circle_accepted: (payload, site) => ({
    subject: `${payload.addressee} joined your Circle`,
    text: `${payload.addressee} accepted your Circle request on Open When Jar. Send them a jar from ${site}/app`,
  }),
  support_received: (_payload, site) => ({
    subject: "We received your request",
    text: `We received your Open When Jar request and will reply in your account. Track it here: ${site}/app/requests`,
  }),
  support_reply: (payload, site) => ({
    subject: "We replied to your request",
    text: `Open When Jar support replied to your request. Sign in to read the reply: ${site}/app/requests/${payload.request_id}`,
  }),
  support_status: (payload, site) => ({
    subject: "Your request has an update",
    text: `Your Open When Jar request is now ${payload.status.replace(/_/g, " ")}. Sign in for details: ${site}/app/requests/${payload.request_id}`,
  }),
  password_changed: (_payload, site) => ({
    subject: "Your Open When Jar password was changed",
    text: `The password on your Open When Jar account was just changed. If this was not you, reset it now at ${site}/auth and contact support.`,
  }),
  email_changed: () => ({
    subject: "Your Open When Jar email was changed",
    text: "The email address on your Open When Jar account was just changed. If this was not you, contact support right away.",
  }),
  new_registration: (payload) => ({
    subject: "New Open When Jar registration",
    text: `${payload.email} registered at ${payload.registered_at} (UTC).`,
  }),
};

// The scheduler calls this with the publishable key. Sending is limited to rows the
// database already queued, so the key only starts a drain and cannot choose content.
export default {
  fetch: withSupabase({ auth: "publishable" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    const from = Deno.env.get("EMAIL_FROM")?.trim();
    const siteValue = Deno.env.get("NEXT_PUBLIC_SITE_URL")?.trim();
    if (!apiKey || !from || !siteValue) return Response.json({ error: "Email is not configured" }, { status: 503 });
    let site: string;
    try {
      const url = new URL(siteValue);
      if (url.protocol !== "https:") throw new Error("HTTPS required");
      site = url.origin;
    } catch {
      return Response.json({ error: "Site URL is invalid" }, { status: 503 });
    }

    const { data, error } = await ctx.supabaseAdmin.rpc("claim_email_outbox", { p_limit: 25 });
    if (error) return Response.json({ error: "Emails could not be claimed" }, { status: 500 });
    const rows = (data ?? []) as OutboxRow[];
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      const build = messages[row.kind];
      let messageId: string | null = null;
      if (build) {
        const { subject, text } = build(row.payload, site);
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `owj-email-${row.id}`,
            },
            body: JSON.stringify({ from, to: [row.to_email], subject, text }),
            signal: AbortSignal.timeout(10_000),
          });
          if (response.ok) {
            const result = await response.json() as { id?: unknown };
            if (typeof result.id === "string" && result.id) messageId = result.id;
          }
        } catch {
          // A timeout can mean the provider accepted the request. The same key
          // is retried only within its documented 24-hour idempotency window.
        }
      }
      const { error: finishError } = await ctx.supabaseAdmin.rpc("finish_email_outbox", {
        p_id: row.id,
        p_provider_message_id: messageId,
      });
      if (messageId && !finishError) sent++;
      else failed++;
    }
    return Response.json({ claimed: rows.length, sent, failed }, { headers: { "Cache-Control": "no-store" } });
  }),
};
