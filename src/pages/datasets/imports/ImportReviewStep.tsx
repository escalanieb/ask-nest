import { AlertTriangle } from "lucide-react";
import type { GuidedConfiguration, GuidedReview } from "../../../services/api/importSessionApi";
import { secondaryClass } from "./ImportFileStep";

const labels = {
  new: "New records",
  updates: "Updates",
  skipped: "Unchanged",
  conflicts: "Conflicts",
  rejected: "Rows with errors",
};
export default function ImportReviewStep({
  review,
  config,
  category,
  exclusions,
  confirmed,
  onExclusions,
  onConfirmed,
  onCategory,
  onPage,
  onResolve,
  onDownload,
}: {
  review: GuidedReview;
  config: GuidedConfiguration;
  category: string;
  exclusions: boolean;
  confirmed: boolean;
  onExclusions: (value: boolean) => void;
  onConfirmed: (value: boolean) => void;
  onCategory: (category: string) => void;
  onPage: (page: number) => void;
  onResolve: (row: number, resolution: "keep_existing" | "take_new") => void;
  onDownload: () => void;
}) {
  const included =
    review.stats.new + review.stats.updates + review.stats.conflicts + review.stats.skipped;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {Object.entries(labels).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={category === key}
            className={`rounded-xl border p-3 text-left transition ${category === key ? "border-team bg-team/5" : "border-slate-200 hover:bg-slate-50"}`}
            onClick={() => onCategory(category === key ? "" : key)}
          >
            <span className="block text-xl font-semibold tabular-nums text-slate-800">
              {review.stats[key as keyof typeof labels]}
            </span>
            <span className="mt-1 block text-xs text-slate-500">{label}</span>
          </button>
        ))}
      </div>
      {review.pending_conflicts > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          <p>
            Resolve {review.pending_conflicts} conflicts before importing. Compare saved values with
            spreadsheet values below.
          </p>
        </div>
      )}
      <p className="text-sm leading-6 text-slate-600">
        {included.toLocaleString()} valid rows reviewed; {review.stats.rejected.toLocaleString()}{" "}
        rows will be excluded. {review.stats.unknown.toLocaleString()} valid rows have unknown
        locations. Unknown-location counts overlap the other categories.
      </p>
      <div className="space-y-3">
        {review.rows.map((row) =>
          row.category === "conflicts" ? (
            <article key={row.row} className="rounded-xl border border-amber-200 p-4">
              <div className="mb-3 flex flex-wrap justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  Worksheet row {row.row} · Conflicting values
                </h3>
                <span className="text-xs text-slate-500">
                  {row.resolution === "pending"
                    ? "Decision needed"
                    : row.resolution === "keep_existing"
                      ? "Keeping saved values"
                      : "Using spreadsheet values"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="p-2">Field</th>
                      <th className="p-2">Saved value</th>
                      <th className="p-2">Spreadsheet value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(row.data)
                      .filter((key) => row.data[key] !== row.existing?.[key])
                      .map((key) => (
                        <tr key={key} className="border-b border-slate-50">
                          <th className="p-2 font-medium">
                            {config.columns.find((c) => c.key === key)?.label ??
                              (key === "psgc_code" ? "Location" : key)}
                          </th>
                          <td className="p-2">
                            {String(
                              row.existing?.[key] ??
                                (key === "psgc_code" ? "Location unknown" : "Not provided"),
                            )}
                          </td>
                          <td className="p-2">
                            {String(
                              row.data[key] ??
                                (key === "psgc_code" ? "Location unknown" : "Not provided"),
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className={secondaryClass}
                  onClick={() => onResolve(row.row, "keep_existing")}
                >
                  Keep saved value
                </button>
                <button className={secondaryClass} onClick={() => onResolve(row.row, "take_new")}>
                  Use spreadsheet value
                </button>
              </div>
            </article>
          ) : (
            <article key={row.row} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-500">Worksheet row {row.row}</h3>
                <span
                  className={`text-xs font-medium ${row.category === "rejected" ? "text-red-700" : "text-team"}`}
                >
                  {labels[row.category]}
                </span>
              </div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {Object.entries(row.data)
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-[11px] text-slate-400">
                        {config.columns.find((c) => c.key === key)?.label ??
                          (key === "psgc_code" ? "Location" : key)}
                      </dt>
                      <dd className="mt-1 break-words text-xs text-slate-700">
                        {value === null
                          ? key === "psgc_code"
                            ? "Location unknown"
                            : "Not provided"
                          : String(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
              {row.errors.length > 0 && (
                <ul className="mt-3 list-inside list-disc text-xs leading-6 text-red-700">
                  {row.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </article>
          ),
        )}
      </div>
      {review.rows.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          No rows in this category.
        </p>
      )}
      {review.last_page > 1 && (
        <div className="flex items-center justify-between">
          <button
            className={secondaryClass}
            disabled={review.page <= 1}
            onClick={() => onPage(review.page - 1)}
          >
            Previous rows
          </button>
          <span className="text-xs text-slate-500">
            {review.page} / {review.last_page}
          </span>
          <button
            className={secondaryClass}
            disabled={review.page >= review.last_page}
            onClick={() => onPage(review.page + 1)}
          >
            Next rows
          </button>
        </div>
      )}
      {review.stats.rejected > 0 && (
        <>
          <button type="button" className={secondaryClass} onClick={onDownload}>
            Download rows with errors
          </button>
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <input
              className="mt-1.5"
              type="checkbox"
              checked={exclusions}
              onChange={(e) => onExclusions(e.target.checked)}
            />
            <span>
              Exclude {review.stats.rejected} rows with errors and import the valid records. I can
              correct the excluded rows in my spreadsheet and import them later.
            </span>
          </label>
        </>
      )}
      {config.type === "event" && (
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
          <input
            className="mt-1.5"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => onConfirmed(e.target.checked)}
          />
          <span>
            Every attendee in the selected worksheet belongs to{" "}
            <strong>{config.metadata.name}</strong>. This workbook represents one event.
          </span>
        </label>
      )}
      <p className="text-xs leading-5 text-slate-500">
        Nothing is published yet. Final confirmation saves the dataset settings and accepted changes
        together.
      </p>
    </div>
  );
}
