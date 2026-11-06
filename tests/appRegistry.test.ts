import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeHref,
  letterColor,
  normalizeAppUrl,
  visibleBuiltIns,
} from "../src/lib/appRegistry.ts";

const ids = (user: Parameters<typeof visibleBuiltIns>[0]) =>
  visibleBuiltIns(user).map((app) => app.id);

test("Map and ungated external apps are always visible", () => {
  assert.deepEqual(ids({ role: "viewer", capabilities: [] }), [
    "map",
    "tala",
    "nexus",
    "senate-watch",
  ]);
  assert.deepEqual(ids(null).slice(0, 1), ["map"]);
});

test("capability-gated tools need their capability", () => {
  const user = { role: "viewer", capabilities: ["insight.use", "ai.use", "tipas.use"] };
  assert.deepEqual(ids(user), ["map", "insight", "asc", "tala", "tipas", "nexus", "senate-watch"]);
});

test("Datasets needs capability and a manager role", () => {
  assert.ok(!ids({ role: "viewer", capabilities: ["datasets.use"] }).includes("datasets"));
  assert.ok(!ids({ role: "admin", capabilities: [] }).includes("datasets"));
  assert.ok(ids({ role: "data_manager", capabilities: ["datasets.use"] }).includes("datasets"));
  assert.ok(ids({ role: "admin", capabilities: ["datasets.use"] }).includes("datasets"));
});

test("normalizeAppUrl adds https and allows only http(s)", () => {
  assert.equal(normalizeAppUrl("example.org"), "https://example.org");
  assert.equal(normalizeAppUrl("  example.org/x?y=1 "), "https://example.org/x?y=1");
  assert.equal(normalizeAppUrl("localhost:3000/app"), "https://localhost:3000/app");
  assert.equal(normalizeAppUrl("http://example.org"), "http://example.org");
  assert.equal(normalizeAppUrl("HTTPS://example.org"), "HTTPS://example.org");
  for (const bad of [
    "",
    "   ",
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "ftp://example.org",
    "https://",
    "not a url",
  ]) {
    assert.equal(normalizeAppUrl(bad), null, bad);
  }
});

test("isSafeHref only accepts http(s)", () => {
  assert.ok(isSafeHref("https://a.test"));
  assert.ok(isSafeHref("http://a.test"));
  assert.ok(!isSafeHref("javascript:alert(1)"));
  assert.ok(!isSafeHref("/insight"));
});

test("letterColor is deterministic and case-insensitive", () => {
  assert.equal(letterColor("Tracker"), letterColor(" tracker "));
  assert.match(letterColor("x"), /^#[0-9a-f]{6}$/);
});
