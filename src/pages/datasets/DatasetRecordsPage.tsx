import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDataset,
  fetchRecords,
  fetchRecord,
  updateRecord,
  updateRecordStatus,
} from "../../services/api/datasetApi";
import type { DatasetRecord, RecordHistoryEntry } from "../../services/api/datasetApi";

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deactivated: "Deactivated",
  restored: "Restored",
  batch_rolled_back: "Batch Rollback",
};

export default function DatasetRecordsPage() {
  const { id } = useParams<{ id: string }>();
  const datasetId = Number(id);
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<DatasetRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const { data: dataset } = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => fetchDataset(datasetId),
  });

  const recordsKey = ["records", datasetId, page, search, statusFilter];
  const { data: records, isLoading } = useQuery({
    queryKey: recordsKey,
    queryFn: () =>
      fetchRecords(datasetId, {
        page: String(page),
        per_page: "25",
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["record", datasetId, selectedRecord?.id],
    queryFn: () => fetchRecord(datasetId, selectedRecord!.id),
    enabled: !!selectedRecord,
  });

  const saveEdit = useMutation({
    mutationFn: () =>
      updateRecord(datasetId, selectedRecord!.id, editData as Record<string, unknown>),
    onSuccess: (updated) => {
      setSelectedRecord(updated);
      setEditMode(false);
      qc.invalidateQueries({ queryKey: recordsKey });
      qc.invalidateQueries({ queryKey: ["record", datasetId, updated.id] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (status: "active" | "inactive") =>
      updateRecordStatus(datasetId, selectedRecord!.id, status),
    onSuccess: (updated) => {
      setSelectedRecord(updated);
      qc.invalidateQueries({ queryKey: recordsKey });
      qc.invalidateQueries({ queryKey: ["record", datasetId, updated.id] });
    },
  });

  function startEdit() {
    if (!selectedRecord) return;
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(selectedRecord.data)) {
      stringified[k] = String(v ?? "");
    }
    setEditData(stringified);
    setEditMode(true);
  }

  const fields = dataset?.field_definitions ?? [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
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
          <h1 className="text-lg font-bold text-slate-800">Records</h1>
          <p className="text-xs text-slate-400">{dataset?.name ?? "Loading…"}</p>
        </div>
        <Link
          to={`/datasets/${id}/upload`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Upload
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Records Table */}
        <div
          className={`flex flex-col flex-1 overflow-hidden ${selectedRecord ? "w-1/2" : "w-full"}`}
        >
          {/* Filters */}
          <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
            <input
              className="input flex-1 max-w-xs"
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="input w-36"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {records && (
              <span className="text-xs text-slate-400 shrink-0">
                {records.total.toLocaleString()} records
              </span>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                Loading…
              </div>
            )}
            {!isLoading && records && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold text-slate-400 whitespace-nowrap">
                      PSGC
                    </th>
                    {fields.slice(0, 4).map((f) => (
                      <th
                        key={f.key}
                        className="px-3 py-2.5 text-left font-semibold text-slate-400 whitespace-nowrap"
                      >
                        {f.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-400">Status</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-400">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.data.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => {
                        setSelectedRecord(record);
                        setEditMode(false);
                      }}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        selectedRecord?.id === record.id ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      <td className="px-5 py-2 font-mono text-slate-500">{record.psgc_code}</td>
                      {fields.slice(0, 4).map((f) => (
                        <td
                          key={f.key}
                          className="px-3 py-2 text-slate-700 max-w-[160px] truncate"
                          title={String(record.data[f.key] ?? "")}
                        >
                          {String(record.data[f.key] ?? "—")}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            record.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(record.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {records && records.last_page > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white shrink-0">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Page {page} of {records.last_page}
              </span>
              <button
                disabled={page === records.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRecord && (
          <div className="w-[420px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 shrink-0">
              <p className="flex-1 font-semibold text-slate-800 text-sm truncate">
                Record #{selectedRecord.id}
              </p>
              {!editMode && (
                <button
                  onClick={startEdit}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() =>
                  toggleStatus.mutate(selectedRecord.status === "active" ? "inactive" : "active")
                }
                disabled={toggleStatus.isPending}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  selectedRecord.status === "active"
                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                    : "border-green-200 text-green-700 hover:bg-green-50"
                }`}
              >
                {selectedRecord.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-300 hover:text-slate-600 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* PSGC info */}
              <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  PSGC Code
                </p>
                <p className="mt-0.5 font-mono text-sm text-slate-700">
                  {selectedRecord.psgc_code}
                </p>
              </div>

              {/* Fields — view or edit */}
              <div className="px-5 py-4 space-y-3">
                {editMode ? (
                  <>
                    {fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                          {f.label}
                        </label>
                        {f.type === "select" && f.options?.length ? (
                          <select
                            className="input text-sm"
                            value={editData[f.key] ?? ""}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                [f.key]: e.target.value,
                              }))
                            }
                          >
                            <option value="">—</option>
                            {f.options.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="input text-sm"
                            type={
                              f.type === "number" ? "number" : f.type === "date" ? "date" : "text"
                            }
                            value={editData[f.key] ?? ""}
                            onChange={(e) =>
                              setEditData((d) => ({
                                ...d,
                                [f.key]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    ))}
                    {saveEdit.isError && (
                      <p className="text-xs text-red-600">{(saveEdit.error as Error).message}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit.mutate()}
                        disabled={saveEdit.isPending}
                        className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                      >
                        {saveEdit.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  fields.map((f) => (
                    <div key={f.key}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {f.label}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-700">
                        {String(selectedRecord.data[f.key] ?? "—")}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* History */}
              {!editMode && (
                <div className="px-5 pb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                    Audit Trail
                  </p>
                  {loadingDetail ? (
                    <p className="text-xs text-slate-300">Loading history…</p>
                  ) : (
                    <HistoryList entries={detail?.history ?? []} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function HistoryList({ entries }: { entries: RecordHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-slate-300 italic">No history</p>;
  }
  return (
    <ol className="relative border-l border-slate-100 ml-2 space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-4">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-slate-300" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <span className="text-[10px] text-slate-300">
              {new Date(entry.changed_at).toLocaleString()}
            </span>
          </div>
          {entry.changed_by_user && (
            <p className="text-[10px] text-slate-400">{entry.changed_by_user.name}</p>
          )}
          {entry.batch && (
            <p className="text-[10px] text-slate-300 italic">{entry.batch.original_filename}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
