import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  downloadDatasetFile,
  fetchDatasetFilterOptions,
  filterQuery,
  type FilterDefinition,
} from "../../services/api/datasetApi";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useExplore } from "../../hooks/useExplore";
import { LOCATION_KEY, splitQuickFilters } from "../../lib/exploreSummary";

type Value = NonNullable<ReturnType<typeof useExplore>["filters"][string]>;

function FilterField({
  def,
  value,
  onChange,
}: {
  def: FilterDefinition;
  value: Value;
  onChange: (next: Value) => void;
}) {
  if (def.type === "category") {
    const options = Array.from(new Set([...(value.values ?? []), ...(def.values ?? [])]));
    const selected = (value.values?.length ?? 0) + (value.missing ? 1 : 0);
    return (
      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">
          {def.label}
          <span className="ml-2 text-slate-400">{selected ? `${selected} chosen` : "Any"}</span>
        </summary>
        <div className="max-h-44 overflow-y-auto border-t border-slate-100 p-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 py-1 text-xs">
              <input
                type="checkbox"
                checked={value.values?.includes(option) ?? false}
                onChange={(e) =>
                  onChange({
                    ...value,
                    values: e.target.checked
                      ? [...(value.values ?? []), option]
                      : (value.values ?? []).filter((v) => v !== option),
                  })
                }
              />
              {option}
            </label>
          ))}
          {def.has_missing && (
            <label className="flex items-center gap-2 py-1 text-xs italic text-slate-500">
              <input
                type="checkbox"
                checked={value.missing ?? false}
                onChange={(e) => onChange({ ...value, missing: e.target.checked })}
              />
              (blank)
            </label>
          )}
          {def.has_more && (
            <p className="pt-1 text-[11px] text-slate-400">
              There are more choices than shown. Use “Search for more choices” below.
            </p>
          )}
        </div>
      </details>
    );
  }
  if (def.type === "search")
    return (
      <label className="block text-xs text-slate-700">
        {def.label} contains
        <input
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          value={value.search ?? ""}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </label>
    );
  const inputType = def.type === "date" ? "date" : "number";
  return (
    <fieldset className="text-xs text-slate-700">
      <legend className="mb-1">{def.label}</legend>
      <div className="flex gap-2">
        {(["min", "max"] as const).map((bound) => (
          <label key={bound} className="min-w-0 flex-1">
            {bound === "min" ? "From" : "To"}
            <input
              type={inputType}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
              value={value[bound] ?? ""}
              onChange={(e) => onChange({ ...value, [bound]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function NarrowFilters() {
  const { datasetId, filters, prefix } = useExplore();
  const setDatasetFilters = useDatasetLayerStore((s) => s.setDatasetFilters);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["dataset-filter-options", datasetId, search],
    queryFn: () => fetchDatasetFilterOptions(datasetId!, search),
    enabled: !!datasetId,
  });

  if (!datasetId)
    return (
      <p className="text-xs text-slate-500">Pick an event or list above to see its filters.</p>
    );

  const defs = query.data?.data ?? [];
  const { quick, more } = splitQuickFilters(defs);
  const update = (key: string, value: Value) =>
    setDatasetFilters(datasetId, { ...filters, [key]: value });
  const locationMode = filters[LOCATION_KEY]?.values?.[0] ?? "";

  const render = (def: FilterDefinition) => (
    <FilterField
      key={def.key}
      def={def}
      value={filters[def.key] ?? {}}
      onChange={(next) => update(def.key, next)}
    />
  );

  return (
    <div className="space-y-2">
      {query.isLoading && <p className="text-xs text-slate-400">Loading filters…</p>}
      {query.isError && (
        <button type="button" className="text-xs underline" onClick={() => query.refetch()}>
          Could not load filters. Try again
        </button>
      )}
      {!query.isLoading && !query.isError && defs.length === 0 && (
        <p className="text-xs text-slate-500">No extra filters for this list.</p>
      )}
      {quick.map(render)}
      {more.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-team">
            More filters ({more.length})
          </summary>
          <div className="mt-2 space-y-2">{more.map(render)}</div>
        </details>
      )}
      <label className="block text-xs text-slate-700">
        Show
        <select
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          value={locationMode}
          onChange={(e) => update(LOCATION_KEY, { values: e.target.value ? [e.target.value] : [] })}
        >
          <option value="">Everyone</option>
          <option value="provided">Only people with a known location</option>
          <option value="unknown">Only people with no known location</option>
        </select>
      </label>
      {locationMode === "unknown" && prefix && (
        <p className="text-xs text-amber-800">
          People with no known location can’t belong to an area. Remove the area to see them.
        </p>
      )}
      {defs.some((d) => d.has_more) && (
        <label className="block text-xs text-slate-700">
          Search for more choices
          <input
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      )}
      <button
        type="button"
        className="text-xs font-semibold text-slate-600 underline"
        onClick={() =>
          downloadDatasetFile(
            `/datasets/${datasetId}/records/export${filterQuery(filters, prefix)}`,
            "filtered-records.csv",
          ).catch(() => setError("Download failed. Please try again."))
        }
      >
        Download this list (CSV)
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
