import { withSupabase } from "npm:@supabase/server@^1";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGE_CHARS = 10000;
const SIGNATURE_WINDOW_SECONDS = 5 * 60;
const EMAIL_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

type InboundEmail = {
  message_id?: unknown;
  from_email?: unknown;
  subject?: unknown;
  text?: unknown;
};

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const secret = Deno.env.get("SUPPORT_EMAIL_WEBHOOK_SECRET")?.trim();
    if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
      return json({ error: "Support email intake is not configured" }, 503);
    }

    const timestamp = request.headers.get("x-owj-timestamp") ?? "";
    const signature = request.headers.get("x-owj-signature") ?? "";
    const timestampSeconds = Number(timestamp);
    if (!/^\d{10}$/.test(timestamp) || !Number.isSafeInteger(timestampSeconds)
      || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > SIGNATURE_WINDOW_SECONDS) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await readLimitedBody(request);
    if (!body) return json({ error: "Request body is too large or invalid" }, 413);
    if (!await verifySignature(secret, timestamp, body, signature)) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "Expected JSON" }, 415);
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
      return json({ error: "Invalid support email payload" }, 400);
    }
    const payload = parsedPayload as InboundEmail;

    const messageId = typeof payload.message_id === "string" ? payload.message_id.trim() : "";
    const senderEmail = typeof payload.from_email === "string" ? payload.from_email.trim() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const message = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!messageId || messageId.length > 500 || /[\u0000-\u001f\u007f]/.test(messageId)
      || senderEmail.length > 254 || !EMAIL_PATTERN.test(senderEmail)
      || subject.length > 300 || /[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(subject)
      || message.length > MAX_MESSAGE_CHARS || (!message && !subject)) {
      return json({ error: "Invalid support email payload" }, 400);
    }

    const details = message || "(No message body provided.)";
    const { data, error } = await ctx.supabaseAdmin.rpc("ingest_support_email", {
      p_source_reference: messageId,
      p_sender_email: senderEmail,
      p_subject: subject || null,
      p_details: details,
    });
    if (error?.message.includes("EMAIL_REQUEST_LIMIT_REACHED")) {
      return json({ error: "Sender request limit reached" }, 429);
    }
    const result = data && typeof data === "object" && !Array.isArray(data)
      ? data as Record<string, unknown>
      : null;
    if (error || !result || typeof result.request_id !== "string" || typeof result.duplicate !== "boolean") {
      console.error("Support email could not be recorded");
      return json({ error: "Support email could not be recorded" }, 500);
    }

    return json({ received: true, duplicate: result.duplicate }, 200);
  }),
};

async function readLimitedBody(request: Request): Promise<Uint8Array | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function verifySignature(secret: string, timestamp: string, body: Uint8Array, header: string): Promise<boolean> {
  const match = /^v1=([0-9a-f]{64})$/.exec(header);
  if (!match) return false;
  const prefix = new TextEncoder().encode(timestamp + ".");
  const signed = new Uint8Array(prefix.byteLength + body.byteLength);
  signed.set(prefix);
  signed.set(body, prefix.byteLength);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
    name: "HMAC",
    hash: "SHA-256",
  }, false, ["verify"]);
  return await crypto.subtle.verify("HMAC", key, hexToBytes(match[1]), signed);
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
