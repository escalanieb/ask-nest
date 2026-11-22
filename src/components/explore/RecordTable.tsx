import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  downloadDatasetFile,
  fetchRecords,
  type Dataset,
  type DatasetRecord,
} from "../../services/api/datasetApi";
import { noShapeNote, summarySentence, type AreaPart } from "../../lib/exploreSummary";

interface Props {
  dataset: Dataset;
  area: AreaPart[];
  prefix?: string;
  unmatched: number | null;
  onEdit?: (record: DatasetRecord) => void;
}

const PAGE_SIZE = 25;
const cellClass = "min-w-32 border-b border-slate-100 px-3 py-2 text-left";

function RecordNumberCell({
  number,
  announce,
}: {
  number?: string;
  announce: (message: string) => void;
}) {
  if (!number) return <td className={cellClass}>—</td>;

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      announce(`Copied ${value}.`);
    } catch {
      announce(`Could not copy ${value}. You can copy it from the CSV.`);
    }
  }

  return (
    <td className={cellClass}>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="font-mono">{number}</span>
        <button
          type="button"
          className="rounded border border-slate-300 px-1.5 py-0.5 text-xs font-medium text-team hover:bg-slate-50"
          aria-label={`Copy record number ${number}`}
          onClick={(event) => {
            event.stopPropagation();
            void copy(number);
          }}
        >
          Copy
        </button>
      </div>
    </td>
  );
}

export default function RecordTable({ dataset, area, prefix, unmatched, onEdit }: Props) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const params = {
    workspace: "1",
    ...(prefix ? { psgc_prefix: prefix } : {}),
    ...(appliedSearch ? { search: appliedSearch } : {}),
  };
  const results = useQuery({
    queryKey: ["dataset-workspace-records", dataset.id, prefix, appliedSearch, page],
    queryFn: () =>
      fetchRecords(dataset.id, { ...params, per_page: String(PAGE_SIZE), page: String(page) }),
  });
  const total = results.data?.total ?? null;
  const lastPage = results.data?.last_page ?? 1;
  const label = dataset.data_type || dataset.name;

  async function exportRecords() {
    setExporting(true);
    setExportError("");
    try {
      const query = new URLSearchParams(params);
      await downloadDatasetFile(
        `/datasets/${dataset.id}/records/export?${query}`,
        `${label.replace(/[^\w-]+/g, "-")}.csv`,
      );
    } catch {
      setExportError("Could not export these records. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-3" aria-label="Records">
      <p className="text-sm font-semibold text-slate-800" aria-live="polite">
        {summarySentence({
          datasetName: dataset.name,
          total,
          area,
          chipCount: 0,
          dataTypeLabel: label,
        })}
      </p>
      {prefix && (
        <p className="text-xs text-slate-500">
          Choose all regions to see records with no location.
        </p>
      )}
      {!!unmatched && <p className="text-xs text-amber-800">{noShapeNote(unmatched)}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1 text-xs font-medium text-slate-700">
          Search records
          <input
            type="search"
            maxLength={200}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setCopyMessage("");
            }}
          />
        </label>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          disabled={exporting || total === null || total === 0 || search.trim() !== appliedSearch}
          onClick={() => void exportRecords()}
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      {exportError && (
        <p role="alert" className="text-sm text-red-700">
          {exportError}
        </p>
      )}
      <div role="status" className={copyMessage ? "text-sm text-slate-600" : "sr-only"}>
        {copyMessage}
      </div>
      {results.isPending && (
        <p role="status" className="text-sm text-slate-500">
          Loading records…
        </p>
      )}
      {results.isError && (
        <button
          type="button"
          className="text-sm text-team underline"
          onClick={() => void results.refetch()}
        >
          Could not load records. Try again
        </button>
      )}
      {total === 0 && (
        <p className="rounded-md border border-slate-200 p-4 text-sm text-slate-600">
          {appliedSearch
            ? "No records match this search."
            : prefix
              ? "No records in this area."
              : "No records yet."}
        </p>
      )}
      {!!results.data?.data.length && (
        <div
          className="overflow-x-auto rounded-lg border border-slate-200"
          tabIndex={0}
          aria-label="Scrollable records table"
        >
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-700">
              <tr>
                <th scope="col" className={cellClass}>
                  Record number
                </th>
                {dataset.field_definitions.map((field) => (
                  <th key={field.key} scope="col" className={cellClass}>
                    {field.label.trim().toLowerCase() === "record number"
                      ? `${field.label} (custom)`
                      : field.label}
                  </th>
                ))}
                <th scope="col" className={cellClass}>
                  Location (PSGC)
                </th>
                <th scope="col" className={cellClass}>
                  Status
                </th>
                {onEdit && (
                  <th scope="col" className={cellClass}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {results.data.data.map((record) => (
                <tr
                  key={record.id}
                  className={
                    onEdit
                      ? "cursor-pointer hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-team"
                      : undefined
                  }
                  tabIndex={onEdit ? 0 : undefined}
                  onClick={onEdit ? () => onEdit(record) : undefined}
                  onKeyDown={
                    onEdit
                      ? (event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            onEdit(record);
                          }
                        }
                      : undefined
                  }
                >
                  <RecordNumberCell number={record.record_number} announce={setCopyMessage} />
                  {dataset.field_definitions.map((field) => (
                    <td key={field.key} className={cellClass}>
                      {String(record.data[field.key] ?? "—")}
                    </td>
                  ))}
                  <td className={cellClass}>{record.psgc_code ?? "No location"}</td>
                  <td className={cellClass}>
                    {record.status === "inactive" ? "Inactive" : "Active"}
                  </td>
                  {onEdit && (
                    <td className={cellClass}>
                      <button
                        type="button"
                        className="font-medium text-team underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(record);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lastPage > 1 && (
        <nav aria-label="Record pages" className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1}
            className="p-2 text-team disabled:opacity-40"
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage}
            className="p-2 text-team disabled:opacity-40"
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
