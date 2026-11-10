import { useDatasetLayerStore } from "./useDatasetLayerStore";
import { create } from "zustand";

interface FilterState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeRegion: string | null;
  setActiveRegion: (r: string | null) => void;
  activeStatus: string | null;
  setActiveStatus: (s: string | null) => void;
  activeCityMuni: string | null;
  setActiveCityMuni: (c: string | null) => void;
  activeProvince: string | null;
  setActiveProvince: (p: string | null) => void;
  /** Barangay inside the active city. Used by the Political explorer; other views never set it. */
  activeBarangay: string | null;
  setActiveBarangay: (b: string | null) => void;
  // TIPAS Integration Layer Filters
  showTipasEvents: boolean;
  setShowTipasEvents: (v: boolean) => void;
  showTipasAttendees: boolean;
  setShowTipasAttendees: (v: boolean) => void;
  selectedTipasEventId: number | null;
  setSelectedTipasEventId: (id: number | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  activeRegion: null,
  setActiveRegion: (r) => {
    useDatasetLayerStore.getState().setChoroplethSelection(null);
    set({ activeRegion: r, activeProvince: null, activeCityMuni: null, activeBarangay: null });
  },
  activeStatus: null,
  setActiveStatus: (s) => set({ activeStatus: s }),
  activeCityMuni: null,
  setActiveCityMuni: (c) => {
    useDatasetLayerStore.getState().setChoroplethSelection(null);
    set({ activeCityMuni: c, activeBarangay: null });
  },
  activeProvince: null,
  setActiveProvince: (p) => {
    useDatasetLayerStore.getState().setChoroplethSelection(null);
    set({ activeProvince: p, activeCityMuni: null, activeBarangay: null });
  },
  activeBarangay: null,
  setActiveBarangay: (b) => {
    useDatasetLayerStore.getState().setChoroplethSelection(null);
    set({ activeBarangay: b });
  },
  showTipasEvents: false,
  setShowTipasEvents: (v) => set({ showTipasEvents: v }),
  showTipasAttendees: false,
  setShowTipasAttendees: (v) => set({ showTipasAttendees: v }),
  selectedTipasEventId: null,
  setSelectedTipasEventId: (id) => set({ selectedTipasEventId: id }),
  resetFilters: () =>
    set({
      searchQuery: "",
      activeRegion: null,
      activeStatus: null,
      activeCityMuni: null,
      activeProvince: null,
      activeBarangay: null,
      showTipasEvents: false,
      showTipasAttendees: false,
      selectedTipasEventId: null,
    }),
}));
