import type { Dataset, WorkbookInspection } from "../../../services/api/datasetApi";
import type { GuidedConfiguration } from "../../../services/api/importSessionApi";
import { essentialProblem } from "../../../lib/guidedImport";
import ImportColumnCard from "./ImportColumnCard";
import { inputClass } from "./ImportFileStep";

export default function ImportColumnsStep({
  config,
  inspection,
  target,
  onChange,
}: {
  config: GuidedConfiguration;
  inspection: WorkbookInspection;
  target?: Dataset;
  onChange: (config: GuidedConfiguration) => void;
}) {
  const identifier = config.columns.find((c) => c.role === "participant_id");
  const name = config.columns.find((c) => c.role === "attendee_name");
  const chooseRole = (source: string, role: "participant_id" | "attendee_name") => {
    const existingId = target?.match_key_fields[0];
    onChange({
      ...config,
      columns: config.columns.map((c) =>
        c.source === source
          ? {
              ...c,
              role,
              ...(role === "participant_id"
                ? {
                    type:
                      config.type === "general" && existingId
                        ? (target?.field_definitions.find((f) => f.key === existingId)?.type ??
                          "text")
                        : "text",
                    required: true,
                    filter: false,
                    ...(existingId
                      ? {
                          key: existingId,
                          label:
                            target?.field_definitions.find((f) => f.key === existingId)?.label ??
                            c.label,
                        }
                      : {}),
                  }
                : { popup: true }),
            }
          : c.role === role
            ? { ...c, role: "field", required: false }
            : c,
      ),
      ...(role === "participant_id" && config.type === "general" && !target
        ? { match_key_fields: undefined }
        : {}),
    });
  };
  const samples = (source?: string) =>
    inspection.columns
      .find((c) => c.source === source)
      ?.samples.slice(0, 3)
      .join(", ") || "No sample values";
  const problem = essentialProblem(config);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-team/30 bg-team/5 p-5">
        <label className="block text-sm font-semibold text-slate-800">
          {config.type === "event"
            ? "Which column identifies each participant?"
            : "Which column identifies each record?"}
          <select
            className={inputClass}
            value={identifier?.source ?? ""}
            onChange={(e) => chooseRole(e.target.value, "participant_id")}
          >
            <option value="">Choose an identifier column</option>
            {config.columns.map((c) => (
              <option key={c.source}>{c.source}</option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-xs leading-5 text-slate-600">
          Use a registration number, reference, or stable ID. Repeat imports use it to find the same
          record. Names alone are not reliable identifiers. Keep this column as text.
        </p>
        {identifier && (
          <p className="mt-2 text-xs text-team">Sample values: {samples(identifier.source)}</p>
        )}
      </div>
      {config.type === "event" && (
        <label className="block text-sm font-medium text-slate-700">
          Attendee name <span className="font-normal text-slate-400">(optional)</span>
          <select
            className={inputClass}
            value={name?.source ?? ""}
            onChange={(e) => chooseRole(e.target.value, "attendee_name")}
          >
            <option value="">No name column</option>
            {config.columns
              .filter((c) => c.source !== identifier?.source)
              .map((c) => (
                <option key={c.source}>{c.source}</option>
              ))}
          </select>
          {name && (
            <span className="mt-2 block text-xs text-slate-500">
              Sample values: {samples(name.source)}
            </span>
          )}
        </label>
      )}
      <p className="text-sm leading-6 text-slate-500">
        Other columns are kept as extra details unless you choose otherwise. You can set up filters
        and change how fields appear below.
      </p>
      <details className="rounded-xl border border-slate-200">
        <summary className="cursor-pointer p-4 text-sm font-semibold text-slate-700">
          Customize your dataset <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-4">
          {config.columns.map((column, index) => (
            <ImportColumnCard
              key={column.source}
              column={column}
              config={config}
              target={target}
              samples={samples(column.source)}
              onChange={(patch) =>
                onChange({
                  ...config,
                  columns: config.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)),
                })
              }
            />
          ))}
          {config.type === "general" && (
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                Map measure
                <select
                  className={inputClass}
                  value={config.layer_config?.aggregate_function ?? "count"}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      layer_config: {
                        color_field: "",
                        tooltip_fields: [],
                        ...config.layer_config,
                        aggregate_function: e.target.value as "count" | "sum" | "average" | "max",
                      },
                    })
                  }
                >
                  {["count", "sum", "average", "max"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {config.layer_config?.aggregate_function !== "count" && (
                <label className="text-sm text-slate-600">
                  Number field
                  <select
                    className={inputClass}
                    value={config.layer_config?.color_field ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        layer_config: {
                          aggregate_function: "count",
                          tooltip_fields: [],
                          ...config.layer_config,
                          color_field: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Choose a number field</option>
                    {config.columns
                      .filter((c) => c.type === "number")
                      .map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>
      </details>
      {problem && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{problem}</p>}
    </div>
  );
}
