import type { Dataset, ImportColumn } from "../../../services/api/datasetApi";
import type { GuidedConfiguration } from "../../../services/api/importSessionApi";
import { inputClass } from "./ImportFileStep";
export default function ImportColumnCard({
  column,
  config,
  target,
  samples,
  onChange,
}: {
  column: ImportColumn;
  config: GuidedConfiguration;
  target?: Dataset;
  samples: string;
  onChange: (patch: Partial<ImportColumn>) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{column.source}</p>
          <p className="mt-1 truncate text-xs text-slate-500" title={samples}>
            {samples}
          </p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          Use this column for
          <select
            aria-label={`Use ${column.source} for`}
            className={inputClass}
            value={column.role}
            onChange={(e) =>
              onChange({
                role: e.target.value as ImportColumn["role"],
                ...(["ignore", "residence", "event_id", "event_name"].includes(e.target.value)
                  ? { filter: false, popup: false, required: false }
                  : {}),
              })
            }
          >
            {[
              ["field", "Extra detail"],
              ["participant_id", "Stable identifier"],
              ["attendee_name", "Attendee name"],
              ["attendance_status", "Attendance status"],
              ["residence", "Location source only"],
              ["event_id", "Event reference: check file"],
              ["event_name", "Event name: check file"],
              ["ignore", "Do not import"],
            ]
              .filter(
                ([role]) => config.type === "event" || !["event_id", "event_name"].includes(role),
              )
              .map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </div>
      {!["ignore", "residence", "event_id", "event_name"].includes(column.role) && (
        <>
          {target && (
            <label className="mt-3 block text-xs font-medium text-slate-600">
              Save to dataset field
              <select
                className={inputClass}
                value={target.field_definitions.some((f) => f.key === column.key) ? column.key : ""}
                onChange={(e) => {
                  const field = target.field_definitions.find((f) => f.key === e.target.value);
                  if (field)
                    onChange({
                      key: field.key,
                      label: field.label,
                      type: field.type,
                      options: field.options,
                      required: field.required ?? false,
                    });
                }}
              >
                <option value="">New additional field</option>
                {target.field_definitions.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Dropdown filter for ${column.source}`}
                disabled={column.role === "participant_id"}
                checked={column.filter}
                onChange={(e) => onChange({ filter: e.target.checked, filter_mode: "category" })}
              />
              Use as a filter
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Show ${column.source} in details`}
                checked={column.popup}
                onChange={(e) => onChange({ popup: e.target.checked })}
              />
              Show in details
            </label>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-500">
              Advanced field settings
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-600">
                Display name
                <input
                  className={inputClass}
                  value={column.label}
                  onChange={(e) => onChange({ label: e.target.value })}
                />
              </label>
              <label className="text-xs text-slate-600">
                Data type
                <select
                  className={inputClass}
                  disabled={
                    column.role === "participant_id" ||
                    !!target?.field_definitions.some((f) => f.key === column.key)
                  }
                  value={column.type}
                  onChange={(e) =>
                    onChange({
                      type: e.target.value as ImportColumn["type"],
                      filter_mode: "category",
                    })
                  }
                >
                  {[
                    "text",
                    "number",
                    "date",
                    "category",
                    ...(config.type === "general" ? ["select", "email", "url"] : []),
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Internal field key
                <input
                  className={inputClass}
                  disabled={!!target?.field_definitions.some((f) => f.key === column.key)}
                  value={column.key}
                  onChange={(e) => onChange({ key: e.target.value })}
                />
              </label>
              {column.type === "date" && (
                <label className="text-xs text-slate-600">
                  Spreadsheet date format
                  <select
                    className={inputClass}
                    value={column.date_format ?? "Y-m-d"}
                    onChange={(e) =>
                      onChange({
                        date_format: e.target.value as ImportColumn["date_format"],
                      })
                    }
                  >
                    {["Y-m-d", "m/d/Y", "d/m/Y"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {column.filter && (
                <label className="text-xs text-slate-600">
                  Filter style
                  <select
                    className={inputClass}
                    value={column.filter_mode ?? "category"}
                    onChange={(e) =>
                      onChange({
                        filter_mode: e.target.value as ImportColumn["filter_mode"],
                      })
                    }
                  >
                    <option value="category">Dropdown</option>
                    <option value="search">Text search</option>
                    {column.type === "number" && <option value="range">Number range</option>}
                    {column.type === "date" && <option value="date">Date range</option>}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  disabled={column.role === "participant_id"}
                  checked={column.required}
                  onChange={(e) => onChange({ required: e.target.checked })}
                />
                Required value
              </label>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
