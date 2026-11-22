import { useState, type FormEvent } from "react";
import {
  deletePoliticalRecord,
  savePoliticalRecord,
  type Dataset,
  type DatasetRecord,
  type FieldDefinition,
} from "../../services/api/datasetApi";
import { importError } from "../../lib/guidedImport";
import { emptyArea, selectedLocationCode, type PoliticalArea } from "../../lib/politicalArea";
import AreaPicker from "./AreaPicker";

interface Props {
  dataset: Dataset;
  record?: DatasetRecord;
  initialArea: PoliticalArea;
  onBack: () => void;
  onSaved: (message: string) => void;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const levelLabel = {
  province: "province or city",
  city: "city or municipality",
  barangay: "barangay",
};

function RecordField({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDefinition;
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {field.label}
      {field.required && <span aria-hidden="true"> *</span>}
      {field.type === "select" ? (
        <select
          className={inputClass}
          value={value}
          disabled={locked}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose an option</option>
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          type={field.type}
          readOnly={locked}
          step={field.type === "number" ? "any" : undefined}
          required={field.required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export default function RecordForm({ dataset, record, initialArea, onBack, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      dataset.field_definitions.map((field) => [field.key, String(record?.data[field.key] ?? "")]),
    ),
  );
  const [area, setArea] = useState(record ? emptyArea : initialArea);
  const [changeLocation, setChangeLocation] = useState(
    !record || (!!dataset.political_entry && !record.psgc_code),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requiredLevel = dataset.layer_config.show_on_map === false ? null : dataset.psgc_level;
  const locationCode = selectedLocationCode(area, requiredLevel);
  const lockedFields = new Set(record && dataset.event_key ? dataset.match_key_fields : []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmDelete) return;
    if (requiredLevel && changeLocation && !locationCode) {
      setError(`Choose a ${levelLabel[requiredLevel]} location for this record category.`);
      return;
    }
    const data = Object.fromEntries(
      dataset.field_definitions
        .filter((field) => !lockedFields.has(field.key))
        .map((field) => {
          const value = values[field.key]?.trim();
          return [field.key, !value ? null : field.type === "number" ? Number(value) : value];
        }),
    );
    setBusy(true);
    setError("");
    try {
      await savePoliticalRecord(
        dataset.id,
        record?.id,
        data,
        changeLocation ? locationCode : undefined,
      );
      onSaved(record ? "Record updated." : "Record added.");
    } catch (failure) {
      setError(importError(failure));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!record || busy) return;
    setBusy(true);
    setError("");
    try {
      await deletePoliticalRecord(dataset.id, record.id);
      onSaved("Record deleted.");
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
        disabled={busy}
        onClick={onBack}
        className="text-sm font-medium text-team underline"
      >
        Back to list
      </button>
      <h2 className="text-lg font-semibold text-slate-900">
        {record ? "Edit record" : "Add record"}
      </h2>
      <p className="text-sm text-slate-600">{dataset.data_type || dataset.name}</p>
      <form onSubmit={(event) => void save(event)}>
        <fieldset disabled={busy || confirmDelete} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {dataset.field_definitions.map((field) => (
              <RecordField
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                locked={lockedFields.has(field.key)}
                onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
          </div>
          <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-sm font-semibold">
              Location{" "}
              {requiredLevel && changeLocation
                ? requiredLevel === "province"
                  ? "(province required, city optional)"
                  : `(${levelLabel[requiredLevel]} required)`
                : requiredLevel
                  ? ""
                  : "(optional)"}
            </legend>
            {changeLocation ? (
              <>
                <AreaPicker
                  mode="record"
                  area={area}
                  maxLevel={requiredLevel === "province" ? "city" : (requiredLevel ?? "barangay")}
                  onChange={setArea}
                />
                {record && (record.psgc_code || !dataset.political_entry) && (
                  <button
                    type="button"
                    className="text-xs text-team underline"
                    onClick={() => setChangeLocation(false)}
                  >
                    Keep saved location
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>{record?.psgc_code ? `Saved PSGC ${record.psgc_code}` : "No location"}</span>
                <button
                  type="button"
                  className="text-team underline"
                  onClick={() => {
                    setArea(emptyArea);
                    setChangeLocation(true);
                  }}
                >
                  Change location
                </button>
              </div>
            )}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-team px-4 py-2 text-sm font-semibold text-team-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : record ? "Save changes" : "Add record"}
            </button>
            {record && (
              <button
                type="button"
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                onClick={() => {
                  setError("");
                  setConfirmDelete(true);
                }}
              >
                Delete record
              </button>
            )}
          </div>
        </fieldset>
      </form>
      {confirmDelete && (
        <section
          aria-label="Confirm record deletion"
          className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
        >
          <p>Delete this record from {dataset.name}?</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-md bg-red-700 px-3 py-2 font-semibold text-white disabled:opacity-60"
            >
              Confirm delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-2 font-medium"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
