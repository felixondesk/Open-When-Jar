import assert from "node:assert/strict";
import test from "node:test";
import { parseSupportConversation } from "../lib/support.ts";

test("support conversations retain public messages and drop private administrative fields", () => {
  const result = parseSupportConversation({
    request: { id: "request", category: "support", details: "Help", status: "waiting_on_user", created_at: "2026-10-13T00:00:00Z", internal_note: "private decision" },
    messages: [{ id: 1, sender: "support", body: "Which screen?", created_at: "2026-10-13T00:00:00Z", actor_id: "private actor" }],
    events: [{ note: "private decision" }],
  });
  assert.equal(result?.messages[0].body, "Which screen?");
  assert.doesNotMatch(JSON.stringify(result), /private decision|private actor/);
});

test("invalid support payloads fail instead of showing an empty successful conversation", () => {
  assert.equal(parseSupportConversation(null), null);
  assert.equal(parseSupportConversation({ request: {}, messages: [] }), null);
  const request = { id: "request", category: "support", details: "Help", status: "new", created_at: "2026-10-13T00:00:00Z" };
  assert.equal(parseSupportConversation({ request, messages: [{ id: 1, sender: "unknown", body: "text", created_at: "date" }] }), null);
  assert.deepEqual(parseSupportConversation({ request, messages: [] }), { request, messages: [] });
});
