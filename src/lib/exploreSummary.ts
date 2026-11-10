import type { DatasetFilterValues, FilterDefinition } from "../services/api/datasetApi.ts";

export type AreaLevel = "region" | "province" | "city" | "barangay";

export interface AreaPart {
  level: AreaLevel;
  code: string;
  name: string;
}

export interface SummaryChip {
  id: string;
  label: string;
  kind: "area" | "filter" | "location";
  /** Dataset filter key (filter and location chips). */
  key?: string;
}

export const LOCATION_KEY = "__location_status";

const MAX_LISTED_VALUES = 2;

function listValues(values: string[]): string {
  const shown = values.slice(0, MAX_LISTED_VALUES).join(", ");
  const rest = values.length - MAX_LISTED_VALUES;
  return rest > 0 ? `${shown} +${rest} more` : shown;
}

/** Plain-language chips for every filter that currently narrows the results. */
export function filterChips(
  filters: DatasetFilterValues,
  definitions: Pick<FilterDefinition, "key" | "label">[] = [],
): SummaryChip[] {
  const chips: SummaryChip[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (key === LOCATION_KEY) {
      const mode = value.values?.[0];
      if (mode === "unknown")
        chips.push({ id: key, key, kind: "location", label: "People with no known location" });
      else if (mode === "provided")
        chips.push({ id: key, key, kind: "location", label: "Known location only" });
      continue;
    }
    const label = definitions.find((d) => d.key === key)?.label ?? key;
    const parts: string[] = [];
    if (value.values?.length) parts.push(listValues(value.values));
    if (value.missing) parts.push("(blank)");
    if (value.search?.trim()) parts.push(`contains "${value.search.trim()}"`);
    const hasMin = value.min !== undefined && value.min !== "";
    const hasMax = value.max !== undefined && value.max !== "";
    if (hasMin && hasMax) parts.push(`${value.min} to ${value.max}`);
    else if (hasMin) parts.push(`from ${value.min}`);
    else if (hasMax) parts.push(`up to ${value.max}`);
    if (parts.length)
      chips.push({ id: key, key, kind: "filter", label: `${label}: ${parts.join(", ")}` });
  }
  return chips;
}

export function areaChip(area: AreaPart[]): SummaryChip | null {
  if (!area.length) return null;
  return { id: "area", kind: "area", label: area.map((a) => a.name).join(", ") };
}

/** Removes one filter without touching the others. */
export function withoutFilter(filters: DatasetFilterValues, key: string): DatasetFilterValues {
  const next = { ...filters };
  delete next[key];
  return next;
}

/** The deepest selected area, e.g. the city when region, province and city are all chosen. */
export function deepestArea(area: AreaPart[]): AreaPart | undefined {
  return area[area.length - 1];
}

/** One sentence describing what the user is looking at right now. */
export function summarySentence(input: {
  datasetName: string | null;
  total: number | null;
  area: AreaPart[];
  chipCount: number;
  /** Political explorer: name the data type instead of quoting a dataset, e.g. "17 SK Chairpersons". */
  dataTypeLabel?: string | null;
}): string {
  if (!input.datasetName) return "Pick an event or list to begin.";
  if (input.dataTypeLabel) {
    const place = deepestArea(input.area);
    const count = input.total === null ? "" : `${input.total.toLocaleString()} `;
    return `Showing ${count}${input.dataTypeLabel}${place ? ` in ${place.name}` : " across the Philippines"}.`;
  }
  const count = input.total === null ? "" : `${input.total.toLocaleString()} `;
  const noun = input.total === 1 ? "record" : "records";
  const place = deepestArea(input.area);
  const where = place ? ` in ${place.name}` : " across the Philippines";
  const narrowed = input.chipCount > (place ? 1 : 0) ? ", narrowed by your filters" : "";
  return `Showing ${count}${input.total === null ? "records" : noun} of "${input.datasetName}"${where}${narrowed}.`;
}

/** First three importer-marked filters are quick filters; the rest are "More filters". */
export function splitQuickFilters<T>(definitions: T[], quick = 3): { quick: T[]; more: T[] } {
  return { quick: definitions.slice(0, quick), more: definitions.slice(quick) };
}

/** Honest note when some barangay records cannot be drawn: they stay in the table and counts. */
export function noShapeNote(count: number | null): string {
  if (!count) return "";
  return count === 1
    ? "1 record has no barangay shape on the map."
    : `${count.toLocaleString()} records have no barangay shape on the map.`;
}
