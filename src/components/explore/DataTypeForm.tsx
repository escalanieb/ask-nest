import { useRef, useState, type FormEvent } from "react";
import {
  deleteDatasetPermanently,
  savePoliticalDataType,
  type Dataset,
  type PoliticalDataTypeField,
  type PsgcLevel,
} from "../../services/api/datasetApi";
import { importError } from "../../lib/guidedImport";
import { columnFormatLabel, labelFor } from "../../lib/labels";

interface Props {
  dataset?: Dataset;
  onBack: () => void;
  onSaved: (dataset: Dataset) => void;
  onDeleted: (message: string) => void;
}

interface DraftField extends Omit<PoliticalDataTypeField, "options"> {
  id: number;
  optionsText: string;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const newField = (id: number): DraftField => ({
  id,
  label: "",
  type: "text",
  required: false,
  optionsText: "",
});
const parseOptions = (text: string) =>
  text
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);

function FieldEditor({
  field,
  onChange,
  onRemove,
}: {
  field: DraftField;
  onChange: (changes: Partial<DraftField>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-700">
          Field name
          <input
            className={inputClass}
            required
            maxLength={120}
            value={field.label}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Answer format
          <select
            className={inputClass}
            value={field.type}
            onChange={(event) => onChange({ type: event.target.value as DraftField["type"] })}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="choice">Pick from options</option>
          </select>
        </label>
      </div>
      {field.type === "choice" && (
        <label className="block text-xs font-medium text-slate-700">
          Options (one per line)
          <textarea
            className={inputClass}
            required
            rows={3}
            value={field.optionsText}
            onChange={(event) => onChange({ optionsText: event.target.value })}
          />
        </label>
      )}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => onChange({ required: event.target.checked })}
          />
          Required
        </label>
        {onRemove && (
          <button type="button" className="text-xs text-red-700 underline" onClick={onRemove}>
            Remove field
          </button>
        )}
      </div>
    </div>
  );
}

export default function DataTypeForm({ dataset, onBack, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(dataset?.name ?? "");
  const [showOnMap, setShowOnMap] = useState(dataset?.layer_config.show_on_map ?? false);
  const [level, setLevel] = useState<PsgcLevel>(
    dataset?.layer_config.show_on_map ? dataset.psgc_level : "city",
  );
  const [fields, setFields] = useState<DraftField[]>(() => (dataset ? [] : [newField(0)]));
  const nextId = useRef(1);
  const [newOptions, setNewOptions] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function editField(id: number, changes: Partial<DraftField>) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...changes } : field)),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmDelete) return;
    setBusy(true);
    setError("");
    try {
      const saved = await savePoliticalDataType(
        {
          name: name.trim(),
          show_on_map: showOnMap,
          psgc_level: showOnMap ? level : null,
          fields: fields.map((field) => ({
            label: field.label.trim(),
            type: field.type,
            required: field.required,
            ...(field.type === "choice" ? { options: parseOptions(field.optionsText) } : {}),
          })),
          choice_options: Object.fromEntries(
            Object.entries(newOptions)
              .map(([key, value]) => [key, parseOptions(value)] as const)
              .filter(([, options]) => options.length),
          ),
        },
        dataset?.id,
      );
      onSaved(saved);
    } catch (failure) {
      setError(importError(failure));
    } finally {
      setBusy(false);
    }
  }

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dataset || busy || confirmation !== dataset.name) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteDatasetPermanently(dataset.id, confirmation);
      onDeleted(result.message);
    } catch (failure) {
      setError(importError(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="text-sm font-medium text-team underline"
      >
        Back to list
      </button>
      <h2 className="text-lg font-semibold text-slate-900">
        {dataset ? "Edit record category" : "New record category"}
      </h2>
      <form onSubmit={(event) => void save(event)}>
        <fieldset disabled={busy || confirmDelete} className="space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className={inputClass}
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <section aria-label="Fields" className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Fields</h3>
            {dataset?.field_definitions.map((field) => (
              <div
                key={field.key}
                className="space-y-2 rounded-md border border-slate-200 p-3 text-sm"
              >
                <p>
                  <strong>{field.label}</strong>{" "}
                  <span className="text-slate-500">
                    · {field.type === "select" ? "Pick from options" : labelFor(columnFormatLabel, field.type)}
                    {field.required ? " · Required" : ""}
                  </span>
                </p>
                {field.type === "select" && (
                  <>
                    <p className="text-xs text-slate-600">{field.options?.join(", ")}</p>
                    <label className="block text-xs text-slate-700">
                      Add options to {field.label} (one per line)
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={newOptions[field.key] ?? ""}
                        onChange={(event) =>
                          setNewOptions((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            ))}
            {fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                onChange={(changes) => editField(field.id, changes)}
                onRemove={
                  dataset || fields.length > 1
                    ? () => {
                        setFields((current) => current.filter((item) => item.id !== field.id));
                      }
                    : undefined
                }
              />
            ))}
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
              disabled={fields.length + (dataset?.field_definitions.length ?? 0) >= 150}
              onClick={() => {
                const field = newField(nextId.current++);
                setFields((current) => [...current, field]);
              }}
            >
              Add field
            </button>
          </section>
          <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                role="switch"
                checked={showOnMap}
                onChange={(event) => setShowOnMap(event.target.checked)}
              />
              Show on map
            </label>
            {showOnMap && (
              <>
                <label className="block text-xs font-medium text-slate-700">
                  Required location level
                  <select
                    className={inputClass}
                    value={level}
                    onChange={(event) => setLevel(event.target.value as PsgcLevel)}
                  >
                    <option value="province">Province</option>
                    <option value="city">City or municipality</option>
                    <option value="barangay">Barangay</option>
                  </select>
                </label>
                {dataset && (
                  <p className="text-xs text-slate-600">
                    Every saved record needs a location at this level.
                  </p>
                )}
              </>
            )}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-team px-4 py-2 text-sm font-semibold text-team-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : dataset ? "Save changes" : "Create record category"}
            </button>
            {dataset && (
              <button
                type="button"
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                onClick={() => {
                  setError("");
                  setConfirmDelete(true);
                }}
              >
                Delete record category
              </button>
            )}
          </div>
        </fieldset>
      </form>
      {confirmDelete && dataset && (
        <form
          onSubmit={(event) => void remove(event)}
          aria-label="Confirm record category deletion"
          className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
        >
          <p>Deleting {dataset.name} permanently removes its records and imports.</p>
          <label className="block font-medium">
            Type {dataset.name} to confirm
            <input
              className={inputClass}
              disabled={busy}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || confirmation !== dataset.name}
              className="rounded-md bg-red-700 px-3 py-2 font-semibold text-white disabled:opacity-60"
            >
              Confirm delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmation("");
                setConfirmDelete(false);
              }}
              className="px-3 py-2 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
