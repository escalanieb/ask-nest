import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { rssFeedApi, type RssFeedInput } from "../services/api/rssFeedApi";

// Same keys as the Map's RSS panel, so both views share one cache.
const FEEDS_KEY = ["rss-feeds"] as const;
const itemsKey = (id: number) => ["rss-items", id] as const;
const FIVE_MINUTES = 1000 * 60 * 5;

export function useRssFeeds() {
  return useQuery({ queryKey: FEEDS_KEY, queryFn: rssFeedApi.list, staleTime: FIVE_MINUTES });
}

/** Fetches articles for each id in parallel; one failing feed doesn't hide the rest. */
export function useRssItems(ids: readonly number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: itemsKey(id),
      queryFn: () => rssFeedApi.fetch(id),
      staleTime: FIVE_MINUTES,
      refetchInterval: FIVE_MINUTES,
      retry: 1,
    })),
  });
}

export function useRssFeedMutations() {
  const client = useQueryClient();
  const refresh = (id?: number) => {
    void client.invalidateQueries({ queryKey: FEEDS_KEY });
    if (id !== undefined) void client.invalidateQueries({ queryKey: itemsKey(id) });
    // The Map panel's multi-feed view caches combined results under this key.
    void client.invalidateQueries({ queryKey: ["rss-items-multiple"] });
  };
  return {
    create: useMutation({
      mutationFn: (data: RssFeedInput) => rssFeedApi.create(data),
      onSuccess: () => refresh(),
    }),
    update: useMutation({
      mutationFn: ({ id, ...data }: Partial<RssFeedInput> & { id: number }) =>
        rssFeedApi.update(id, data),
      onSuccess: (_feed, { id }) => refresh(id),
    }),
    remove: useMutation({
      mutationFn: (id: number) => rssFeedApi.remove(id),
      onSuccess: (_void, id) => {
        client.removeQueries({ queryKey: itemsKey(id) });
        refresh();
      },
    }),
  };
}
