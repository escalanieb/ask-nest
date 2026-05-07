import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchDataset,
  createDataset,
  updateDataset,
} from "../../services/api/datasetApi";
import type {
  DatasetPayload,
  FieldDefinition,
  LayerConfig,
  EntityType,
  PsgcLevel,
} from "../../services/api/datasetApi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ENTITY_TYPES: EntityType[] = [
  "person",
  "establishment",
  "location",
  "event",
];
const PSGC_LEVELS: PsgcLevel[] = ["barangay", "city", "province"];
const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "email",
  "url",
] as const;
const AGGREGATE_FNS = ["count", "sum", "average", "max"] as const;

const STEPS = [
  { id: 1, label: "Basic Info", short: "Name & type" },
  { id: 2, label: "Fields", short: "Column definitions" },
  { id: 3, label: "Dedup Keys", short: "Match criteria" },
  { id: 4, label: "Map Layer", short: "Choropleth config" },
  { id: 5, label: "Review", short: "Confirm & save" },
];

function emptyField(): FieldDefinition {
  return { key: "", label: "", type: "text", required: false, options: [] };
}
function emptyLayer(): LayerConfig {
  return {
    color_field: "__count__",
    aggregate_function: "count",
    tooltip_fields: [{ field: "__count__", label: "Total" }],
    filter_fields: [],
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DatasetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => fetchDataset(Number(id)),
    enabled: isEdit,
  });

  // ---- form state ----
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("person");
  const [psgcLevel, setPsgcLevel] = useState<PsgcLevel>("city");
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [fields, setFields] = useState<FieldDefinition[]>([emptyField()]);
  const [matchKeys, setMatchKeys] = useState<string[]>([]);
  const [layerConfig, setLayerConfig] = useState<LayerConfig>(emptyLayer());

  // ---- wizard state ----
  const [currentStep, setCurrentStep] = useState(1);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // ---- populate on edit ----
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setEntityType(existing.entity_type);
      setPsgcLevel(existing.psgc_level);
      setAllowDuplicates(existing.allow_duplicates);
      setFields(existing.field_definitions);
      setMatchKeys(existing.match_key_fields);
      setLayerConfig(existing.layer_config);
      // mark all steps done so user can jump freely in edit mode
      setDoneSteps(new Set([1, 2, 3, 4]));
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: (payload: DatasetPayload) =>
      isEdit ? updateDataset(Number(id), payload) : createDataset(payload),
    onSuccess: () => navigate("/datasets"),
  });

  // ---------------------------------------------------------------------------
  // Per-step validation
  // ---------------------------------------------------------------------------
  function validateStep(step: number): Record<string, string> {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!name.trim()) errs.name = "Name is required";
    }
    if (step === 2) {
      if (fields.some((f) => !f.key.trim()))
        errs.fields = "All fields must have a key";
      if (fields.some((f) => !f.label.trim()))
        errs.fields = "All fields must have a label";
      const keys = fields.map((f) => f.key.trim());
      if (new Set(keys).size !== keys.length)
        errs.fields = "Field keys must be unique";
    }
    if (step === 3) {
      if (matchKeys.length === 0)
        errs.matchKeys = "Select at least one match key";
    }
    if (step === 4) {
      if (!layerConfig.color_field) errs.layer = "Color field is required";
    }
    return errs;
  }

  function handleNext() {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors({});
    setDoneSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    setStepErrors({});
    setCurrentStep((s) => s - 1);
  }

  function handleJump(step: number) {
    if (step <= currentStep || doneSteps.has(step - 1) || step === 1) {
      setStepErrors({});
      setCurrentStep(step);
    }
  }

  function handleSubmit() {
    save.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      entity_type: entityType,
      psgc_level: psgcLevel,
      match_key_fields: matchKeys,
      field_definitions: fields.map((f) => ({
        ...f,
        key: f.key.trim(),
        label: f.label.trim(),
        options: f.type === "select" ? (f.options ?? []) : undefined,
      })),
      layer_config: layerConfig,
      allow_duplicates: allowDuplicates,
    });
  }

  // helpers
  function updateField(index: number, patch: Partial<FieldDefinition>) {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }
  function removeField(index: number) {
    const removed = fields[index].key;
    setFields((prev) => prev.filter((_, i) => i !== index));
    setMatchKeys((prev) => prev.filter((k) => k !== removed));
  }
  function toggleMatchKey(key: string) {
    setMatchKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const definedKeys = fields.map((f) => f.key.trim()).filter(Boolean);

  if (isEdit && loadingExisting) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* ── Top header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link
          to="/datasets"
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">
            {isEdit ? "Edit Dataset" : "New Dataset"}
          </h1>
          <p className="text-xs text-slate-400">
            {isEdit
              ? `Editing: ${existing?.name}`
              : "Create a new universal dataset"}
          </p>
        </div>
        <span className="text-xs text-slate-400">
          Step {currentStep} of {STEPS.length}
        </span>
      </header>

      {/* ── Step progress bar ── */}
      <div className="sticky top-[73px] z-10 bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center">
          {STEPS.map((step, idx) => {
            const isDone = doneSteps.has(step.id);
            const isCurrent = currentStep === step.id;
            const isReachable =
              step.id === 1 ||
              doneSteps.has(step.id - 1) ||
              step.id <= currentStep;

            return (
              <div
                key={step.id}
                className="flex items-center flex-1 last:flex-none"
              >
                {/* Circle + label */}
                <button
                  type="button"
                  disabled={!isReachable}
                  onClick={() => handleJump(step.id)}
                  className="flex flex-col items-center gap-1.5 group disabled:cursor-not-allowed min-w-[48px]"
                >
                  <span
                    className={`flex items-center justify-center h-8 w-8 rounded-full border-2 text-xs font-bold transition-all
                      ${
                        isCurrent
                          ? "border-red-600 bg-red-600 text-white shadow-md shadow-red-200"
                          : isDone
                            ? "border-green-500 bg-green-500 text-white"
                            : isReachable
                              ? "border-slate-300 bg-white text-slate-500 group-hover:border-slate-400"
                              : "border-slate-200 bg-slate-50 text-slate-300"
                      }`}
                  >
                    {isDone && !isCurrent ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-semibold hidden sm:block whitespace-nowrap ${
                      isCurrent
                        ? "text-red-600"
                        : isDone
                          ? "text-green-600"
                          : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${
                      doneSteps.has(step.id) ? "bg-green-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-6 py-8">
          {/* STEP 1 — Basic Information */}
          {currentStep === 1 && (
            <StepShell
              title="Basic Information"
              hint="Name the dataset, classify what it tracks, and set the geographic level."
            >
              <div className="space-y-4">
                <Field label="Dataset Name" error={stepErrors.name} required>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Barangay Residents"
                    autoFocus
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    className="input min-h-[80px] resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this dataset represent? (optional)"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Entity Type" required>
                    <select
                      className="input"
                      value={entityType}
                      onChange={(e) =>
                        setEntityType(e.target.value as EntityType)
                      }
                    >
                      {ENTITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      The kind of thing each record represents.
                    </p>
                  </Field>

                  <Field label="PSGC Level" required>
                    <select
                      className="input"
                      value={psgcLevel}
                      onChange={(e) =>
                        setPsgcLevel(e.target.value as PsgcLevel)
                      }
                    >
                      {PSGC_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Which boundary records are grouped by on the map.
                    </p>
                  </Field>
                </div>

                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 flex-shrink-0"
                    checked={allowDuplicates}
                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      Allow duplicate entries
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      When enabled, each upload row is always inserted as a new
                      record regardless of match keys.
                    </p>
                  </div>
                </label>
              </div>
            </StepShell>
          )}

          {/* STEP 2 — Field Definitions */}
          {currentStep === 2 && (
            <StepShell
              title="Field Definitions"
              hint="Each field becomes one column in the Excel upload template. Use snake_case keys and human-readable labels."
              error={stepErrors.fields}
              action={
                <button
                  type="button"
                  onClick={() => setFields((p) => [...p, emptyField()])}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Add Field
                </button>
              }
            >
              <div className="space-y-3">
                {fields.map((field, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                          Key
                        </label>
                        <input
                          className="input text-sm"
                          value={field.key}
                          onChange={(e) =>
                            updateField(i, {
                              key: e.target.value
                                .replace(/\s+/g, "_")
                                .toLowerCase(),
                            })
                          }
                          placeholder="field_key"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                          Label
                        </label>
                        <input
                          className="input text-sm"
                          value={field.label}
                          onChange={(e) =>
                            updateField(i, { label: e.target.value })
                          }
                          placeholder="Display label"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                          Type
                        </label>
                        <select
                          className="input text-sm"
                          value={field.type}
                          onChange={(e) =>
                            updateField(i, {
                              type: e.target.value as FieldDefinition["type"],
                            })
                          }
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col items-center gap-1 pb-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Req
                        </label>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={!!field.required}
                          onChange={(e) =>
                            updateField(i, { required: e.target.checked })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeField(i)}
                        disabled={fields.length === 1}
                        className="pb-1 text-slate-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                        title="Remove field"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {field.type === "select" && (
                      <div className="mt-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                          Options (comma-separated)
                        </label>
                        <input
                          className="input text-sm"
                          value={(field.options ?? []).join(", ")}
                          onChange={(e) =>
                            updateField(i, {
                              options: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Option A, Option B, Option C"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </StepShell>
          )}

          {/* STEP 3 — Deduplication Keys */}
          {currentStep === 3 && (
            <StepShell
              title="Deduplication Keys"
              hint="When an uploaded record matches an existing one on all selected keys it is treated as an update — not a duplicate."
              error={stepErrors.matchKeys}
            >
              {definedKeys.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  No fields defined yet. Go back to Step 2 and add at least one
                  field first.
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-4">
                    Pick the fields that together{" "}
                    <strong className="text-slate-600">
                      uniquely identify one entity
                    </strong>
                    . For example: <em>last_name + first_name + birthdate</em>.
                    At least one key is required.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {definedKeys.map((key) => (
                      <label
                        key={key}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-colors select-none ${
                          matchKeys.includes(key)
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={matchKeys.includes(key)}
                          onChange={() => toggleMatchKey(key)}
                        />
                        {key}
                      </label>
                    ))}
                  </div>

                  {matchKeys.length > 0 && (
                    <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700">
                      <span className="font-semibold">Selected:</span>{" "}
                      {matchKeys.join(" + ")} — records sharing the same
                      combination will be merged on upload.
                    </div>
                  )}
                </>
              )}
            </StepShell>
          )}

          {/* STEP 4 — Map Layer Configuration */}
          {currentStep === 4 && (
            <StepShell
              title="Map Layer Configuration"
              hint="Controls how this dataset appears as a choropleth overlay on the dashboard map."
              error={stepErrors.layer}
            >
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Color Field" required>
                    <select
                      className="input"
                      value={layerConfig.color_field}
                      onChange={(e) =>
                        setLayerConfig((l) => ({
                          ...l,
                          color_field: e.target.value,
                        }))
                      }
                    >
                      <option value="__count__">Record Count (default)</option>
                      {definedKeys.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Drives the color intensity of each geographic area.
                    </p>
                  </Field>

                  <Field label="Aggregate Function" required>
                    <select
                      className="input"
                      value={layerConfig.aggregate_function}
                      onChange={(e) =>
                        setLayerConfig((l) => ({
                          ...l,
                          aggregate_function: e.target
                            .value as LayerConfig["aggregate_function"],
                        }))
                      }
                    >
                      {AGGREGATE_FNS.map((f) => (
                        <option key={f} value={f}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      How to combine multiple records in the same area (Count =
                      total rows).
                    </p>
                  </Field>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Tooltip Fields{" "}
                    <span className="font-normal text-slate-400">
                      — shown when hovering an area on the map
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["__count__", ...definedKeys].map((key) => {
                      const active = layerConfig.tooltip_fields.some(
                        (t) => t.field === key,
                      );
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setLayerConfig((l) => ({
                              ...l,
                              tooltip_fields: active
                                ? l.tooltip_fields.filter(
                                    (t) => t.field !== key,
                                  )
                                : [
                                    ...l.tooltip_fields,
                                    {
                                      field: key,
                                      label:
                                        key === "__count__" ? "Total" : key,
                                    },
                                  ],
                            }))
                          }
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {key === "__count__" ? "Total Count" : key}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {/* STEP 5 — Review & Submit */}
          {currentStep === 5 && (
            <StepShell
              title="Review & Confirm"
              hint="Check everything looks correct before saving. Click Edit on any section to go back and change it."
            >
              <div className="space-y-4">
                <ReviewSection
                  label="Basic Information"
                  onEdit={() => handleJump(1)}
                >
                  <ReviewRow label="Name" value={name} />
                  <ReviewRow label="Description" value={description || "—"} />
                  <ReviewRow label="Entity Type" value={entityType} />
                  <ReviewRow label="PSGC Level" value={psgcLevel} />
                  <ReviewRow
                    label="Allow Duplicates"
                    value={allowDuplicates ? "Yes" : "No"}
                  />
                </ReviewSection>

                <ReviewSection
                  label="Field Definitions"
                  onEdit={() => handleJump(2)}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left font-semibold text-slate-500 py-1.5 pr-3">
                            Key
                          </th>
                          <th className="text-left font-semibold text-slate-500 py-1.5 pr-3">
                            Label
                          </th>
                          <th className="text-left font-semibold text-slate-500 py-1.5 pr-3">
                            Type
                          </th>
                          <th className="text-left font-semibold text-slate-500 py-1.5">
                            Required
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f, i) => (
                          <tr
                            key={i}
                            className="border-b border-slate-50 last:border-0"
                          >
                            <td className="py-1.5 pr-3 font-mono text-slate-700">
                              {f.key || "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-600">
                              {f.label || "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-500">
                              {f.type}
                            </td>
                            <td className="py-1.5">
                              {f.required ? (
                                <span className="inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReviewSection>

                <ReviewSection
                  label="Deduplication Keys"
                  onEdit={() => handleJump(3)}
                >
                  {matchKeys.length === 0 ? (
                    <span className="text-slate-300 text-xs italic">
                      None selected
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {matchKeys.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </ReviewSection>

                <ReviewSection
                  label="Map Layer Configuration"
                  onEdit={() => handleJump(4)}
                >
                  <ReviewRow
                    label="Color Field"
                    value={
                      layerConfig.color_field === "__count__"
                        ? "Record Count"
                        : layerConfig.color_field
                    }
                  />
                  <ReviewRow
                    label="Aggregate Function"
                    value={layerConfig.aggregate_function}
                  />
                  <ReviewRow
                    label="Tooltip Fields"
                    value={
                      layerConfig.tooltip_fields.length === 0
                        ? "—"
                        : layerConfig.tooltip_fields
                            .map((t) => t.label || t.field)
                            .join(", ")
                    }
                  />
                </ReviewSection>
              </div>

              {save.isError && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {(save.error as Error).message}
                </div>
              )}
            </StepShell>
          )}

          {/* ── Navigation buttons ── */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
              ) : (
                <Link
                  to="/datasets"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </Link>
              )}
            </div>

            <div>
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Next
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={save.isPending}
                  className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {save.isPending
                    ? "Saving…"
                    : isEdit
                      ? "Save Changes"
                      : "Create Dataset"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepShell — card wrapper for each step
// ---------------------------------------------------------------------------
function StepShell({
  title,
  hint,
  children,
  error,
  action,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  error?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
      </div>
      <div className="p-5">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field label + input wrapper
// ---------------------------------------------------------------------------
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review section helpers
// ---------------------------------------------------------------------------
function ReviewSection({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Edit
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5 text-xs border-b border-slate-50 last:border-0">
      <span className="w-40 flex-shrink-0 font-medium text-slate-500">
        {label}
      </span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
