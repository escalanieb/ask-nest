import type { ImportColumn, WorkbookInspection } from "../services/api/datasetApi";

const aliases: Partial<Record<ImportColumn["role"], string[]>> = {
  participant_id: [
    "participantid",
    "registrationnumber",
    "registrationid",
    "attendeeid",
    "reference",
    "referencecode",
    "referencenumber",
  ],
  residence: [
    "residence",
    "residencepsgc",
    "homelocationcode",
    "psgccode",
    "residencecode",
    "barangaycode",
    "citycode",
  ],
  attendee_name: ["fullname", "attendeename", "participantdisplayname", "participantname"],
  attendance_status: ["attendancestatus", "checkinresult", "checkinstatus"],
  event_id: ["eventid", "eventcode", "activityreference"],
  event_name: ["eventname", "activityname"],
};

export function suggestedColumns(
  inspection: WorkbookInspection,
  previous: ImportColumn[] = [],
): ImportColumn[] {
  const usedKeys = new Set(
    previous
      .filter((c) => inspection.columns.some((source) => source.source === c.source))
      .map((c) => c.key),
  );
  const usedRoles = new Set(
    previous
      .filter(
        (c) =>
          inspection.columns.some((source) => source.source === c.source) &&
          c.role !== "field" &&
          c.role !== "ignore",
      )
      .map((c) => c.role),
  );
  return inspection.columns.map((source, index) => {
    const saved = previous.find((c) => c.source === source.source);
    if (saved) return saved;
    const normalized = source.source.toLowerCase().replace(/[^a-z0-9]/g, "");
    let role: ImportColumn["role"] = "field";
    for (const [candidate, names] of Object.entries(aliases)) {
      if (names?.includes(normalized) && !usedRoles.has(candidate as ImportColumn["role"])) {
        role = candidate as ImportColumn["role"];
        usedRoles.add(role);
        break;
      }
    }
    let base =
      source.source
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/^[^a-z]+/, "")
        .slice(0, 55) || `column_${index + 1}`;
    if (["event_id", "event_name", "psgc_code"].includes(base)) base = `column_${base}`;
    let key = base;
    for (let suffix = 2; usedKeys.has(key); suffix++) key = `${base}_${suffix}`;
    usedKeys.add(key);
    return {
      source: source.source,
      key,
      label: source.source,
      role,
      type: "text",
      filter: false,
      filter_mode: "category",
      popup: role === "attendee_name",
      required: role === "participant_id",
    };
  });
}

export function singleEventValue(
  inspection: WorkbookInspection,
  columns: ImportColumn[],
  role: "event_id" | "event_name",
): string | undefined {
  const column = columns.find((c) => c.role === role);
  const source = inspection.columns.find((c) => c.source === column?.source);
  if (!source || source.has_more) return undefined;
  const values = [...new Set(source.values.map((value) => value.trim()).filter(Boolean))];
  return values.length === 1 ? values[0] : undefined;
}

export function eventColumnProblem(
  inspection: WorkbookInspection,
  columns: ImportColumn[],
  event: { id: string; name: string },
): string {
  for (const column of columns.filter((c) => c.role === "event_id" || c.role === "event_name")) {
    const source = inspection.columns.find((c) => c.source === column.source);
    const expected = column.role === "event_id" ? event.id : event.name;
    if (
      source?.values.some((value) => value.trim().toLowerCase() !== expected.trim().toLowerCase())
    ) {
      return `${column.source} must contain only "${expected}" for this event. Review the event details or choose the correct workbook.`;
    }
  }
  return "";
}
