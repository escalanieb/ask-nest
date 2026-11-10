import { useQuery } from "@tanstack/react-query";
import { fetchDataset, fetchDatasetLayer, fetchMapPanelRecords } from "../services/api/datasetApi";
import type { DatasetFilterValues } from "../services/api/datasetApi";
import { psgcApi } from "../services/api/psgcApi";
import { useDatasetLayerStore } from "../stores/useDatasetLayerStore";
import { useFilterStore } from "../stores/useFilterStore";
import { useMapStore } from "../stores/useMapStore";
import { useEffectiveMapSource } from "../stores/useMapSourceStore";
import { useAuthStore } from "../stores/useAuthStore";
import { POLITICAL_SLUG } from "../lib/teamAccess";
import { barangayCode } from "../lib/barangayCode";
import { barangayCoverage } from "../lib/datasetLayer";
import { BarangayShapesUnavailable } from "../services/mapBoundaries";
import { useBarangayShapes } from "./useBarangayShapes";
import { geographicPrefix } from "../lib/datasetQuery";
import {
  areaChip,
  filterChips,
  summarySentence,
  withoutFilter,
  type AreaPart,
  type SummaryChip,
} from "../lib/exploreSummary";

/** Clears the area and every dataset filter. The chosen dataset stays selected. */
export function clearAllNarrowing() {
  const layer = useDatasetLayerStore.getState();
  useFilterStore.getState().setActiveRegion(null);
  layer.clearDatasetFilters();
  const map = useMapStore.getState();
  map.setSelectedLocation(null);
  if (map.mapAreaLevel === "municity") map.setMapAreaLevel("region");
}

/** Clears the area only (region, province, city and the map selection). */
export function clearArea() {
  useFilterStore.getState().setActiveRegion(null);
  const map = useMapStore.getState();
  map.setSelectedLocation(null);
  if (map.mapAreaLevel === "municity") map.setMapAreaLevel("region");
}

/**
 * Single read model for "what am I looking at?". It adapts the existing
 * filter, layer and map stores, so the map keeps working unchanged.
 */
export function useExplore() {
  const source = useEffectiveMapSource();
  const datasetId = useDatasetLayerStore((s) =>
    source === "imported" ? s.activeLayerDatasetId : null,
  );
  const allFilters = useDatasetLayerStore((s) => s.filtersByDataset);
  const setDatasetFilters = useDatasetLayerStore((s) => s.setDatasetFilters);
  const { activeRegion, activeProvince, activeCityMuni, activeBarangay } = useFilterStore();
  const political = useAuthStore((s) => s.user?.team?.slug === POLITICAL_SLUG);
  const prefix = geographicPrefix({ activeRegion, activeProvince, activeCityMuni, activeBarangay });
  const filters: DatasetFilterValues = datasetId ? (allFilters[datasetId] ?? {}) : {};

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => fetchDataset(datasetId!),
    enabled: !!datasetId,
    staleTime: 1000 * 60 * 5,
  });
  const { data: regions } = useQuery({
    queryKey: ["psgc-regions"],
    queryFn: psgcApi.regions,
    staleTime: 1000 * 60 * 10,
  });
  const { data: provinces } = useQuery({
    queryKey: ["psgc-provinces", activeRegion],
    queryFn: () => psgcApi.regionProvinces(activeRegion!),
    enabled: !!activeRegion && !!activeProvince,
    staleTime: 1000 * 60 * 10,
  });
  const { data: cities } = useQuery({
    queryKey: ["psgc-cities-munis", activeRegion],
    queryFn: () => psgcApi.regionCitiesMunicipalities(activeRegion!),
    enabled: !!activeRegion && !!activeCityMuni,
    staleTime: 1000 * 60 * 10,
  });
  const { data: barangays } = useQuery({
    queryKey: ["psgc-barangays", activeCityMuni],
    queryFn: () => psgcApi.barangaysByCityMunicipality(activeCityMuni!),
    enabled: !!activeCityMuni && !!activeBarangay,
    staleTime: 1000 * 60 * 10,
  });
  // Same key as the Results table, so the count is shared, not fetched twice.
  const { data: page } = useQuery({
    queryKey: ["map-panel-records", datasetId, prefix, 1, filters],
    queryFn: () => fetchMapPanelRecords(datasetId!, prefix, 1, filters),
    enabled: !!datasetId,
    staleTime: 1000 * 30,
  });

  // Barangay records with no shape on the map (Political explorer, inside a selected city).
  // Same query key as the map layer, so the data is fetched once and shared.
  const shapes = useBarangayShapes();
  const { data: layer } = useQuery({
    queryKey: ["layer", datasetId, filters, prefix],
    queryFn: () => fetchDatasetLayer(datasetId!, filters, prefix),
    enabled: political && !!datasetId && !!activeCityMuni,
    staleTime: 1000 * 60 * 5,
  });
  const shapesSettled = !!shapes.data || shapes.error instanceof BarangayShapesUnavailable;
  const unmatched =
    political && layer && shapesSettled
      ? barangayCoverage(layer.layer_data, new Set((shapes.data?.features ?? []).map(barangayCode)))
          .withoutShape
      : null;

  const area: AreaPart[] = [];
  if (activeRegion)
    area.push({
      level: "region",
      code: activeRegion,
      name: regions?.find((r) => r.code === activeRegion)?.name ?? "Selected region",
    });
  if (activeProvince)
    area.push({
      level: "province",
      code: activeProvince,
      name:
        (provinces as { code: string; name: string }[] | undefined)?.find(
          (p) => p.code === activeProvince,
        )?.name ?? "Selected province",
    });
  if (activeCityMuni)
    area.push({
      level: "city",
      code: activeCityMuni,
      name:
        (cities as { code: string; name: string }[] | undefined)?.find(
          (c) => c.code === activeCityMuni,
        )?.name ?? "Selected city",
    });
  if (activeBarangay)
    area.push({
      level: "barangay",
      code: activeBarangay,
      name: barangays?.find((b) => b.code === activeBarangay)?.name ?? "Selected barangay",
    });

  const chips: SummaryChip[] = [];
  const place = areaChip(area);
  if (place) chips.push(place);
  chips.push(...filterChips(filters, dataset?.layer_config.filter_definitions ?? []));

  const total = datasetId ? (page?.total ?? null) : null;

  function removeChip(chip: SummaryChip) {
    if (chip.kind === "area") clearArea();
    else if (datasetId && chip.key) setDatasetFilters(datasetId, withoutFilter(filters, chip.key));
  }

  return {
    datasetId,
    dataset,
    area,
    prefix,
    filters,
    chips,
    total,
    unmatched,
    sentence: summarySentence({
      datasetName: dataset?.name ?? null,
      total,
      area,
      chipCount: chips.length,
      dataTypeLabel: political ? dataset?.data_type?.trim() || dataset?.name || null : null,
    }),
    removeChip,
    clearAll: clearAllNarrowing,
  };
}
