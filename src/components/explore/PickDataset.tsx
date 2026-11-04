import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDatasets } from "../../services/api/datasetApi";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useTrayStore } from "../../stores/useTrayStore";

export default function PickDataset() {
  const selectedId = useDatasetLayerStore((s) => s.activeLayerDatasetId);
  const setActiveLayer = useDatasetLayerStore((s) => s.setActiveLayer);
  const setTab = useTrayStore((s) => s.setTab);
  const [search, setSearch] = useState("");

  const {
    data: datasets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["datasets", "active"],
    queryFn: () => fetchDatasets(true),
    staleTime: 1000 * 60 * 2,
  });

  const needle = search.trim().toLowerCase();
  const visible = datasets.filter((ds) =>
    [ds.name, ds.event_metadata?.date, ds.event_metadata?.category, ds.event_metadata?.organizer]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );

  function pick(id: number, level: string, selected: boolean) {
    if (selected) {
      setActiveLayer(null);
      setTab(null);
    } else {
      setActiveLayer(id, level);
      setTab("results");
    }
  }

  if (isError)
    return (
      <button type="button" className="text-xs underline" onClick={() => refetch()}>
        Could not load your events and lists. Try again
      </button>
    );

  if (!isLoading && datasets.length === 0)
    return (
      <p className="text-xs text-slate-500">
        No events or lists yet. Ask a data manager to import one.
      </p>
    );

  return (
    <div className="space-y-2">
      {datasets.length > 4 && (
        <input
          type="search"
          aria-label="Search events and lists"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, date or organizer…"
          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-team"
        />
      )}
      {isLoading && <p className="text-xs text-slate-400">Loading…</p>}
      <ul className="max-h-64 space-y-1.5 overflow-y-auto">
        {visible.map((ds) => {
          const selected = ds.id === selectedId;
          return (
            <li key={ds.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => pick(ds.id, ds.psgc_level, selected)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-team bg-team text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{ds.name}</span>
                  <span
                    className={`block text-[11px] ${selected ? "opacity-80" : "text-slate-400"}`}
                  >
                    {[
                      ds.event_metadata?.date,
                      ds.records_count !== undefined
                        ? `${ds.records_count.toLocaleString()} records`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || ds.entity_type}
                  </span>
                </span>
                {selected && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
        {!isLoading && visible.length === 0 && (
          <li className="text-xs text-slate-400">Nothing matches “{search}”.</li>
        )}
      </ul>
      {selectedId && (
        <p className="text-[11px] text-slate-400">
          Click the highlighted one again to stop viewing it.
        </p>
      )}
    </div>
  );
}
