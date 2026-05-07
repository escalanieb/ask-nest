import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import {
  fetchDataset,
  fetchMapPanelRecords,
} from "../../services/api/datasetApi";

// Max columns to show in the compact panel
const MAX_COLUMNS = 3;

/**
 * Content-only component — rendered inside a WidgetShell (which provides the
 * Rnd drag/resize chrome). No positioning or Rnd here.
 */
export default function DatasetRecordsPanel() {
  const activeLayerDatasetId = useDatasetLayerStore(
    (s) => s.activeLayerDatasetId,
  );
  const choroplethSelection = useDatasetLayerStore(
    (s) => s.choroplethSelection,
  );

  const psgcPrefix = choroplethSelection?.prefix;

  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the dataset or area filter changes
  useEffect(() => {
    setPage(1);
  }, [activeLayerDatasetId, psgcPrefix]);

  const { data: dataset, isLoading: dsLoading } = useQuery({
    queryKey: ["dataset", activeLayerDatasetId],
    queryFn: () => fetchDataset(activeLayerDatasetId!),
    enabled: !!activeLayerDatasetId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: records, isLoading: recLoading } = useQuery({
    queryKey: ["map-panel-records", activeLayerDatasetId, psgcPrefix, page],
    queryFn: () =>
      fetchMapPanelRecords(activeLayerDatasetId!, psgcPrefix, page),
    enabled: !!activeLayerDatasetId,
    staleTime: 1000 * 30,
  });

  if (!activeLayerDatasetId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2 px-6 text-center">
        <svg
          className="h-8 w-8 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p>Select a dataset layer in the sidebar to view records.</p>
      </div>
    );
  }

  const fieldDefs = dataset?.field_definitions ?? [];
  // Use the dataset's own field definitions (first MAX_COLUMNS non-url fields preferred)
  const columns =
    fieldDefs.length > 0
      ? [
          ...fieldDefs.filter((f) => f.type !== "url"),
          ...fieldDefs.filter((f) => f.type === "url"),
        ].slice(0, MAX_COLUMNS)
      : [];

  const isLoading = dsLoading || recLoading;
  const total = records?.total ?? 0;
  const rows = records?.data ?? [];
  const areaLabel = choroplethSelection?.name ?? "All Areas";
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sub-header: dataset + area context */}
      <div className="shrink-0 border-b border-slate-100 bg-red-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-red-700 truncate">
              {dataset?.name ?? "Loading…"}
            </p>
            <p className="text-[9px] text-slate-500 truncate">{areaLabel}</p>
          </div>
          <div className="shrink-0 rounded-md bg-red-600 px-2 py-1 flex items-center gap-1">
            <svg
              className="h-3 w-3 text-red-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-white font-bold text-[11px] tabular-nums">
              {isLoading ? "—" : total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-slate-400 text-xs gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading records…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-slate-400 text-xs gap-1">
            <svg
              className="h-5 w-5 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            No records for this area
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide w-8">
                  #
                </th>
                {columns.length > 0 ? (
                  columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide"
                    >
                      {col.label}
                    </th>
                  ))
                ) : (
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide">
                    Data
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-red-50 transition-colors">
                  <td className="px-3 py-2 text-slate-400 tabular-nums">
                    {idx + 1}
                  </td>
                  {columns.length > 0 ? (
                    columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 text-slate-700 max-w-[160px] truncate"
                      >
                        {String(row.data[col.key] ?? "—")}
                      </td>
                    ))
                  ) : (
                    <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">
                      {JSON.stringify(row.data)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {!isLoading && rows.length > 0 && totalPages > 1 && (
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
