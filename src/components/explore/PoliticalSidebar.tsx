import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { downloadDatasetFile, fetchDataTypes, filterQuery } from "../../services/api/datasetApi";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useTrayStore } from "../../stores/useTrayStore";
import { useExplore } from "../../hooks/useExplore";
import { geographicPrefix } from "../../lib/geographicPrefix";
import {
  defaultDatasetFor,
  optionForDataset,
  optionLabel,
  selectionIsStale,
} from "../../lib/politicalExplore";
import { ElectionCountdown } from "../dashboard/SourceTools";
import AreaPicker from "./AreaPicker";
import Step from "./Step";

/**
 * Political team sidebar: choose where (Region > Province > City > Barangay),
 * then choose one of the data types that actually has records there.
 */
export default function PoliticalSidebar() {
  const { activeRegion, activeProvince, activeCityMuni, activeBarangay } = useFilterStore();
  const prefix = geographicPrefix({ activeRegion, activeProvince, activeCityMuni, activeBarangay });
  const datasetId = useDatasetLayerStore((s) => s.activeLayerDatasetId);
  const setActiveLayer = useDatasetLayerStore((s) => s.setActiveLayer);
  const setTab = useTrayStore((s) => s.setTab);
  const { filters } = useExplore();
  const [error, setError] = useState("");

  const {
    data: options,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["data-types", prefix ?? "all"],
    queryFn: () => fetchDataTypes(prefix),
    staleTime: 1000 * 30,
  });

  // The chosen data disappears from the list when the area changes: stop showing it.
  useEffect(() => {
    if (options && selectionIsStale(options, datasetId)) {
      setActiveLayer(null);
      setTab(null);
    }
  }, [options, datasetId, setActiveLayer, setTab]);

  const current = options ? optionForDataset(options, datasetId) : undefined;

  function chooseDataset(id: number, level: string) {
    setActiveLayer(id, level);
    setTab("results");
  }

  function chooseType(key: string) {
    const option = options?.find((o) => o.key === key);
    if (!option) {
      setActiveLayer(null);
      setTab(null);
      return;
    }
    const id = defaultDatasetFor(option);
    chooseDataset(id, option.datasets.find((d) => d.id === id)?.psgc_level ?? "city");
  }

  return (
    <>
      <ElectionCountdown />
      <Step n={1} title="Where?" hint="Pick as much or as little of the area as you need.">
        <AreaPicker withBarangay />
      </Step>
      <Step n={2} title="What do you want to see?">
        {isLoading && <p className="text-xs text-slate-400">Checking what data is available…</p>}
        {isError && (
          <button type="button" className="text-xs underline" onClick={() => refetch()}>
            Could not load the available data. Try again
          </button>
        )}
        {options && options.length === 0 && (
          <p className="text-xs text-slate-500">No data available for this area.</p>
        )}
        {options && options.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs text-slate-700">
              Data
              <select
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                value={current?.key ?? ""}
                onChange={(e) => chooseType(e.target.value)}
              >
                <option value="">Choose what to show…</option>
                {options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {optionLabel(o)}
                  </option>
                ))}
              </select>
            </label>
            {current && current.datasets.length > 1 && (
              <label className="block text-xs text-slate-700">
                Which list?
                <select
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                  value={datasetId ?? ""}
                  onChange={(e) => {
                    const ds = current.datasets.find((d) => d.id === Number(e.target.value));
                    if (ds) chooseDataset(ds.id, ds.psgc_level);
                  }}
                >
                  {current.datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.record_count.toLocaleString()})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {current && datasetId && (
              <button
                type="button"
                className="text-xs font-semibold text-slate-600 underline"
                onClick={() => {
                  setError("");
                  downloadDatasetFile(
                    `/datasets/${datasetId}/records/export${filterQuery(filters, prefix)}`,
                    `${current.label.replace(/[^\w-]+/g, "-")}.csv`,
                  ).catch(() => setError("Download failed. Please try again."));
                }}
              >
                Download this list (CSV)
              </button>
            )}
            {error && (
              <p role="alert" className="text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
        )}
      </Step>
    </>
  );
}
