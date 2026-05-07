import { create } from "zustand";

interface FilterState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeRegion: string | null;
  setActiveRegion: (r: string | null) => void;
  activeCityMuni: string | null;
  setActiveCityMuni: (c: string | null) => void;
  activeProvince: string | null;
  setActiveProvince: (p: string | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  activeRegion: null,
  setActiveRegion: (r) =>
    set({ activeRegion: r, activeProvince: null, activeCityMuni: null }),
  activeCityMuni: null,
  setActiveCityMuni: (c) => set({ activeCityMuni: c }),
  activeProvince: null,
  setActiveProvince: (p) => set({ activeProvince: p, activeCityMuni: null }),
  resetFilters: () =>
    set({
      searchQuery: "",
      activeRegion: null,
      activeCityMuni: null,
      activeProvince: null,
    }),
}));
