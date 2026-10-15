import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  fetchBatches,
  fetchDatasets,
  fetchImportTemplates,
  findImportLocations,
  inspectWorkbook,
  saveEventImport,
  uploadDatasetFile,
} from "../../services/api/datasetApi";
import type {
  Dataset,
  EventMetadata,
  ImportColumn,
  PsgcLevel,
  WorkbookInspection,
} from "../../services/api/datasetApi";

const control =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-team";
const primary =
  "rounded-lg bg-team px-4 py-2 text-sm font-semibold text-team-foreground disabled:opacity-50";
const roles: { value: ImportColumn["role"]; label: string }[] = [
  { value: "ignore", label: "Ignore this column" },
  { value: "participant_id", label: "Participant identifier" },
  { value: "attendee_name", label: "Attendee name" },
  { value: "residence", label: "Residence location / PSGC" },
  { value: "attendance_status", label: "Attendance status" },
  { value: "field", label: "Additional field" },
  { value: "event_id", label: "Event ID (validate only)" },
  { value: "event_name", label: "Event name (validate only)" },
];
function errorMessage(error: Error): string {
  const body = error.message.match(/API error \d+: ([\s\S]+)/)?.[1];
  if (body) {
    try {
      const parsed = JSON.parse(body);
      return (
        Object.values(parsed.errors ?? {})
          .flat()
          .join(" ") ||
        parsed.message ||
        error.message
      );
    } catch {
      /* Use the original error. */
    }
  }
  return error.message;
}

function LocationMatch({
  raw,
  value,
  level,
  onChange,
}: {
  raw: string;
  value?: string | null;
  level: PsgcLevel;
  onChange: (code: string | null) => void;
}) {
  const [search, setSearch] = useState(raw);
  const lookup = useMutation({ mutationFn: () => findImportLocations(level, search) });
  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      <p className="text-sm font-medium">
        {raw || "Blank location"} →{" "}
        <span className={value ? "text-green-700" : "text-amber-700"}>
          {value || "Unresolved / excluded"}
        </span>
      </p>
      <div className="flex gap-2">
        <input
          aria-label={`Find location for ${raw || "blank"}`}
          className={control}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or 9/10-digit code"
        />
        <button
          type="button"
          className="rounded-lg border px-3 text-sm"
          disabled={lookup.isPending || !search.trim()}
          onClick={() => lookup.mutate()}
        >
          Search
        </button>
      </div>
      {lookup.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage(lookup.error)}
        </p>
      )}
      {lookup.data && (
        <>
          <select
            aria-label={`Match ${raw}`}
            className={control}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">Choose verified location</option>
            {lookup.data.data.map((place) => (
              <option key={place.code} value={place.code}>
                {place.name} · {place.code}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {lookup.data.total} matches; up to 50 shown. Refine your search if needed.
          </p>
        </>
      )}
    </div>
  );
}

function EventWizard({ dataset }: { dataset?: Dataset }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const teamName = useAuthStore((state) => state.user?.team?.name);
  const [savedId, setSavedId] = useState<number | undefined>(dataset?.id);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<WorkbookInspection | null>(null);
  const [columns, setColumns] = useState<ImportColumn[]>(dataset?.import_config?.columns ?? []);
  const [sheet, setSheet] = useState(dataset?.import_config?.sheet ?? "");
  const [headerRow, setHeaderRow] = useState(dataset?.import_config?.header_row ?? 1);
  const [level, setLevel] = useState<PsgcLevel>(dataset?.psgc_level ?? "city");
  const [locations, setLocations] = useState<Record<string, string | null>>(
    dataset?.import_config?.locations ?? {},
  );
  const [metadata, setMetadata] = useState<EventMetadata>(
    dataset?.event_metadata ?? {
      id: "",
      name: "",
      date: "",
      organizer: "",
      category: "",
      status: "completed",
      venue: "",
    },
  );
  const [confirmed, setConfirmed] = useState(false);
  const [reviewedSheets, setReviewedSheets] = useState(false);
  const [excludeUnresolved, setExcludeUnresolved] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [locationPage, setLocationPage] = useState(0);
  const [error, setError] = useState("");
  const { data: templates = [] } = useQuery({
    queryKey: ["import-templates"],
    queryFn: fetchImportTemplates,
  });
  const inspect = useMutation({
    mutationFn: ({
      selectedFile,
      selectedSheet,
      row,
    }: {
      selectedFile: File;
      selectedSheet?: string;
      row: number;
    }) => inspectWorkbook(selectedFile, selectedSheet, row),
    onSuccess: (result) => {
      setInspection(result);
      setSheet(result.sheet);
      setHeaderRow(result.header_row);
      setReviewedSheets(false);
      setConfirmed(false);
      setLocations(dataset?.import_config?.locations ?? {});
      setLocationPage(0);
      setColumns((old) =>
        result.columns.map(
          (column, index) =>
            old.find((saved) => saved.source === column.source) ?? {
              source: column.source,
              key:
                column.source
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "")
                  .replace(/^[^a-z]+/, "") || `field_${index + 1}`,
              label: column.source,
              role: "ignore",
              type: "text",
              filter: false,
              popup: false,
              required: false,
            },
        ),
      );
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!file || !inspection) throw new Error("Choose and inspect a workbook first.");
      const target = await saveEventImport(
        {
          metadata,
          psgc_level: level,
          sheet,
          header_row: headerRow,
          columns,
          locations,
          template_name: !templateSaved ? templateName || undefined : undefined,
        },
        savedId,
      );
      setSavedId(target.id);
      setTemplateSaved(!!templateName);
      qc.invalidateQueries({ queryKey: ["datasets"] });
      const preview = await uploadDatasetFile(target.id, file, { sheets: inspection.sheets });
      return { target, preview };
    },
    onSuccess: ({ target, preview }) => {
      qc.invalidateQueries();
      navigate(`/datasets/${target.id}/upload`, { state: { preview } });
    },
  });
  const residence = columns.find((column) => column.role === "residence");
  const sourceLocation = inspection?.columns.find((column) => column.source === residence?.source);
  const needsMatch = sourceLocation?.values.filter((value) => !/^\d{9,10}$/.test(value)) ?? [];
  const unresolved = needsMatch.filter((value) => !locations[value]).length;
  const update = (index: number, patch: Partial<ImportColumn>) =>
    setColumns((current) =>
      current.map((column, i) => (i === index ? { ...column, ...patch } : column)),
    );
  const validateMapping = () => {
    if (
      columns.filter((column) => column.role === "participant_id").length !== 1 ||
      columns.filter((column) => column.role === "residence").length !== 1
    )
      return "Map exactly one participant identifier and one residence column.";
    const fields = columns.filter(
      (column) => !["ignore", "residence", "event_id", "event_name"].includes(column.role),
    );
    if (
      fields.some(
        (column) =>
          !/^[a-z][a-z0-9_]{0,63}$/.test(column.key) ||
          ["psgc_code", "event_name", "event_id"].includes(column.key) ||
          !column.label.trim(),
      ) ||
      new Set(fields.map((column) => column.key)).size !== fields.length
    )
      return "Give attendee fields unique snake_case keys and labels; system keys are reserved.";
    return "";
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (step === 2) {
          const problem = validateMapping();
          if (problem) {
            setError(problem);
            return;
          }
        }
        if (step < 3) setStep(step + 1);
        else save.mutate();
      }}
    >
      <div className="rounded-xl border border-team bg-team-soft p-4 text-sm text-team">
        <strong>Importing for {teamName}</strong> ·{" "}
        {dataset ? `Append/update: ${dataset.name}` : "Create one event dataset"}
        <p className="mt-1">
          One workbook = one event. Each data row = one attendee. Participant identifiers prevent
          duplicates within this event.
        </p>
      </div>
      <ol className="flex gap-4 text-sm" aria-label="Import progress">
        {["Event & file", "Map columns", "Locations & review"].map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
            className={step === index + 1 ? "font-bold text-team" : "text-slate-500"}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {step === 1 && (
        <section className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-lg font-semibold">Event details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["id", "Stable event ID"],
                ["name", "Event name"],
                ["date", "Event date"],
                ["organizer", "Organizer"],
                ["category", "Program / category"],
                ["venue", "Event venue"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <input
                  className={control}
                  type={key === "date" ? "date" : "text"}
                  required
                  value={metadata[key]}
                  disabled={key === "id" && !!savedId}
                  onChange={(e) => setMetadata({ ...metadata, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="text-sm font-medium">
              Event status
              <select
                className={control}
                value={metadata.status}
                onChange={(e) =>
                  setMetadata({ ...metadata, status: e.target.value as EventMetadata["status"] })
                }
              >
                {["upcoming", "ongoing", "completed", "cancelled"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Attendee residence level
              <select
                className={control}
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value as PsgcLevel);
                  setLocations({});
                }}
              >
                {["city", "barangay", "province"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-slate-600">
              Optional venue map location
            </summary>
            <p className="my-2 text-xs text-slate-500">
              Venue is separate from attendee residence. Coordinates are exact only if you provide
              verified values; PSGC markers are approximate.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                Venue PSGC
                <input
                  className={control}
                  value={metadata.venue_psgc ?? ""}
                  pattern="[0-9]{9}"
                  onChange={(e) => setMetadata({ ...metadata, venue_psgc: e.target.value })}
                />
              </label>
              {(["latitude", "longitude"] as const).map((key) => (
                <label key={key} className="text-sm">
                  {key}
                  <input
                    className={control}
                    type="number"
                    step="any"
                    value={metadata[key] ?? ""}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        [key]: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </details>
          <label className="block text-sm font-medium">
            Attendee workbook (.xlsx, .xls, .csv; up to 10 MB)
            <input
              className={control}
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={inspect.isPending || save.isPending}
              onChange={(e) => {
                const next = e.target.files?.[0];
                if (!next) return;
                setFile(next);
                setInspection(null);
                inspect.mutate({ selectedFile: next, row: 1 });
              }}
            />
          </label>
          {file && (
            <div className="flex gap-3">
              <label className="text-sm">
                Header row
                <input
                  className={control}
                  type="number"
                  min={1}
                  max={50}
                  value={headerRow}
                  onChange={(e) => {
                    const value = e.target.valueAsNumber;
                    if (Number.isInteger(value) && value >= 1 && value <= 50) setHeaderRow(value);
                  }}
                />
              </label>
              <button
                type="button"
                className="self-end rounded-lg border px-3 py-2 text-sm"
                disabled={inspect.isPending}
                onClick={() => inspect.mutate({ selectedFile: file, row: headerRow })}
              >
                Read file
              </button>
            </div>
          )}
          {inspection && (
            <p className="text-sm text-slate-600">
              {file?.name}: {inspection.row_count} rows · {inspection.sheets.length} non-empty
              worksheet(s).
            </p>
          )}
        </section>
      )}
      {step === 2 && inspection && (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              Attendee worksheet
              <select className={control} value={sheet} onChange={(e) => setSheet(e.target.value)}>
                {inspection.sheets.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Header row
              <input
                className={control}
                type="number"
                min={1}
                max={50}
                value={headerRow}
                onChange={(e) => setHeaderRow(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="self-end rounded-lg border px-3 py-2 text-sm"
              disabled={inspect.isPending}
              onClick={() =>
                file && inspect.mutate({ selectedFile: file, selectedSheet: sheet, row: headerRow })
              }
            >
              Read this worksheet
            </button>
          </div>
          <label className="block text-sm">
            Reuse a saved mapping
            <select
              className={control}
              defaultValue=""
              onChange={(e) => {
                const template = templates.find((item) => item.id === Number(e.target.value));
                if (template) {
                  setLevel(template.configuration.psgc_level);
                  setColumns((current) =>
                    current.map(
                      (column) =>
                        template.configuration.columns.find(
                          (saved) => saved.source === column.source,
                        ) ?? column,
                    ),
                  );
                }
              }}
            >
              <option value="">Choose a template (optional)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-slate-600">
            Review every header. Choose participant ID and residence roles, then select filters and
            popup fields for this event only.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Excel column / samples",
                    "Meaning",
                    "Field key / label",
                    "Type",
                    "Filter",
                    "Popup / list",
                    "Required",
                  ].map((label) => (
                    <th key={label} className="p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columns.map((column, index) => {
                  const field = !["ignore", "residence", "event_id", "event_name"].includes(
                    column.role,
                  );
                  return (
                    <tr key={column.source} className="border-t">
                      <td className="p-2 max-w-56">
                        <strong>{column.source}</strong>
                        <p
                          className="truncate text-xs text-slate-500"
                          title={inspection.columns[index]?.samples.join(" · ")}
                        >
                          {inspection.columns[index]?.samples.join(" · ")}
                        </p>
                      </td>
                      <td className="p-2">
                        <select
                          className={control}
                          aria-label={`Meaning of ${column.source}`}
                          value={column.role}
                          onChange={(e) =>
                            update(index, {
                              role: e.target.value as ImportColumn["role"],
                              ...(e.target.value === "participant_id"
                                ? { type: "text", required: true }
                                : {}),
                            })
                          }
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`Key for ${column.source}`}
                          className={control}
                          disabled={!field}
                          value={column.key}
                          onChange={(e) => update(index, { key: e.target.value })}
                        />
                        <input
                          aria-label={`Label for ${column.source}`}
                          className={control}
                          disabled={!field}
                          value={column.label}
                          onChange={(e) => update(index, { label: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <select
                          aria-label={`Type of ${column.source}`}
                          className={control}
                          value={column.type}
                          disabled={!field || column.role === "participant_id"}
                          onChange={(e) =>
                            update(index, { type: e.target.value as ImportColumn["type"] })
                          }
                        >
                          {["text", "number", "date", "category"].map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                        {column.type === "date" && (
                          <select
                            aria-label={`Date format of ${column.source}`}
                            className={control}
                            value={column.date_format ?? "Y-m-d"}
                            onChange={(e) =>
                              update(index, {
                                date_format: e.target.value as ImportColumn["date_format"],
                              })
                            }
                          >
                            {["Y-m-d", "m/d/Y", "d/m/Y"].map((format) => (
                              <option key={format}>{format}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      {(["filter", "popup", "required"] as const).map((key) => (
                        <td key={key} className="p-2">
                          <input
                            aria-label={`${key} ${column.source}`}
                            type="checkbox"
                            disabled={
                              !field || (key === "required" && column.role === "participant_id")
                            }
                            checked={column[key]}
                            onChange={(e) => update(index, { [key]: e.target.checked })}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {step === 3 && inspection && (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Residence locations and event confirmation</h2>
          <p className="text-sm text-slate-600">
            9-digit codes are verified during preview. Known 10-digit codes use the reference’s
            published 9-digit correspondence. Match place names explicitly; unresolved rows will be
            rejected, not plotted at a guessed location.
          </p>
          {sourceLocation?.has_more && (
            <p className="text-sm text-amber-800">
              More than 1,000 distinct locations exist. The first 1,000 can be reviewed here; use
              verified PSGC codes in the workbook for the remaining locations.
            </p>
          )}
          {needsMatch.slice(locationPage * 20, locationPage * 20 + 20).map((raw) => (
            <LocationMatch
              key={raw}
              raw={raw}
              value={locations[raw]}
              level={level}
              onChange={(code) => setLocations((current) => ({ ...current, [raw]: code }))}
            />
          ))}
          {needsMatch.length > 20 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={locationPage === 0}
                onClick={() => setLocationPage(locationPage - 1)}
              >
                Previous
              </button>
              <span>
                Locations {locationPage * 20 + 1}–
                {Math.min((locationPage + 1) * 20, needsMatch.length)}
              </span>
              <button
                type="button"
                disabled={(locationPage + 1) * 20 >= needsMatch.length}
                onClick={() => setLocationPage(locationPage + 1)}
              >
                Next
              </button>
            </div>
          )}
          {!!unresolved && (
            <label className="flex items-start gap-2 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={excludeUnresolved}
                onChange={(e) => setExcludeUnresolved(e.target.checked)}
              />
              I understand {unresolved} unresolved location value(s) will cause attendee rows to be
              rejected. I will review the rejected rows before confirming the import.
            </label>
          )}
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewedSheets}
              onChange={(e) => setReviewedSheets(e.target.checked)}
            />
            I reviewed all non-empty sheets ({inspection.sheets.join(", ")}); {sheet} is the
            attendee sheet. Other sheets will not be imported.
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Every attendee in this workbook belongs to {metadata.name} ({metadata.id}). Mixed event
            identifiers reject the entire file.
          </label>
          <label className="block text-sm">
            Save this column setup as a reusable template (optional)
            <input
              className={control}
              value={templateName}
              maxLength={120}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name; event details and locations are not copied"
            />
          </label>
          <p className="text-xs text-slate-500">
            Continue saves the event definition and uploads a pending preview. Map records are
            written only when you confirm that preview. Cancelling later can leave an empty event
            dataset.
          </p>
        </section>
      )}
      {(error || inspect.isError || save.isError) && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error ||
            (save.error
              ? errorMessage(save.error)
              : inspect.error
                ? errorMessage(inspect.error)
                : "")}
        </p>
      )}
      <div className="flex justify-between">
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm"
          disabled={step === 1 || save.isPending}
          onClick={() => setStep(step - 1)}
        >
          Back
        </button>
        <button
          type="submit"
          className={primary}
          disabled={
            !inspection ||
            inspect.isPending ||
            save.isPending ||
            (step === 2 && (sheet !== inspection.sheet || headerRow !== inspection.header_row)) ||
            (step === 3 && (!confirmed || !reviewedSheets || (!!unresolved && !excludeUnresolved)))
          }
        >
          {save.isPending
            ? "Preparing preview…"
            : step === 3
              ? "Save event & preview import"
              : "Continue"}
        </button>
      </div>
    </form>
  );
}

export default function EventImportPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("dataset") ?? "new";
  const {
    data: datasets = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["datasets", "active"], queryFn: () => fetchDatasets(true) });
  const dataset = datasets.find((item) => item.id === Number(selected));
  const batches = useQuery({
    queryKey: ["batches", Number(selected)],
    queryFn: () => fetchBatches(Number(selected)),
    enabled: !!dataset?.event_key,
  });
  const pending = batches.data?.data.find((batch) => batch.status === "pending");
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <header className="flex items-center gap-4 border-b bg-white p-5">
        <Link to="/" className="text-sm text-slate-600">
          ← Map
        </Link>
        <h1 className="text-xl font-bold">Import dataset</h1>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <Link className="text-sm text-team underline" to="/datasets/new?next=upload">
          Create a generic dataset with the existing template workflow
        </Link>
        <label className="block text-sm font-medium">
          Create an event or append/update an existing dataset
          <select
            className={control}
            value={selected}
            onChange={(e) => setParams(e.target.value === "new" ? {} : { dataset: e.target.value })}
          >
            <option value="new">Create a new event dataset</option>
            {datasets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.event_key ? ` · ${item.event_key}` : " · existing generic dataset"}
              </option>
            ))}
          </select>
        </label>
        {isLoading ? (
          <p>Loading your team’s datasets…</p>
        ) : error ? (
          <p role="alert">{error.message}</p>
        ) : selected !== "new" && !dataset ? (
          <p role="alert">This dataset is unavailable to your team.</p>
        ) : dataset && !dataset.event_key ? (
          <div className="rounded-xl border bg-white p-6">
            <p>This dataset uses its existing fixed-column template and upload workflow.</p>
            <Link
              className="mt-4 inline-block text-team underline"
              to={`/datasets/${dataset.id}/upload`}
            >
              Continue to dataset upload
            </Link>
          </div>
        ) : dataset?.event_key && batches.isLoading ? (
          <p>Checking pending imports…</p>
        ) : pending ? (
          <Link className="underline text-team" to={`/datasets/${dataset!.id}/upload`}>
            Resume or discard the pending import before uploading again
          </Link>
        ) : (
          <EventWizard key={dataset?.id ?? "new"} dataset={dataset} />
        )}
      </main>
    </div>
  );
}
