import { useDatasetLayerStore } from "../stores/useDatasetLayerStore";
import { useFilterStore } from "../stores/useFilterStore";
export function geographicPrefix(state: {
  activeCityMuni: string | null;
  activeProvince: string | null;
  activeRegion: string | null;
}): string | undefined {
  return (
    state.activeCityMuni?.slice(0, 6) ||
    state.activeProvince?.slice(0, 4) ||
    state.activeRegion?.slice(0, 2) ||
    undefined
  );
}
export function datasetLayerKey(id: number | null) {
  return [
    "layer",
    id,
    id ? (useDatasetLayerStore.getState().filtersByDataset[id] ?? {}) : {},
    geographicPrefix(useFilterStore.getState()),
  ];
}
