import test from "node:test";
import assert from "node:assert/strict";
import { filterItems, mergeFeedItems, rssErrorMessage, timeAgo } from "../src/lib/rssReader.ts";

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
