import test from "node:test";
import assert from "node:assert/strict";
import {
  filterItems,
  hourlyActivity,
  mergeFeedItems,
  rssErrorMessage,
  timeAgo,
  topOutlets,
} from "../src/lib/rssReader.ts";

test("topOutlets ranks by posts, falls back to the feed name and folds the tail into Other", () => {
  const post = (author: string | null, feedName = "Feed") => ({
    ...item("t", Math.random().toString(), null),
    author,
    feedId: 1,
    feedName,
  });
  const items = [
    post("PNA"),
    post("PNA"),
    post("PNA"),
    post("Inquirer"),
    post("Inquirer"),
    post(null, "Taguig City"),
    post("  "),
    post("Abante"),
  ];
  assert.deepEqual(topOutlets(items, 10), [
    { name: "PNA", count: 3 },
    { name: "Inquirer", count: 2 },
    { name: "Abante", count: 1 },
    { name: "Feed", count: 1 },
    { name: "Taguig City", count: 1 },
  ]);
  assert.deepEqual(topOutlets(items, 3), [
    { name: "PNA", count: 3 },
    { name: "Inquirer", count: 2 },
    { name: "Other", count: 3 },
  ]);
});

test("hourlyActivity buckets posts by clock hour and ignores old, future and undated posts", () => {
  const now = Date.parse("2026-11-16T12:30:00Z");
  const buckets = hourlyActivity(
    [
      item("a", "1", "2026-11-16T12:05:00Z"),
      item("b", "2", "2026-11-16T12:29:00Z"),
      item("c", "3", "2026-11-16T10:59:00Z"),
      item("d", "4", "2026-11-16T09:00:00Z"),
      item("old", "5", "2026-11-16T08:59:00Z"),
      item("future", "6", "2026-11-16T13:00:00Z"),
      item("undated", "7", null),
    ],
    4,
    now,
  );
  assert.deepEqual(
    buckets.map((b) => [new Date(b.start).toISOString().slice(11, 16), b.count]),
    [
      ["09:00", 1],
      ["10:00", 1],
      ["11:00", 0],
      ["12:00", 2],
    ],
  );
});

const item = (title: string, link: string, published: string | null, summary = "") => ({
  title,
  link,
  published,
  summary,
  image: null,
});

test("mergeFeedItems sorts newest first, tags the source and drops repeated links", () => {
  const merged = mergeFeedItems([
    {
      feed: { id: 1, name: "Alpha", url: "https://a.example" },
      items: [
        item("old", "https://x/1", "2026-01-01T00:00:00Z"),
        item("undated", "https://x/2", null),
      ],
    },
    {
      feed: { id: 2, name: "Beta", url: "https://b.example" },
      items: [
        item("new", "https://x/3", "2026-03-01T00:00:00Z"),
        item("dupe", "https://x/1", "2026-05-01T00:00:00Z"),
      ],
    },
  ]);
  assert.deepEqual(
    merged.map((i) => [i.title, i.feedName]),
    [
      ["new", "Beta"],
      ["old", "Alpha"],
      ["undated", "Alpha"],
    ],
  );
});

test("filterItems needs every word, ignores case and searches the source", () => {
  const items = [
    { ...item("Typhoon update", "1", null, "Signal no. 3 raised"), feedName: "Rappler" },
    { ...item("Senate session", "2", null, "Budget hearing"), feedName: "Inquirer" },
  ];
  assert.equal(filterItems(items, "").length, 2);
  assert.deepEqual(
    filterItems(items, "TYPHOON signal").map((i) => i.link),
    ["1"],
  );
  assert.deepEqual(
    filterItems(items, "inquirer").map((i) => i.link),
    ["2"],
  );
  assert.equal(filterItems(items, "typhoon budget").length, 0);
});

test("timeAgo handles missing and invalid dates", () => {
  const now = Date.parse("2026-01-02T00:00:00Z");
  assert.equal(timeAgo(null, now), "");
  assert.equal(timeAgo("not a date", now), "");
  assert.equal(timeAgo("2026-01-01T23:59:30Z", now), "just now");
  assert.equal(timeAgo("2026-01-01T23:15:00Z", now), "45m ago");
  assert.equal(timeAgo("2026-01-01T19:00:00Z", now), "5h ago");
  assert.equal(timeAgo("2025-12-30T00:00:00Z", now), "3d ago");
});

test("rssErrorMessage surfaces validation and fetch errors", () => {
  const api = (status: number, body: unknown) =>
    new Error(`API error ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  assert.equal(
    rssErrorMessage(
      api(422, { message: "x", errors: { url: ["The url field must be a valid URL."] } }),
    ),
    "The url field must be a valid URL.",
  );
  assert.equal(
    rssErrorMessage(api(502, { error: "Failed to fetch feed: timeout" })),
    "Failed to fetch feed: timeout",
  );
  assert.equal(rssErrorMessage(api(404, "<html>")), "That feed no longer exists.");
  assert.equal(rssErrorMessage(new Error("Session expired.")), "Session expired.");
  assert.equal(rssErrorMessage(null), "Something went wrong. Please try again.");
});
