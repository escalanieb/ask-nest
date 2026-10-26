import { UploadCloud, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import type { WorkbookInspection } from "../../../services/api/datasetApi";

export const inputClass =
  "mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-team focus:ring-2 focus:ring-team/20";
export const secondaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-team px-5 py-2.5 text-sm font-semibold text-team-foreground transition hover:bg-team-strong disabled:cursor-not-allowed disabled:opacity-50";

export default function ImportFileStep({
  file,
  inspection,
  originalName,
  onFile,
  onInspect,
  reviewed,
  onReviewed,
}: {
  file: File | null;
  inspection: WorkbookInspection | null;
  originalName?: string | null;
  onFile: (file: File, replace: boolean) => void;
  onInspect: (sheet: string, row: number) => void;
  reviewed: boolean;
  onReviewed: (value: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [replace, setReplace] = useState(false);
  const previewRows = inspection
    ? Array.from({ length: Math.min(5, inspection.row_count) }, (_, i) => ({
        number: inspection.header_row + i + 1,
        cells: inspection.columns.map(
          (c, j) => inspection.sample_rows?.[i]?.[j] ?? c.samples[i] ?? "—",
        ),
      }))
    : [];
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center transition data-[dragging=true]:border-team data-[dragging=true]:bg-team/5"
        data-dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0], replace);
        }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-team">
          <UploadCloud size={26} aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          {originalName && !file
            ? "Reselect your spreadsheet to continue"
            : "Start with your spreadsheet"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Use the file you already have. We’ll help you choose the right worksheet and match its
          columns.
        </p>
        <input
          ref={fileInput}
          aria-label="Choose spreadsheet"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) onFile(chosen, replace);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={`${primaryClass} mt-5`}
          onClick={() => fileInput.current?.click()}
        >
          {originalName && !file ? "Reselect file" : file ? "Choose another file" : "Choose file"}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          or drop a file here · Excel or CSV · up to 10 MB
        </p>
      </div>
      {originalName && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm">
          <FileSpreadsheet className="shrink-0 text-team" size={20} aria-hidden="true" />
          <span className="min-w-0 flex-1 break-all font-medium">{file?.name ?? originalName}</span>
          <span className="text-xs text-slate-500">
            {inspection
              ? `${inspection.row_count.toLocaleString()} data rows`
              : "File contents are not saved in your setup draft"}
          </span>
        </div>
      )}
      {originalName && (
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            className="mt-1 accent-[var(--team-accent)]"
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          I’m replacing the original file. Recheck my columns and prepare a fresh review.
        </label>
      )}
      {inspection && (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto]">
            <label className="text-sm font-medium text-slate-700">
              Worksheet
              <select
                className={inputClass}
                value={inspection.sheet}
                onChange={(e) => onInspect(e.target.value, 0)}
              >
                {inspection.sheets.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Header row
              <input
                className={inputClass}
                type="number"
                min={1}
                max={50}
                defaultValue={inspection.header_row}
                key={`${inspection.sheet}-${inspection.header_row}`}
                onBlur={(e) => {
                  const value = e.currentTarget.valueAsNumber;
                  if (!Number.isFinite(value) || !Number.isInteger(value)) return;
                  if (value >= 1 && value <= 50 && value !== inspection.header_row)
                    onInspect(inspection.sheet, value);
                }}
              />
            </label>
            <div className="flex items-end">
              <button className={secondaryClass} onClick={() => onInspect(inspection.sheet, 0)}>
                <RefreshCw size={15} aria-hidden="true" />
                Suggest header
              </button>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            We suggested a header from the first 50 rows. Check the preview; change the row number
            if the column names look wrong.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">First five rows from the selected worksheet</caption>
              <thead className="bg-slate-50">
                <tr>
                  {inspection.columns.map((c) => (
                    <th
                      className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700"
                      key={c.source}
                    >
                      {c.source}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row) => (
                  <tr key={row.number}>
                    {inspection.columns.map((c, j) => (
                      <td className="max-w-48 truncate px-4 py-3 text-slate-500" key={c.source}>
                        {row.cells[j]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {inspection.sheets.length > 1 && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <input
                className="mt-1"
                type="checkbox"
                checked={reviewed}
                onChange={(e) => onReviewed(e.target.checked)}
              />
              <span>
                Import only <strong>{inspection.sheet}</strong>. I reviewed the other populated
                sheets and understand they will be excluded:{" "}
                {inspection.sheets.filter((s) => s !== inspection.sheet).join(", ")}.
              </span>
            </label>
          )}
        </>
      )}
    </div>
  );
}
