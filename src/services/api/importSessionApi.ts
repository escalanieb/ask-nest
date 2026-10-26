import { apiFetch } from "./_fetch";
import type {
  Dataset,
  ImportColumn,
  EventMetadata,
  PsgcLevel,
  LayerConfig,
  WorkbookInspection,
} from "./datasetApi";

export interface GuidedConfiguration {
  type: "event" | "general";
  name?: string;
  description?: string;
  entity_type?: Dataset["entity_type"];
  metadata: EventMetadata;
  psgc_level: PsgcLevel;
  sheet: string;
  header_row: number;
  columns: ImportColumn[];
  location_source: Partial<Record<"single" | "province" | "city" | "barangay", string>>;
  locations: Record<string, string | null>;
  match_key_fields?: string[];
  layer_config?: LayerConfig;
  allow_duplicates?: boolean;
  template_name?: string;
}
export interface ImportSession {
  id: string;
  dataset_id: number | null;
  state: "draft" | "ready_for_review" | "reviewing" | "committed" | "discarded" | "expired";
  revision: number;
  configuration: GuidedConfiguration | null;
  original_filename: string | null;
  expires_at: string;
  updated_at: string;
  result: ImportResult | null;
}
export interface ImportResult {
  dataset_id: number;
  batch_id: number;
  new: number;
  updates: number;
  skipped: number;
  rejected: number;
  unknown: number;
}
export interface ReviewRow {
  row: number;
  data: Record<string, unknown>;
  category: "new" | "updates" | "skipped" | "conflicts" | "rejected";
  errors: string[];
  existing?: Record<string, unknown>;
  resolution?: "pending" | "keep_existing" | "take_new";
}
export interface GuidedReview {
  session: ImportSession;
  stats: {
    new: number;
    updates: number;
    skipped: number;
    conflicts: number;
    rejected: number;
    unknown: number;
  };
  rows: ReviewRow[];
  pending_conflicts: number;
  total: number;
  page: number;
  last_page: number;
}
export interface LocationGroup {
  key: string;
  raw: Record<string, string>;
  count: number;
  code: string | null;
  status: string;
  candidates: { code: string; name: string }[];
}
const base = "/datasets/import/sessions";
const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const fetchImportSessions = () => apiFetch<ImportSession[]>(base);
export const createImportSession = (datasetId?: number) =>
  apiFetch<ImportSession>(base, json("POST", { dataset_id: datasetId }));
export const fetchImportSession = (id: string) => apiFetch<ImportSession>(`${base}/${id}`);
export const resumeImportSession = (session: ImportSession) =>
  apiFetch<ImportSession>(
    `${base}/${session.id}/resume`,
    json("POST", { revision: session.revision }),
  );
export const saveImportSession = (
  session: ImportSession,
  configuration: GuidedConfiguration,
  datasetId?: number | null,
) =>
  apiFetch<ImportSession>(
    `${base}/${session.id}`,
    json("PUT", {
      revision: session.revision,
      configuration,
      ...(datasetId !== undefined ? { dataset_id: datasetId } : {}),
    }),
  );
export const discardImportSession = (session: ImportSession) =>
  apiFetch(`${base}/${session.id}`, json("DELETE", { revision: session.revision }));
export async function inspectImportFile(
  session: ImportSession,
  file: File,
  options: { replace?: boolean; sheet?: string; headerRow?: number } = {},
) {
  const form = new FormData();
  form.append("file", file);
  form.append("revision", String(session.revision));
  if (options.replace) form.append("replace", "1");
  if (options.sheet) form.append("sheet", options.sheet);
  if (options.headerRow) form.append("header_row", String(options.headerRow));
  return apiFetch<{ session: ImportSession; inspection: WorkbookInspection }>(
    `${base}/${session.id}/inspect`,
    { method: "POST", body: form },
  );
}

function fileForm(session: ImportSession, file: File, sheets: string[]) {
  const form = new FormData();
  form.append("file", file);
  form.append("revision", String(session.revision));
  form.append("reviewed_sheets", JSON.stringify(sheets));
  return form;
}
export interface LocationReview {
  data: LocationGroup[];
  total: number;
  page: number;
  last_page: number;
  unresolved: number;
  unknown_rows: number;
}
export const inspectImportLocations = (
  session: ImportSession,
  file: File,
  sheets: string[],
  page = 1,
) =>
  apiFetch<LocationReview>(`${base}/${session.id}/locations?page=${page}`, {
    method: "POST",
    body: fileForm(session, file, sheets),
  });
export function prepareImport(
  session: ImportSession,
  file: File,
  sheets: string[],
  unknown: boolean,
  singleEvent: boolean,
) {
  const form = fileForm(session, file, sheets);
  form.append("acknowledge_unknown", unknown ? "1" : "0");
  form.append("confirmed_single_event", singleEvent ? "1" : "0");
  return apiFetch<GuidedReview>(`${base}/${session.id}/prepare`, { method: "POST", body: form });
}
export const fetchImportReview = (id: string, category = "", page = 1) =>
  apiFetch<GuidedReview>(
    `${base}/${id}/review?${new URLSearchParams({ ...(category ? { category } : {}), page: String(page) })}`,
  );
export const resolveImportConflict = (
  session: ImportSession,
  row: number,
  resolution: "keep_existing" | "take_new",
) =>
  apiFetch<GuidedReview>(
    `${base}/${session.id}/conflicts`,
    json("PATCH", { revision: session.revision, row, resolution }),
  );
export const commitImport = (session: ImportSession, exclusions: boolean) =>
  apiFetch<ImportResult>(
    `${base}/${session.id}/commit`,
    json("POST", { revision: session.revision, acknowledge_exclusions: exclusions }),
  );
