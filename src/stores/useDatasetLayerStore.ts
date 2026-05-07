import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChoroplethSelection {
  psgcCode: string;
  /** Derived prefix for filtering records: 2-char for region, 4-char for province, full code for municity */
  prefix: string;
  name: string;
  /** Geographic centroid of the selected area (for the dot marker) */
  lat: number;
  lng: number;
  /** Record count and tooltip breakdown — embedded at click time from the query cache */
  count: number;
  tooltip: Record<string, unknown>;
  /** Container-relative pixel position where the click occurred */
  x: number;
  y: number;
}

interface DatasetLayerState {
  /** All selected dataset IDs (multi-select checkboxes) */
  activeLayerDatasetIds: number[];
  /** Primary dataset for choropleth colouring (first in the array, or null) */
  activeLayerDatasetId: number | null;
  activeLayerPsgcLevel: string | null;
  /** Toggle a dataset on/off; updates primary automatically */
  toggleLayer: (id: number, psgcLevel?: string | null) => void;
  /** Legacy setter — replaces selection with a single id */
  setActiveLayer: (id: number | null, psgcLevel?: string | null) => void;
  choroplethSelection: ChoroplethSelection | null;
  setChoroplethSelection: (sel: ChoroplethSelection | null) => void;
}

export const useDatasetLayerStore = create<DatasetLayerState>()(
  persist(
    (set) => ({
      activeLayerDatasetIds: [],
      activeLayerDatasetId: null,
      activeLayerPsgcLevel: null,

      toggleLayer: (id, psgcLevel = null) =>
        set((s) => {
          const exists = s.activeLayerDatasetIds.includes(id);
          const next = exists
            ? s.activeLayerDatasetIds.filter((x) => x !== id)
            : [...s.activeLayerDatasetIds, id];
          return {
            activeLayerDatasetIds: next,
            activeLayerDatasetId: next[0] ?? null,
            activeLayerPsgcLevel: exists
              ? next.length > 0
                ? s.activeLayerPsgcLevel
                : null
              : (psgcLevel ?? s.activeLayerPsgcLevel),
            choroplethSelection: null,
          };
        }),

      setActiveLayer: (id, psgcLevel = null) =>
        set({
          activeLayerDatasetIds: id !== null ? [id] : [],
          activeLayerDatasetId: id,
          activeLayerPsgcLevel: psgcLevel,
          choroplethSelection: null,
        }),

      choroplethSelection: null,
      setChoroplethSelection: (sel) => set({ choroplethSelection: sel }),
    }),
    {
      name: "dataset-layer-store",
      partialize: (state) => ({
        activeLayerDatasetIds: state.activeLayerDatasetIds,
        activeLayerDatasetId: state.activeLayerDatasetId,
        activeLayerPsgcLevel: state.activeLayerPsgcLevel,
      }),
    },
  ),
);
