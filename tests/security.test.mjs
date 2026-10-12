import assert from "node:assert/strict";
import test from "node:test";
import { getSafeAuthRedirect, getAuthOrigin } from "../lib/auth-origin.ts";
import { readWebhookBody } from "../supabase/functions/dodo-test-webhook/body.ts";

test("webhook body preserves signed bytes and rejects oversized input", async () => {
  const body = '{"test":"hello"}';
  assert.equal(await readWebhookBody(new Request("https://example.test", { method: "POST", body }), body.length), body);
  assert.equal(await readWebhookBody(new Request("https://example.test", { method: "POST", body }), 3), null);
  assert.equal(await readWebhookBody(new Request("https://example.test", { method: "POST", body: "x", headers: { "Content-Length": "999" } }), 10), null);
});

test("webhook body rejects malformed UTF-8 and enforces streamed size", async () => {
  assert.equal(await readWebhookBody(new Request("https://example.test", { method: "POST", body: new Uint8Array([255]) })), null);
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(4)); },
    cancel() { cancelled = true; },
  });
  assert.equal(await readWebhookBody(new Request("https://example.test", {method:"POST",body,duplex:"half"}), 6), null);
  assert.equal(cancelled, true);
});

const origin = "https://openwhenjar.bond";

test("OAuth redirect rejects external URLs and URL-parser bypasses", () => {
  for (const value of [null, "https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "javascript:alert(1)", "//user:pass@evil.example"]) {
    assert.equal(getSafeAuthRedirect(value, origin).href, `${origin}/app`, String(value));
  }
});

test("OAuth redirect preserves same-origin paths and query strings", () => {
  assert.equal(getSafeAuthRedirect("/app?view=circle#invite", origin).href, `${origin}/app?view=circle#invite`);
  assert.equal(getSafeAuthRedirect("/app/../auth/username", origin).origin, origin);
});

test("production auth origin ignores untrusted Host headers", () => {
  const previousSite = process.env.NEXT_PUBLIC_SITE_URL;
  const previousMode = process.env.NODE_ENV;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = origin;
    process.env.NODE_ENV = "production";
    for (const host of ["evil.example", "localhost", "openwhenjar.bond@evil.example"]) {
      assert.equal(getAuthOrigin(new Headers({ host })), origin);
    }
  } finally {
    if (previousSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSite;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});
