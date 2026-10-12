import { withSupabase } from "npm:@supabase/server@^1";

type Reminder = { id: string; jar_id: string; email: string; hosting_ends_at: string };

export default {
  fetch: withSupabase({ auth: "secret" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    const from = Deno.env.get("REMINDER_FROM_EMAIL")?.trim();
    const siteValue = Deno.env.get("NEXT_PUBLIC_SITE_URL")?.trim();
    if (!apiKey || !from || !siteValue) return Response.json({ error: "Reminder email is not configured" }, { status: 503 });
    let origin: string;
    try {
      const url = new URL(siteValue);
      if (url.protocol !== "https:") throw new Error("HTTPS required");
      origin = url.origin;
    } catch {
      return Response.json({ error: "Site URL is invalid" }, { status: 503 });
    }

    const { data, error } = await ctx.supabaseAdmin.rpc("claim_jar_expiry_reminders", { p_limit: 25 });
    if (error) return Response.json({ error: "Reminders could not be claimed" }, { status: 500 });
    const reminders = (data ?? []) as Reminder[];
    let sent = 0;
    let failed = 0;
    for (const reminder of reminders) {
      const endDate = new Date(reminder.hosting_ends_at).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
      const link = `${origin}/app/jars/${encodeURIComponent(reminder.jar_id)}`;
      const text = `A Jar you received on Open When Jar will reach the end of its three-year hosting on ${endDate}. Sign in and download your keepsake before then: ${link}`;
      let messageId: string | null = null;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `owj-expiry-7d-${reminder.id}`,
          },
          body: JSON.stringify({ from, to: [reminder.email], subject: "Save your Open When Jar keepsake", text }),
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
      const { error: finishError } = await ctx.supabaseAdmin.rpc("finish_jar_expiry_reminder", {
        p_id: reminder.id,
        p_provider_message_id: messageId,
      });
      if (messageId && !finishError) sent++;
      else failed++;
    }
    return Response.json({ claimed: reminders.length, sent, failed }, { headers: { "Cache-Control": "no-store" } });
  }),
};
