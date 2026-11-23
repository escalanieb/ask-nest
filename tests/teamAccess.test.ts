import test from "node:test";
import assert from "node:assert/strict";
import {
  accessContext,
  canUseWidget,
  capabilityForPath,
  usesDatasetWorkspace,
} from "../src/lib/teamAccess.ts";
import { visibleBuiltIns } from "../src/lib/appRegistry.ts";

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

test("a person whose capabilities are a subset of their team's loses just those apps", () => {
  // TALA denied datasets and RSS for this person; the team still has them.
  const person = { role: "admin", capabilities: ["dataset-workspace.use", "ai.use"] };
  assert.equal(usesDatasetWorkspace(person), false, "workspace layout needs datasets.use too");
  assert.equal(canUseWidget("rss", person.capabilities), false);
  assert.equal(canUseWidget("records", person.capabilities), false);
  assert.equal(canUseWidget("analytics", person.capabilities), false);
  const tiles = visibleBuiltIns(person).map((app) => app.id);
  assert.ok(!tiles.includes("rss") && !tiles.includes("datasets"));
  assert.ok(tiles.includes("asc"));
});

test("a granted person gets an app their team lacks, and a changed grant is a new session context", () => {
  const user = { id: 1, team: { id: 2 }, role: "viewer", capabilities: ["ai.use"] };
  assert.ok(
    visibleBuiltIns({ ...user, capabilities: [...user.capabilities, "chronicles.use"] }).some(
      (app) => app.id === "chronicles",
    ),
  );
  assert.notEqual(
    accessContext(user),
    accessContext({ ...user, capabilities: [...user.capabilities, "chronicles.use"] }),
  );
});
