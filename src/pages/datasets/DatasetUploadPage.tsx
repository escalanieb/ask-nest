import { useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDataset,
  fetchBatches,
  uploadDatasetFile,
  commitBatch,
  rollbackBatch,
  resolveConflict,
} from "../../services/api/datasetApi";
import type { UploadBatch, UploadPreview, ConflictResolution } from "../../services/api/datasetApi";

type PreviewTab = "new" | "updates" | "conflicts" | "rejected";

export default function DatasetUploadPage() {
  const { id } = useParams<{ id: string }>();
  const datasetId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [activeTab, setActiveTab] = useState<PreviewTab>("new");

  const { data: dataset } = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => fetchDataset(datasetId),
  });

  const { data: batchList, isLoading: loadingBatches } = useQuery({
    queryKey: ["batches", datasetId],
    queryFn: () => fetchBatches(datasetId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadDatasetFile(datasetId, file),
    onSuccess: (data) => {
      setPreview(data);
      qc.invalidateQueries({ queryKey: ["batches", datasetId] });
    },
  });

  const commit = useMutation({
    mutationFn: (batchId: number) => commitBatch(batchId),
    onSuccess: () => {
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["batches", datasetId] });
    },
  });

  const rollback = useMutation({
    mutationFn: (batchId: number) => rollbackBatch(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches", datasetId] }),
  });

  const resolve = useMutation({
    mutationFn: ({
      batchId,
      conflictId,
      resolution,
    }: {
      batchId: number;
      conflictId: number;
      resolution: Exclude<ConflictResolution, "pending">;
    }) => resolveConflict(batchId, conflictId, resolution),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches", datasetId] }),
  });

  function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Only .xlsx, .xls, or .csv files are supported.");
      return;
    }
    upload.mutate(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const pendingBatch = batchList?.data?.find((b) => b.status === "pending");
  const committedBatches = batchList?.data?.filter((b) => b.status !== "pending") ?? [];

  const tabs: PreviewTab[] = ["new", "updates", "conflicts", "rejected"];
  const tabCounts = preview
    ? {
        new: preview.stats.new,
        updates: preview.stats.updates,
        conflicts: preview.stats.conflicts,
        rejected: preview.stats.rejected,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to="/datasets" className="text-slate-400 hover:text-slate-700 transition-colors">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">Upload Records</h1>
          <p className="text-xs text-slate-400">{dataset?.name ?? "Loading…"}</p>
        </div>
        <button
          onClick={() => navigate(`/datasets/${id}/records`)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          View Records
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Pending batch notice */}
        {!preview && pendingBatch && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-4">
            <svg
              className="h-5 w-5 text-amber-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Uncommitted upload pending</p>
              <p className="text-xs text-amber-600 mt-0.5 truncate">
                {pendingBatch.original_filename}
              </p>
              {pendingBatch.stats && (
                <p className="text-xs text-amber-500 mt-1">
                  +{pendingBatch.stats.new} new · {pendingBatch.stats.updates} updated ·{" "}
                  {pendingBatch.stats.conflicts} conflicts · {pendingBatch.stats.rejected} rejected
                </p>
              )}
            </div>
            <button
              onClick={() => {
                if (confirm("Discard this pending upload? This cannot be undone.")) {
                  rollback.mutate(pendingBatch.id);
                }
              }}
              disabled={rollback.isPending}
              className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        )}

        {/* Drop Zone */}
        {!preview && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer py-16 flex flex-col items-center gap-3 ${
              dragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            {upload.isPending ? (
              <>
                <svg
                  className="h-8 w-8 animate-spin text-slate-400"
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
                <p className="text-sm text-slate-500 font-medium">Analysing file…</p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Drop your Excel or CSV file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    or click to browse • .xlsx, .xls, .csv • max 10 MB
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {upload.isError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
            {(upload.error as Error).message}
          </div>
        )}

        {/* Preview Panel */}
        {preview && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800 text-sm">Upload Preview</h2>
                <p className="text-xs text-slate-400 mt-0.5">Review changes before committing</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => commit.mutate(preview.batch_id)}
                  disabled={commit.isPending || preview.stats.conflicts > 0}
                  title={preview.stats.conflicts > 0 ? "Resolve all conflicts first" : undefined}
                  className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commit.isPending ? "Committing…" : "Commit"}
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 divide-x divide-slate-100">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-center transition-colors ${
                    activeTab === tab ? "bg-slate-50" : "hover:bg-slate-50/50"
                  }`}
                >
                  <p
                    className={`text-lg font-bold ${
                      tab === "new"
                        ? "text-green-600"
                        : tab === "updates"
                          ? "text-blue-600"
                          : tab === "conflicts"
                            ? "text-amber-600"
                            : "text-red-500"
                    }`}
                  >
                    {tabCounts?.[tab] ?? 0}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">
                    {tab}
                  </p>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {preview.preview[activeTab].length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-300">No {activeTab} records</p>
              ) : (
                <DataTable
                  rows={preview.preview[activeTab]}
                  isConflict={activeTab === "conflicts"}
                  batchId={preview.batch_id}
                  onResolve={resolve.mutate}
                />
              )}
            </div>
          </div>
        )}

        {/* Batch History */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
            Batch History
          </h2>
          {loadingBatches && <p className="text-xs text-slate-400">Loading…</p>}
          {!loadingBatches && committedBatches.length === 0 && (
            <p className="text-xs text-slate-300 italic">No committed batches yet</p>
          )}
          <div className="space-y-2">
            {committedBatches.map((batch) => (
              <BatchRow
                key={batch.id}
                batch={batch}
                onRollback={() => {
                  if (confirm("Roll back this batch? All imported records will be reverted.")) {
                    rollback.mutate(batch.id);
                  }
                }}
                rolling={rollback.isPending}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTable — shows rows from preview; handles conflict resolution inline
// ---------------------------------------------------------------------------
function DataTable({
  rows,
  isConflict,
  batchId,
  onResolve,
}: {
  rows: Record<string, unknown>[];
  isConflict: boolean;
  batchId: number;
  onResolve: (args: {
    batchId: number;
    conflictId: number;
    resolution: Exclude<ConflictResolution, "pending">;
  }) => void;
}) {
  if (rows.length === 0) return null;

  const allKeys = Array.from(
    new Set(
      rows.flatMap((r) => Object.keys(r).filter((k) => k !== "_conflict_id" && k !== "_reason")),
    ),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100">
            {isConflict && (
              <th className="py-2 pr-3 text-left text-slate-400 font-semibold">Reason</th>
            )}
            {allKeys.map((k) => (
              <th
                key={k}
                className="py-2 pr-3 text-left text-slate-400 font-semibold whitespace-nowrap"
              >
                {k}
              </th>
            ))}
            {isConflict && <th className="py-2 text-left text-slate-400 font-semibold">Resolve</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50">
              {isConflict && (
                <td
                  className="py-2 pr-3 text-amber-600 whitespace-nowrap max-w-[160px] truncate"
                  title={String(row._reason ?? "")}
                >
                  {String(row._reason ?? "—")}
                </td>
              )}
              {allKeys.map((k) => (
                <td
                  key={k}
                  className="py-2 pr-3 text-slate-600 whitespace-nowrap max-w-[180px] truncate"
                  title={String(row[k] ?? "")}
                >
                  {String(row[k] ?? "—")}
                </td>
              ))}
              {isConflict && row._conflict_id != null && (
                <td className="py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        onResolve({
                          batchId,
                          conflictId: Number(row._conflict_id),
                          resolution: "keep_existing",
                        })
                      }
                      className="rounded px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium transition-colors"
                    >
                      Keep
                    </button>
                    <button
                      onClick={() =>
                        onResolve({
                          batchId,
                          conflictId: Number(row._conflict_id),
                          resolution: "take_new",
                        })
                      }
                      className="rounded px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-medium transition-colors"
                    >
                      Take New
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BatchRow
// ---------------------------------------------------------------------------
function BatchRow({
  batch,
  onRollback,
  rolling,
}: {
  batch: UploadBatch;
  onRollback: () => void;
  rolling: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    committed: "bg-green-100 text-green-700",
    rolled_back: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColors[batch.status]}`}
      >
        {batch.status.replace("_", " ")}
      </span>
      <span className="flex-1 text-sm text-slate-700 font-medium truncate">
        {batch.original_filename}
      </span>
      <span className="text-xs text-slate-400 shrink-0">
        {batch.stats
          ? `+${batch.stats.new} new · ${batch.stats.updates} updated · ${batch.stats.rejected} rejected`
          : ""}
      </span>
      {batch.status === "committed" && (
        <button
          onClick={onRollback}
          disabled={rolling}
          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Rollback
        </button>
      )}
    </div>
  );
}
