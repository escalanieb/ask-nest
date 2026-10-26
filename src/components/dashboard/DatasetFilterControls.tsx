import { useMapStore } from "../../stores/useMapStore";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDatasetFilterOptions,
  downloadDatasetFile,
  filterQuery,
} from "../../services/api/datasetApi";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { geographicPrefix } from "../../lib/datasetQuery";
export default function DatasetFilterControls() {
  const id = useDatasetLayerStore((s) => s.activeLayerDatasetId);
  const all = useDatasetLayerStore((s) => s.filtersByDataset);
  const set = useDatasetLayerStore((s) => s.setDatasetFilters);
  const geo = useFilterStore();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const filters = id ? (all[id] ?? {}) : {};
  const query = useQuery({
    queryKey: ["dataset-filter-options", id, search],
    queryFn: () => fetchDatasetFilterOptions(id!, search),
    enabled: !!id,
  });
  if (!id)
    return (
      <p className="p-3 text-xs text-slate-500">
        Choose an imported event or dataset to see its filters.
      </p>
    );
  const update = (key: string, value: (typeof filters)[string]) =>
    set(id, { ...filters, [key]: value });
  return (
    <div className="space-y-3 p-3 text-xs">
      <p className="text-slate-500">
        Filters apply to this dataset only. Multiple fields narrow results together.
      </p>
      <button
        className="underline"
        onClick={() => {
          set(id, {});
          geo.setActiveRegion(null);
          useMapStore.getState().setSelectedLocation(null);
          if (useMapStore.getState().mapAreaLevel === "municity")
            useMapStore.getState().setMapAreaLevel("region");
        }}
      >
        Clear dataset and area filters
      </button>
      <label className="block">
        Location status
        <select
          className="mt-1 block w-full rounded border p-2"
          value={filters.__location_status?.values?.[0] ?? ""}
          onChange={(e) =>
            update("__location_status", { values: e.target.value ? [e.target.value] : [] })
          }
        >
          <option value="">All records</option>
          <option value="unknown">Location unknown</option>
          <option value="provided">Location provided</option>
        </select>
      </label>
      {filters.__location_status?.values?.includes("unknown") && geographicPrefix(geo) && (
        <p className="text-amber-800">
          Unknown locations cannot match a selected area. Clear the area filter to see them.
        </p>
      )}
      {query.isLoading && <p>Loading filters…</p>}
      {query.isError && (
        <button onClick={() => query.refetch()}>Could not load filters. Retry</button>
      )}
      <label className="block">
        Find dropdown options
        <input
          className="block w-full border rounded p-2 mt-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {query.data?.data.map((def) => {
        const value = filters[def.key] ?? {};
        return (
          <fieldset key={def.key} className="border rounded p-2 space-y-2">
            <legend className="font-semibold px-1">{def.label}</legend>
            {def.type === "category" ? (
              <>
                <details className="rounded-lg border border-slate-300 bg-white">
                  <summary
                    aria-label={`Filter by ${def.label}`}
                    className="cursor-pointer px-3 py-2 font-medium"
                  >
                    {value.values?.length ? `${value.values.length} selected` : "All values"}
                  </summary>
                  <div className="max-h-48 overflow-y-auto border-t border-slate-200 p-2">
                    {Array.from(new Set([...(value.values ?? []), ...(def.values ?? [])])).map(
                      (option) => (
                        <label className="flex gap-2 py-1" key={option}>
                          <input
                            type="checkbox"
                            checked={value.values?.includes(option) ?? false}
                            onChange={(e) =>
                              update(def.key, {
                                ...value,
                                values: e.target.checked
                                  ? [...(value.values ?? []), option]
                                  : value.values?.filter((v) => v !== option),
                              })
                            }
                          />
                          {option}
                        </label>
                      ),
                    )}
                  </div>
                  {(value.values?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      className="m-2 underline"
                      onClick={() => update(def.key, { ...value, values: [] })}
                    >
                      Clear selection
                    </button>
                  )}
                </details>
                {def.has_more && <p>More values available. Search dropdown options above.</p>}
              </>
            ) : def.type === "search" ? (
              <input
                aria-label={def.label}
                className="border rounded p-1 w-full"
                value={value.search ?? ""}
                onChange={(e) => update(def.key, { ...value, search: e.target.value })}
              />
            ) : (
              <div className="flex gap-2">
                {(["min", "max"] as const).map((bound) => (
                  <label key={bound} className="min-w-0">
                    {bound === "min" ? "From" : "To"}
                    <input
                      type={def.type === "date" ? "date" : "number"}
                      className="border rounded p-1 w-full"
                      value={value[bound] ?? ""}
                      onChange={(e) => update(def.key, { ...value, [bound]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            )}
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={value.missing ?? false}
                onChange={(e) => update(def.key, { ...value, missing: e.target.checked })}
              />
              Include missing values
            </label>
          </fieldset>
        );
      })}
      {query.data?.data.length === 0 && <p>This dataset has no configured attendee filters.</p>}
      <button
        className="underline font-semibold"
        onClick={() =>
          downloadDatasetFile(
            "/datasets/" + id + "/records/export" + filterQuery(filters, geographicPrefix(geo)),
            "filtered-attendees.csv",
          ).catch(() => setError("Download failed. Please retry."))
        }
      >
        Export filtered records
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
