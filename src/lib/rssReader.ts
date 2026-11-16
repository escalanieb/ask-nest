import type { RssFetchResult, RssItem } from "../services/api/rssFeedApi.ts";

export interface ReaderItem extends RssItem {
  feedId: number;
  feedName: string;
}

const time = (iso: string | null): number => {
  const value = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(value) ? -Infinity : value;
};

/** Flattens feed results into one list, newest first, without repeating a link. */
export function mergeFeedItems(results: readonly RssFetchResult[]): ReaderItem[] {
  const seen = new Set<string>();
  const items: ReaderItem[] = [];
  for (const result of results) {
    for (const item of result.items) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      items.push({ ...item, feedId: result.feed.id, feedName: result.feed.name });
    }
  }
  return items.sort((a, b) => time(b.published) - time(a.published));
}

/** Case-insensitive match on title, summary or source; every word must match. */
export function filterItems<T extends RssItem & { feedName?: string }>(
  items: readonly T[],
  query: string,
): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const text = `${item.title} ${item.summary} ${item.feedName ?? ""}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  const at = time(iso);
  if (at === -Infinity) return "";
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Turns "API error 422: {json}" from apiFetch into a readable sentence. */
export function rssErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const match = /^API error (\d+): ([\s\S]*)$/.exec(message);
  if (!match) return message || "Something went wrong. Please try again.";
  try {
    const body = JSON.parse(match[2]) as {
      message?: string;
      error?: string;
      errors?: Record<string, string[]>;
    };
    const first = body.errors && Object.values(body.errors)[0]?.[0];
    if (first) return first;
    if (body.error) return body.error;
    if (body.message) return body.message;
  } catch {
    /* Non-JSON bodies fall through. */
  }
  return match[1] === "404"
    ? "That feed no longer exists."
    : "Something went wrong. Please try again.";
}
