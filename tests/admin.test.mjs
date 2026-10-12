import assert from "node:assert/strict";
import test from "node:test";
import { getAdminAccess, parseAdminSnapshot } from "../lib/admin.ts";

test("admin access requires the trusted role and an AAL2 session", () => {
  assert.deepEqual(getAdminAccess({ app_metadata: { role: "admin" }, aal: "aal2" }), {
    isAdmin: true,
    hasAdminRole: true,
    hasAal2: true,
  });
  assert.equal(getAdminAccess({ user_metadata: { role: "admin" }, aal: "aal2" }).isAdmin, false);
  assert.equal(getAdminAccess({ app_metadata: { role: "admin" }, aal: "aal1" }).isAdmin, false);
  assert.equal(getAdminAccess({ app_metadata: { role: "user" }, aal: "aal2" }).isAdmin, false);
  assert.equal(getAdminAccess(undefined).isAdmin, false);
});

test("dashboard parsing keeps administrative fields and drops private content", () => {
  const snapshot = parseAdminSnapshot({
    generated_at: "2026-09-26T00:00:00Z",
    summary: { people: 1, jars_created: 1, sealed_jars: 1, revenue_cents: 0 },
    lifecycle: { draft: 0, sealed: 1, hosting_ended: 0 },
    attention: { pending_payments: 0, failed_payments: 0, hosting_ending_soon: 0 },
    activity: [{ day: "2026-09-26", jars_created: 1, jars_sealed: 1, people_joined: 1, revenue_cents: 0 }],
    jars: [{ id: "jar-id", creator_username: "creator", plan_code: "one_heart", status: "sealed", created_at: "2026-09-26T00:00:00Z", sealed_at: null, hosting_ends_at: null, recipient_count: 1, envelope_count: 1, letter_text: "private letter", recipient_email: "private@example.com" }],
    orders: [{ id: "order-id", username: "creator", plan_code: "one_heart", status: "succeeded", amount_cents: 100, currency: "USD", created_at: "2026-09-26T00:00:00Z", payment_secret: "private payment secret" }],
    people: [{ id: "person-id", username: "creator", display_name: "Creator", created_at: "2026-09-26T00:00:00Z", jars_created: 1, jars_received: 0, email: "private@example.com" }],
  });

  assert.equal(snapshot?.summary.sealedJars, 1);
  assert.equal(snapshot?.jars[0].creatorUsername, "creator");
  assert.equal(snapshot?.orders[0].amountCents, 100);
  assert.equal(snapshot?.people[0].displayName, "Creator");
  assert.doesNotMatch(JSON.stringify(snapshot), /private letter|private@example\.com|private payment secret/);
});

test("invalid dashboard structure cannot appear as successful data", () => {
  assert.equal(parseAdminSnapshot(null), null);
  assert.equal(parseAdminSnapshot({ summary: {}, lifecycle: {} }), null);
});
