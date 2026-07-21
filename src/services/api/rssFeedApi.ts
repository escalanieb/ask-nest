import { apiFetch } from "./_fetch";

export interface RssFeed {
  id: number;
  name: string;
  url: string;
  category: string;
  active: boolean;
}

export interface RssItem {
  title: string;
  link: string;
  published: string | null;
  summary: string;
  image: string | null;
}

export interface RssFetchResult {
  feed: Pick<RssFeed, "id" | "name" | "url">;
  items: RssItem[];
}

export const rssFeedApi = {
  list: (): Promise<RssFeed[]> => apiFetch<RssFeed[]>("/rss/feeds"),

  fetch: (id: number): Promise<RssFetchResult> => apiFetch<RssFetchResult>(`/rss/fetch?id=${id}`),

  create: (data: { name: string; url: string; category?: string }): Promise<RssFeed> =>
    apiFetch<RssFeed>("/rss/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  remove: (id: number): Promise<void> => apiFetch<void>(`/rss/feeds/${id}`, { method: "DELETE" }),
};
