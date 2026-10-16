import test from "node:test";
import assert from "node:assert/strict";
import { accessContext, canUseWidget, capabilityForPath } from "../src/lib/teamAccess.ts";

test("feature API paths include nested resources and exact list routes", () => {
  assert.equal(capabilityForPath("/rss/feeds"), "rss.use");
  assert.equal(capabilityForPath("/datasets?active=1"), "datasets.use");
  assert.equal(capabilityForPath("/batches/7/commit"), "datasets.use");
  assert.equal(capabilityForPath("/ai/asc/conversations/1"), "ai.use");
  assert.equal(capabilityForPath("/auth/me"), null);
  assert.equal(capabilityForPath("/rss-other"), null);
});

test("persisted widgets cannot bypass disabled team access", () => {
  assert.equal(canUseWidget("rss", []), false);
  assert.equal(canUseWidget("records", ["rss.use"]), false);
  assert.equal(canUseWidget("analytics", ["analytics.use"]), true);
  assert.equal(canUseWidget("video", []), true);
});

test("capability changes invalidate session context while ordering changes do not", () => {
  const user = { id: 1, team: { id: 2 }, capabilities: ["rss.use", "ai.use"] };
  assert.notEqual(accessContext(user), accessContext({ ...user, capabilities: ["rss.use"] }));
  assert.equal(
    accessContext(user),
    accessContext({ ...user, capabilities: ["ai.use", "rss.use"] }),
  );
  assert.notEqual(
    accessContext({ ...user, role: "data_manager" }),
    accessContext({ ...user, role: "viewer" }),
  );
});
