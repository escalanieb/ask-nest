import { useAuthStore } from "./useAuthStore";
import { create } from "zustand";
import { useDatasetLayerStore } from "./useDatasetLayerStore";
import { useFilterStore } from "./useFilterStore";

import { permittedMapSource, type MapSource } from "../lib/mapSource";
export { permittedMapSource } from "../lib/mapSource";
export const useMapSourceStore = create<{
  source: MapSource;
  setSource: (source: MapSource) => void;
}>((set) => ({
  source: "imported",
  setSource: (source) => {
    useDatasetLayerStore.getState().setChoroplethSelection(null);
    if (source === "tipas") {
      const state = useFilterStore.getState();
      if (!state.showTipasEvents && !state.showTipasAttendees) state.setShowTipasEvents(true);
    }
    set({ source });
  },
}));

export function currentMapSource(): MapSource {
  return permittedMapSource(
    useMapSourceStore.getState().source,
    useAuthStore.getState().user?.capabilities,
  );
}
export function useEffectiveMapSource(): MapSource {
  const source = useMapSourceStore((s) => s.source);
  const caps = useAuthStore((s) => s.user?.capabilities);
  return permittedMapSource(source, caps);
}
