import { useQuery } from "@tanstack/react-query";
import {
  fetchDatasetCoverage,
  type DatasetCoverageItem,
} from "../../services/api/analyticsApi";
import { useMapStore } from "../../stores/useMapStore";
import type { MapAreaLevel } from "../../stores/useMapStore";

const ENTITY_COLORS: Record<string, string> = {
  person: "bg-red-100 text-red-700",
  establishment: "bg-rose-100 text-rose-700",
  location: "bg-orange-100 text-orange-700",
  event: "bg-red-50 text-red-500",
};

const LEVEL_LABELS: Record<string, string> = {
  region: "Region",
  province: "Province",
  municity: "Municipality / City",
};

/** Derives a PSGC prefix string suitable for a SQL LIKE query. */
function toPsgcPrefix(psgcCode: string, level: MapAreaLevel): string {
  if (level === "region") return psgcCode.substring(0, 2);
  if (level === "province") return psgcCode.substring(0, 4);
  return psgcCode; // municity — exact match prefix
}

function DatasetRow({ ds, max }: { ds: DatasetCoverageItem; max: number }) {
  const pct = max > 0 ? Math.round((ds.record_count / max) * 100) : 0;
  const colorClass =
    ENTITY_COLORS[ds.entity_type] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 truncate">
            {ds.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${colorClass}`}
          >
            {ds.entity_type}
          </span>
        </div>
        <div className="mt-1.5 overflow-hidden rounded-full bg-slate-200 h-1">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-sm font-bold tabular-nums text-red-700">
          {ds.record_count.toLocaleString()}
        </span>
        <p className="text-[9px] text-slate-400">records</p>
      </div>
    </div>
  );
}

export default function AnalyticsPanel() {
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const mapAreaLevel = useMapStore((s) => s.mapAreaLevel);

  const psgcPrefix = selectedLocation
    ? toPsgcPrefix(selectedLocation.psgcCode, mapAreaLevel)
    : null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-datasets", psgcPrefix],
    queryFn: () => fetchDatasetCoverage(psgcPrefix),
    staleTime: 30_000,
  });

  const areaLabel = selectedLocation ? selectedLocation.name : "All Regions";
  const levelLabel = selectedLocation ? LEVEL_LABELS[mapAreaLevel] : null;

  const datasets = data?.datasets ?? [];
  const maxCount = Math.max(...datasets.map((d) => d.record_count), 1);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {levelLabel ?? "Overview"}
          </p>
          <p className="text-xs font-semibold text-slate-700 truncate">
            {areaLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data && (
            <div className="rounded-md bg-red-600 px-2 py-1 flex items-center gap-1">
              <span className="text-white font-bold text-[11px] tabular-nums">
                {data.total_records.toLocaleString()}
              </span>
              <span className="text-red-200 text-[9px]">total</span>
            </div>
          )}
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex h-24 items-center justify-center gap-2 text-slate-400 text-xs">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            Loading…
          </div>
        )}

        {isError && (
          <div className="flex h-24 items-center justify-center">
            <p className="text-xs text-red-500">Failed to load data.</p>
          </div>
        )}

        {!isLoading && !isError && datasets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400 text-center px-4">
            <svg
              className="h-8 w-8 text-slate-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
              />
            </svg>
            <p className="text-xs font-medium text-slate-500">
              No datasets with records
              {selectedLocation ? ` in ${selectedLocation.name}` : ""}
            </p>
            {!selectedLocation && (
              <p className="text-[10px]">
                Click a region, province, or city on the map
              </p>
            )}
          </div>
        )}

        {!isLoading &&
          datasets.map((ds) => (
            <DatasetRow key={ds.id} ds={ds} max={maxCount} />
          ))}
      </div>

      {/* Footer: dataset count badge */}
      {!isLoading && datasets.length > 0 && (
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} with
            records
          </span>
          <span className="text-[10px] text-slate-400">
            {selectedLocation
              ? `in ${LEVEL_LABELS[mapAreaLevel]?.toLowerCase() ?? "area"}`
              : "across all areas"}
          </span>
        </div>
      )}
    </div>
  );
}
