import { create } from "zustand";
import type { DisasterCounts, DisasterEvent } from "../services/api/disasterApi";

export type DisasterLayerKey = "earthquakes" | "volcanoes" | "typhoons" | "floods" | "heatmap";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface DisasterState {
  // Layer visibility toggles
  earthquakesEnabled: boolean;
  volcanoesEnabled: boolean;
  typhoonsEnabled: boolean;
  floodsEnabled: boolean;
  heatmapEnabled: boolean;

  // Fetched event data
  events: DisasterEvent[];
  counts: DisasterCounts;
  lastFetchedAt: string | null;
  isLoading: boolean;

  // Actions
  toggleEarthquakes: () => void;
  toggleVolcanoes: () => void;
  toggleTyphoons: () => void;
  toggleFloods: () => void;
  toggleHeatmap: () => void;

  setEvents: (events: DisasterEvent[], generatedAt?: string) => void;
  setCounts: (counts: DisasterCounts) => void;
  setLoading: (loading: boolean) => void;
}

// ---------------------------------------------------------------------------
// Derived helpers (not in store — use inline for performance)
// ---------------------------------------------------------------------------

export function countByType(events: DisasterEvent[], type: string): number {
  return events.filter((e) => e.type === type).length;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const DEFAULT_COUNTS: DisasterCounts = { byType: {}, bySeverity: {} };

export const useDisasterStore = create<DisasterState>((set) => ({
  // Layer toggles
  earthquakesEnabled: false,
  volcanoesEnabled: false,
  typhoonsEnabled: false,
  floodsEnabled: false,
  heatmapEnabled: false,

  // Data
  events: [],
  counts: DEFAULT_COUNTS,
  lastFetchedAt: null,
  isLoading: false,

  // Toggle actions
  toggleEarthquakes: () => set((s) => ({ earthquakesEnabled: !s.earthquakesEnabled })),
  toggleVolcanoes: () => set((s) => ({ volcanoesEnabled: !s.volcanoesEnabled })),
  toggleTyphoons: () => set((s) => ({ typhoonsEnabled: !s.typhoonsEnabled })),
  toggleFloods: () => set((s) => ({ floodsEnabled: !s.floodsEnabled })),
  toggleHeatmap: () => set((s) => ({ heatmapEnabled: !s.heatmapEnabled })),

  // Data actions
  setEvents: (events, generatedAt) =>
    set({ events, lastFetchedAt: generatedAt ?? new Date().toISOString() }),
  setCounts: (counts) => set({ counts }),
  setLoading: (isLoading) => set({ isLoading }),
}));
