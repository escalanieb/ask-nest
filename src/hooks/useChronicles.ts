import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chroniclesApi, type EntryFilters } from "../services/chroniclesApi";
import type { ChroniclesTimeline } from "../types/chronicles";

// Query keys are scoped by the session (see lib/session.ts), so a team or account switch never
// shows another session's timelines.
const ROOT = ["chronicles"] as const;
const timelinesKey = [...ROOT, "timelines"] as const;
const timelineKey = (id: number | string) => [...ROOT, "timeline", String(id)] as const;
const entriesKey = (id: number | string) => [...ROOT, "entries", String(id)] as const;

export function useTimelines() {
  return useQuery({ queryKey: timelinesKey, queryFn: chroniclesApi.timelines, staleTime: 30_000 });
}

export function useTimeline(id: number | string | undefined) {
  return useQuery({
    queryKey: timelineKey(id ?? ""),
    queryFn: () => chroniclesApi.timeline(id!),
    enabled: id !== undefined,
    staleTime: 0,
  });
}

export function useEntries(id: number | string, filters: EntryFilters) {
  return useQuery({
    queryKey: [...entriesKey(id), filters],
    queryFn: () => chroniclesApi.entries(id, filters),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useChroniclesMutations() {
  const client = useQueryClient();
  const refreshTimelines = () => client.invalidateQueries({ queryKey: timelinesKey });
  return {
    saveTimeline: useMutation({
      mutationFn: ({ id, data }: { id?: number | string; data: Partial<ChroniclesTimeline> }) =>
        chroniclesApi.saveTimeline(id, data),
      onSuccess: (saved) => {
        client.setQueryData(timelineKey(saved.id), saved);
        return refreshTimelines();
      },
    }),
    deleteTimeline: useMutation({
      mutationFn: ({ id, confirmation }: { id: number | string; confirmation: string }) =>
        chroniclesApi.deleteTimeline(id, confirmation),
      onSuccess: refreshTimelines,
    }),
    setArchived: useMutation({
      mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
        archived ? chroniclesApi.archive(id) : chroniclesApi.restore(id),
      onSuccess: refreshTimelines,
    }),
    clone: useMutation({
      mutationFn: ({
        id,
        ...data
      }: {
        id: number;
        name: string;
        slug: string;
        withEntries: boolean;
      }) => chroniclesApi.clone(id, data),
      onSuccess: refreshTimelines,
    }),
    saveEntry: useMutation({
      mutationFn: ({
        timelineId,
        entryId,
        data,
      }: {
        timelineId: number | string;
        entryId?: number | string;
        data: unknown;
      }) => chroniclesApi.saveEntry(timelineId, entryId, data),
      onSuccess: (_saved, { timelineId }) =>
        Promise.all([
          client.invalidateQueries({ queryKey: entriesKey(timelineId) }),
          refreshTimelines(),
        ]),
    }),
    deleteEntry: useMutation({
      mutationFn: ({
        timelineId,
        entryId,
      }: {
        timelineId: number | string;
        entryId: number | string;
      }) => chroniclesApi.deleteEntry(timelineId, entryId),
      onSuccess: (_void, { timelineId }) =>
        Promise.all([
          client.invalidateQueries({ queryKey: entriesKey(timelineId) }),
          refreshTimelines(),
        ]),
    }),
    /** Imports change entry counts and rows. */
    entriesChanged: (timelineId: number | string) =>
      Promise.all([
        client.invalidateQueries({ queryKey: entriesKey(timelineId) }),
        refreshTimelines(),
      ]),
  };
}
