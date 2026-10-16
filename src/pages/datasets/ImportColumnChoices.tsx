import type { ImportColumn, WorkbookInspection } from "../../services/api/datasetApi";

const choices: { value: ImportColumn["role"]; label: string }[] = [
  { value: "field", label: "Extra detail" },
  { value: "participant_id", label: "Attendee reference / ID" },
  { value: "attendee_name", label: "Attendee name" },
  { value: "residence", label: "Home location code" },
  { value: "attendance_status", label: "Attendance status" },
  { value: "event_id", label: "Event reference (check file)" },
  { value: "event_name", label: "Event name (check file)" },
  { value: "ignore", label: "Do not import" },
];

export default function ImportColumnChoices({
  columns,
  inspection,
  onChange,
}: {
  columns: ImportColumn[];
  inspection: WorkbookInspection;
  onChange: (index: number, patch: Partial<ImportColumn>) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Choose what to use from your file</h2>
      <p className="text-sm text-slate-600">
        We suggested matches for familiar headers. Review them below. Choose one attendee reference
        and one home location column. Then tick the columns you want as dropdown filters.
      </p>
      <p className="text-xs text-slate-500">
        An attendee reference identifies the same person when you upload an updated list. Home
        location is where the attendee lives, not the event venue.
      </p>
      {columns.map((column, index) => {
        const field = !["ignore", "residence", "event_id", "event_name"].includes(column.role);
        const samples = inspection.columns.find((c) => c.source === column.source)?.samples ?? [];
        return (
          <div
            key={column.source}
            className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm break-words">{column.source}</p>
              <p className="mt-1 truncate text-xs text-slate-500" title={samples.join(", ")}>
                Examples: {samples.slice(0, 3).join(", ") || "No values"}
              </p>
            </div>
            <label className="text-xs text-slate-600">
              Use this column for
              <select
                aria-label={`Use ${column.source} for`}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                value={column.role}
                onChange={(e) => {
                  const role = e.target.value as ImportColumn["role"];
                  onChange(index, {
                    role,
                    ...(role === "participant_id"
                      ? { type: "text" as const, required: true, filter: false }
                      : {}),
                    ...(["ignore", "residence", "event_id", "event_name"].includes(role)
                      ? { filter: false, popup: false, required: false }
                      : {}),
                  });
                }}
              >
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Dropdown filter for ${column.source}`}
                  disabled={!field || column.role === "participant_id"}
                  checked={column.filter}
                  onChange={(e) =>
                    onChange(index, { filter: e.target.checked, filter_mode: "category" })
                  }
                />
                Dropdown filter
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Show ${column.source} in details`}
                  disabled={!field}
                  checked={column.popup}
                  onChange={(e) => onChange(index, { popup: e.target.checked })}
                />
                Show in details
              </label>
            </div>
            {column.filter && (
              <p className="text-xs text-slate-500 md:col-span-2">
                Each different value in {column.label} becomes an option for this dataset only.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
