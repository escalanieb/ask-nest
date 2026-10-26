import type { Dataset } from "../../../services/api/datasetApi";
import type { GuidedConfiguration } from "../../../services/api/importSessionApi";
import { inputClass } from "./ImportFileStep";

export default function ImportDetailsStep({
  config,
  datasets,
  target,
  onTarget,
  onChange,
}: {
  config: GuidedConfiguration;
  datasets: Dataset[];
  target: number | null;
  onTarget: (id: number | null) => void;
  onChange: (config: GuidedConfiguration) => void;
}) {
  const metadata = (key: keyof GuidedConfiguration["metadata"], value: string | number | null) =>
    onChange({ ...config, metadata: { ...config.metadata, [key]: value } });
  return (
    <div className="space-y-6">
      <label className="block text-sm font-semibold text-slate-700">
        Where should these records go?
        <select
          className={inputClass}
          value={target ?? ""}
          onChange={(e) => onTarget(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Create a new dataset</option>
          {datasets
            .filter((d) => d.is_active)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.event_key ? " · Event" : ""}
              </option>
            ))}
        </select>
      </label>
      {!target && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">
            What does this file contain?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                [
                  "event",
                  "Attendees for one event",
                  "One attendee per row, with a stable participant ID.",
                ],
                [
                  "general",
                  "A general dataset",
                  "People, establishments, locations, or other records.",
                ],
              ] as const
            ).map(([value, label, help]) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${config.type === value ? "border-team bg-team/5" : "border-slate-200"}`}
              >
                <input
                  className="mt-1 accent-[var(--team-accent)]"
                  type="radio"
                  name="import-type"
                  checked={config.type === value}
                  onChange={() => onChange({ ...config, type: value })}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {target && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {datasets.find((d) => d.id === target)?.allow_duplicates
            ? "This dataset allows duplicates. Each accepted row adds a record; existing records are not matched or removed."
            : "New identifiers add records. Existing identifiers are checked for changes. Records absent from your file stay in this dataset."}
        </p>
      )}
      {config.type === "event" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Event name <span className="text-red-600">*</span>
              <input
                className={inputClass}
                value={config.metadata.name ?? ""}
                onChange={(e) => metadata("name", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Event date <span className="text-red-600">*</span>
              <input
                className={inputClass}
                type="date"
                value={config.metadata.date ?? ""}
                onChange={(e) => metadata("date", e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Venue <span className="font-normal text-slate-400">(optional)</span>
            <input
              className={inputClass}
              value={config.metadata.venue ?? ""}
              onChange={(e) => metadata("venue", e.target.value)}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              The event venue is separate from attendees’ home locations. An event pin needs a
              verified venue location or coordinates.
            </span>
          </label>
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-600">
              More event details
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(["organizer", "category"] as const).map((key) => (
                <label key={key} className="text-sm capitalize text-slate-600">
                  {key} (optional)
                  <input
                    className={inputClass}
                    value={config.metadata[key] ?? ""}
                    onChange={(e) => metadata(key, e.target.value)}
                  />
                </label>
              ))}
              <label className="text-sm text-slate-600">
                Status
                <select
                  className={inputClass}
                  value={config.metadata.status}
                  onChange={(e) => metadata("status", e.target.value)}
                >
                  {["upcoming", "ongoing", "completed", "cancelled"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Event reference
                <input
                  className={inputClass}
                  disabled={!!target}
                  value={config.metadata.id ?? ""}
                  onChange={(e) => metadata("id", e.target.value)}
                />
              </label>
              {(["latitude", "longitude"] as const).map((key) => (
                <label key={key} className="text-sm capitalize text-slate-600">
                  Venue {key} (optional)
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={config.metadata[key] ?? ""}
                    onChange={(e) =>
                      metadata(key, e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          </details>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Dataset name <span className="text-red-600">*</span>
            <input
              className={inputClass}
              value={config.name ?? ""}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Record type
            <select
              className={inputClass}
              value={config.entity_type ?? "person"}
              onChange={(e) =>
                onChange({ ...config, entity_type: e.target.value as Dataset["entity_type"] })
              }
            >
              {["person", "establishment", "location", "event"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="text-xs leading-5 text-slate-500">
        These are draft settings. Your dataset and records change only when you select “Import
        records” after review.
      </p>
    </div>
  );
}
