import { useEffect, useRef, useState } from "react";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDatasets,
  activateDataset,
  deactivateDataset,
  deleteDatasetPermanently,
  downloadDatasetTemplate,
} from "../../services/api/datasetApi";
import type { Dataset } from "../../services/api/datasetApi";

const ENTITY_COLORS: Record<string, string> = {
  person: "bg-blue-100 text-blue-700",
  establishment: "bg-purple-100 text-purple-700",
  location: "bg-green-100 text-green-700",
  event: "bg-orange-100 text-orange-700",
};

export default function DatasetListPage() {
  const navigate = useNavigate();
  const [eventSearch, setEventSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (deleteTarget) deleteDialog.current?.showModal();
    else deleteDialog.current?.close();
  }, [deleteTarget]);

  const {
    data: datasets = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => fetchDatasets(),
  });

  const visibleDatasets = datasets.filter((ds) => {
    const meta = ds.event_metadata;
    const text = [ds.name, meta?.id, meta?.category, meta?.organizer, meta?.status]
      .join(" ")
      .toLowerCase();
    return (
      text.includes(eventSearch.toLowerCase()) &&
      (!fromDate || (!!meta?.date && meta.date >= fromDate)) &&
      (!toDate || (!!meta?.date && meta.date <= toDate))
    );
  });

  const template = useMutation({ mutationFn: downloadDatasetTemplate });

  const activate = useMutation({
    mutationFn: (id: number) => activateDataset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["datasets"] }),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivateDataset(id),
    onSuccess: (_, id) => {
      useDatasetLayerStore.setState((state) => {
        const active = state.activeLayerDatasetIds.filter((selected) => selected !== id);
        return {
          activeLayerDatasetIds: active,
          activeLayerDatasetId: active[0] ?? null,
          activeLayerPsgcLevel: datasets.find((ds) => ds.id === active[0])?.psgc_level ?? null,
          choroplethSelection: null,
        };
      });
      qc.invalidateQueries();
    },
  });
  const purge = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => deleteDatasetPermanently(id, name),
    onSuccess: (result, { id }) => {
      useDatasetLayerStore.setState((state) => {
        const active = state.activeLayerDatasetIds.filter((selected) => selected !== id);
        const filters = { ...state.filtersByDataset };
        delete filters[id];
        return {
          activeLayerDatasetIds: active,
          activeLayerDatasetId: active[0] ?? null,
          activeLayerPsgcLevel: datasets.find((ds) => ds.id === active[0])?.psgc_level ?? null,
          filtersByDataset: filters,
          choroplethSelection: null,
        };
      });
      qc.removeQueries({
        predicate: (query) =>
          [
            "dataset",
            "dataset-layer",
            "layer",
            "dataset-filter-options",
            "records",
            "record",
            "batches",
          ].includes(String(query.queryKey[0])) && String(query.queryKey[1]) === String(id),
      });
      qc.invalidateQueries();
      setNotice(result.message);
      setDeleteTarget(null);
      setConfirmation("");
    },
  });

  function confirmActivate(ds: Dataset) {
    if (confirm(`Activate "${ds.name}"?`)) {
      activate.mutate(ds.id);
    }
  }

  function confirmDeactivate(ds: Dataset) {
    if (confirm(`Deactivate "${ds.name}"? Records will be preserved.`)) {
      deactivate.mutate(ds.id);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {template.isError && (
        <p role="alert" className="p-4 text-red-700">
          {template.error.message}
        </p>
      )}
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-slate-400 hover:text-slate-700 transition-colors">
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
          <h1 className="text-lg font-bold text-slate-800">Datasets</h1>
          <p className="text-xs text-slate-400">
            Your team’s imported data, records and upload history
          </p>
        </div>
        <Link
          to="/datasets/import"
          className="flex items-center gap-2 rounded-lg bg-team px-4 py-2 text-sm font-semibold text-white hover:bg-team-strong transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Import dataset
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {notice && (
          <p role="status" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            {notice}
          </p>
        )}
        {(activate.isError || deactivate.isError) && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            Could not update the dataset. Please retry.
          </p>
        )}
        <p className="mb-5 text-sm text-slate-600">
          Import one attendee workbook per event, or open an existing dataset to view records and
          upload history.
        </p>
        <div className="mb-5 flex flex-wrap gap-3 text-xs">
          <label>
            Event, category, organizer or status
            <input
              className="block border rounded p-2"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
          </label>
          <label>
            From
            <input
              className="block border rounded p-2"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              className="block border rounded p-2"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
        {!isLoading && !!datasets.length && !visibleDatasets.length && (
          <p>No datasets match these filters.</p>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
            Loading datasets…
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
            Failed to load datasets. Check that the backend is running.
          </div>
        )}

        {!isLoading && !isError && datasets.length === 0 && (
          <div className="text-center py-20">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg
                className="h-7 w-7 text-slate-300"
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
            </div>
            <p className="text-slate-500 font-medium">No datasets yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Create your first dataset to start importing records
            </p>
            <Link
              to="/datasets/import"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-team px-4 py-2 text-sm font-semibold text-white hover:bg-team-strong transition-colors"
            >
              Import dataset
            </Link>
          </div>
        )}

        {datasets.length > 0 && (
          <div className="grid gap-4">
            {visibleDatasets.map((ds) => (
              <div
                key={ds.id}
                className={`rounded-xl border bg-white shadow-sm transition-all ${
                  ds.is_active ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Status dot */}
                  <div
                    className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${ds.is_active ? "bg-green-500" : "bg-slate-300"}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-slate-800 text-sm">{ds.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ENTITY_COLORS[ds.entity_type] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {ds.entity_type}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 uppercase tracking-wide">
                        {ds.psgc_level}
                      </span>
                      {!ds.is_active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400 uppercase tracking-wide">
                          Inactive
                        </span>
                      )}
                    </div>
                    {ds.description && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-1">{ds.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      {ds.event_metadata && (
                        <span>
                          {ds.event_metadata.date} · {ds.event_metadata.organizer} ·{" "}
                          {ds.event_metadata.category} · {ds.event_metadata.status}
                        </span>
                      )}
                      <span>{ds.field_definitions?.length ?? 0} fields</span>
                      <span className="h-3 w-px bg-slate-200" />
                      <span>{(ds.records_count ?? 0).toLocaleString()} active records</span>
                      <span className="h-3 w-px bg-slate-200" />
                      <span>by {ds.creator?.name ?? "—"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex max-w-[420px] flex-wrap justify-end items-center gap-2 shrink-0">
                    <button
                      onClick={() => template.mutate(ds.id)}
                      disabled={template.isPending}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      title="Download Excel template"
                    >
                      Template
                    </button>
                    <button
                      onClick={() => navigate(`/datasets/${ds.id}/records`)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Records
                    </button>
                    <button
                      onClick={() => navigate(`/datasets/${ds.id}/upload`)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Upload
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          ds.event_key
                            ? `/datasets/import?dataset=${ds.id}`
                            : `/datasets/${ds.id}/edit`,
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                    {ds.is_active ? (
                      <button
                        onClick={() => confirmDeactivate(ds)}
                        disabled={deactivate.isPending}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => confirmActivate(ds)}
                        disabled={activate.isPending}
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => {
                        purge.reset();
                        setConfirmation("");
                        setDeleteTarget(ds);
                      }}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete permanently
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <dialog
        ref={deleteDialog}
        onCancel={(event) => {
          if (purge.isPending) event.preventDefault();
        }}
        onClose={() => {
          if (!purge.isPending) setDeleteTarget(null);
        }}
        aria-labelledby="delete-dataset-title"
        aria-describedby="delete-dataset-help"
        className="fixed inset-0 m-auto w-[min(92vw,480px)] rounded-xl border border-slate-200 p-6 shadow-xl backdrop:bg-slate-900/50"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (deleteTarget && confirmation === deleteTarget.name)
              purge.mutate({ id: deleteTarget.id, name: confirmation });
          }}
        >
          <h2 id="delete-dataset-title" className="text-lg font-semibold text-slate-900">
            Delete dataset permanently?
          </h2>
          <p id="delete-dataset-help" className="my-3 text-sm text-slate-600">
            This removes {deleteTarget?.name}, all its records, upload history and uploaded
            workbooks. It cannot be undone through rollback. Choose Deactivate instead to preserve
            the data.
          </p>
          <label className="block text-sm font-medium">
            Type the dataset name to confirm
            <strong className="my-2 block break-words">{deleteTarget?.name}</strong>
            <input
              aria-label="Dataset name confirmation"
              className="w-full rounded-lg border border-slate-300 p-2"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={purge.isPending}
              required
              autoComplete="off"
            />
          </label>
          {purge.isError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              Deletion failed. Check the dataset name and retry. {purge.error.message}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              disabled={purge.isPending}
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={purge.isPending || !deleteTarget || confirmation !== deleteTarget.name}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {purge.isPending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
