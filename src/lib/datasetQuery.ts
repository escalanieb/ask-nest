import { useDatasetLayerStore } from "../stores/useDatasetLayerStore";
import { useFilterStore } from "../stores/useFilterStore";
import { geographicPrefix } from "./geographicPrefix";
export { geographicPrefix };
export function datasetLayerKey(id: number | null) {
  return [
    "layer",
    id,
    id ? (useDatasetLayerStore.getState().filtersByDataset[id] ?? {}) : {},
    geographicPrefix(useFilterStore.getState()),
  ];
}
