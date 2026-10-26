import { suggestedColumns, singleEventValue } from "./eventImportSuggestions.ts";
import type { Dataset, ImportColumn, WorkbookInspection } from "../services/api/datasetApi";
import type { GuidedConfiguration } from "../services/api/importSessionApi";

export const importSteps = [
  "Choose file",
  "Dataset details",
  "Match columns",
  "Review locations",
  "Review changes",
  "Import complete",
];
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function configurationForFile(
  inspection: WorkbookInspection,
  filename: string,
  dataset?: Dataset,
  previous?: GuidedConfiguration | null,
): GuidedConfiguration {
  const saved = previous?.columns ?? dataset?.import_config?.columns ?? [];
  const savedSources = new Set(saved.map((c) => c.source));
  const fields = new Map(
    dataset?.field_definitions.flatMap(
      (f) =>
        [
          [normalize(f.key), f],
          [normalize(f.label), f],
        ] as const,
    ) ?? [],
  );
  const matchKeys = new Set(dataset?.match_key_fields ?? []);
  const filterKeys = new Set([
    ...(dataset?.layer_config.filter_fields ?? []),
    ...(dataset?.layer_config.filter_definitions?.map((f) => f.key) ?? []),
  ]);
  const filterModes = new Map(
    dataset?.layer_config.filter_definitions?.map((f) => [f.key, f.type]) ?? [],
  );
  const tooltipKeys = new Set(dataset?.layer_config.tooltip_fields.map((f) => f.field) ?? []);
  const columns = suggestedColumns(inspection, saved).map((column): ImportColumn => {
    if (!dataset || dataset.event_key || savedSources.has(column.source)) return column;
    const field = fields.get(normalize(column.source));
    return field
      ? {
          ...column,
          key: field.key,
          label: field.label,
          type: field.type,
          options: field.options,
          role: matchKeys.has(field.key) ? "participant_id" : "field",
          required: field.required ?? false,
          filter: filterKeys.has(field.key),
          filter_mode:
            filterModes.get(field.key) ??
            (field.type === "number" ? "range" : field.type === "date" ? "date" : "category"),
          popup: tooltipKeys.has(field.key),
        }
      : column;
  });
  if (!columns.some((c) => c.role === "participant_id")) {
    const id = columns.find((c) => normalize(c.source) === "id");
    if (id) {
      id.role = "participant_id";
      id.required = true;
    }
  }
  const residence = columns.find((c) => c.role === "residence");
  const type = dataset ? (dataset.event_key ? "event" : "general") : (previous?.type ?? "event");
  const metadata = previous?.metadata ??
    dataset?.event_metadata ?? {
      id: singleEventValue(inspection, columns, "event_id") ?? `event-${crypto.randomUUID()}`,
      name:
        singleEventValue(inspection, columns, "event_name") ??
        filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
      date: "",
      organizer: "",
      category: "",
      status: "completed" as const,
      venue: "",
    };
  return {
    ...previous,
    type,
    metadata: {
      ...metadata,
      name: metadata.name ?? "",
      date: metadata.date ?? "",
      venue: metadata.venue ?? "",
      organizer: metadata.organizer ?? "",
      category: metadata.category ?? "",
    },
    name: previous?.name ?? dataset?.name ?? metadata.name,
    description: previous?.description ?? dataset?.description ?? "",
    entity_type: previous?.entity_type ?? dataset?.entity_type ?? "person",
    psgc_level: previous?.psgc_level ?? dataset?.psgc_level ?? "city",
    sheet: inspection.sheet,
    header_row: inspection.header_row,
    columns,
    location_source:
      previous?.location_source ??
      (dataset?.import_config as GuidedConfiguration | undefined)?.location_source ??
      (residence ? { single: residence.source } : {}),
    locations: previous?.locations ?? {},
    match_key_fields: previous?.match_key_fields ?? dataset?.match_key_fields,
    layer_config: previous?.layer_config ??
      dataset?.layer_config ?? { aggregate_function: "count", color_field: "", tooltip_fields: [] },
    allow_duplicates: dataset?.allow_duplicates ?? previous?.allow_duplicates ?? false,
  };
}

export function essentialProblem(config: GuidedConfiguration): string {
  const identifiers = config.columns.filter((c) => c.role === "participant_id");
  if (config.type === "event" && identifiers.length !== 1)
    return "Choose exactly one participant ID column. Names alone cannot reliably identify the same attendee.";
  if (config.type === "general" && !identifiers.length && !config.match_key_fields?.length)
    return "Choose a record identifier so repeat imports can find the same record.";
  if (config.type === "event" && identifiers.some((c) => c.type !== "text"))
    return "Keep identifiers as text to preserve leading zeroes.";
  const included = config.columns.filter(
    (c) => !["ignore", "residence", "event_id", "event_name"].includes(c.role),
  );
  if (
    new Set(included.map((c) => c.key)).size !== included.length ||
    included.some((c) => !/^[a-z][a-z0-9_]{0,63}$/.test(c.key) || !(c.label ?? "").trim())
  )
    return "Included columns need distinct field keys and a display name. Review Advanced settings.";
  return "";
}

export function importError(error: unknown): string {
  if (!(error instanceof Error)) return "Could not complete this step. Please retry.";
  if (error.message.includes("API error 410"))
    return "This draft expired or was discarded. Start a new import.";
  const body = error.message.match(/API error \d+: ([\s\S]+)/)?.[1];
  if (body) {
    try {
      const parsed = JSON.parse(body);
      return (
        Object.values(parsed.errors ?? {})
          .flat()
          .join(" ") ||
        parsed.message ||
        "Please retry this step."
      );
    } catch {
      return "The server could not complete this step. Please retry.";
    }
  }
  return error.message;
}
