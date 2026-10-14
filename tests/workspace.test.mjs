import assert from "node:assert/strict";
import test from "node:test";
import { getPlanStatusOrClaimInvitation } from "../lib/plan-status.ts";

const plan = {
  isOwner: false, planCode: "two_hearts", seatLimit: 2, jarsUsed: 0, jarLimit: 10,
  members: [{ username: "friend", displayName: "Friend", isOwner: false }], invitations: [],
};
const ok = (data) => ({ data, error: null });

test("an existing plan skips invitation claims and duplicate reads", async () => {
  const unexpected = () => { throw new Error("Unexpected database round trip"); };
  assert.deepEqual(await getPlanStatusOrClaimInvitation(unexpected, unexpected, ok(plan)), plan);
});

test("an invited newcomer is claimed before fresh plan access is read", async () => {
  const calls = [];
  const result = await getPlanStatusOrClaimInvitation(
    async () => { calls.push("read"); return ok(plan); },
    async () => { calls.push("claim"); return ok(true); },
    ok(null),
  );
  assert.deepEqual(calls, ["claim", "read"]);
  assert.deepEqual(result, plan);
});

test("a newcomer without an invitation receives no plan and no extra read", async () => {
  let reads = 0;
  const result = await getPlanStatusOrClaimInvitation(
    async () => { reads++; return ok(null); }, async () => ok(false),
  );
  assert.equal(result, null);
  assert.equal(reads, 1);
});

test("plan and invitation failures do not grant access or expose provider errors", async () => {
  const privateError = { message: "private database detail" };
  const unexpected = () => { throw new Error("Unexpected database round trip"); };
  await assert.rejects(getPlanStatusOrClaimInvitation(unexpected, unexpected, { data: null, error: privateError }), { message: "Plan status is unavailable" });
  await assert.rejects(getPlanStatusOrClaimInvitation(unexpected, async () => ({ data: null, error: privateError }), ok(null)), { message: "Seat invitation could not be claimed" });
  await assert.rejects(getPlanStatusOrClaimInvitation(async () => ({ data: null, error: privateError }), async () => ok(true), ok(null)), { message: "Plan status is unavailable" });
});

test("a successful claim alone cannot grant access without a valid plan", async () => {
  assert.equal(await getPlanStatusOrClaimInvitation(async () => ok(null), async () => ok(true), ok(null)), null);
});
