import { create } from "zustand";

export interface SelectedLocation {
  psgcCode: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
}

export type MapAreaLevel = "region" | "province" | "municity";

interface MapState {
  selectedLocation: SelectedLocation | null;
  setSelectedLocation: (loc: SelectedLocation | null) => void;
  zoom: number;
  setZoom: (z: number) => void;
  mapAreaLevel: MapAreaLevel;
  setMapAreaLevel: (level: MapAreaLevel) => void;
  // Map display toggles
  showChoropleth: boolean;
  showDots: boolean;
  showNumbers: boolean;
  setShowChoropleth: (v: boolean) => void;
  setShowDots: (v: boolean) => void;
  setShowNumbers: (v: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedLocation: null,
  setSelectedLocation: (loc) => set({ selectedLocation: loc }),
  zoom: 6,
  setZoom: (z) => set({ zoom: z }),
  mapAreaLevel: "region",
  setMapAreaLevel: (level) => set({ mapAreaLevel: level }),
  showChoropleth: true,
  showDots: false,
  showNumbers: false,
  setShowChoropleth: (v) => set({ showChoropleth: v }),
  setShowDots: (v) => set({ showDots: v }),
  setShowNumbers: (v) => set({ showNumbers: v }),
}));
