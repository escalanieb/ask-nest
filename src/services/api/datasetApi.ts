import { apiFetch, apiRequest } from "./_fetch";

import { sessionGeneration, assertSession } from "../../lib/session";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type EntityType = "person" | "establishment" | "location" | "event";
export type PsgcLevel = "barangay" | "city" | "province";
export type AggregateFunction = "count" | "sum" | "average" | "max";
export type RecordStatus = "active" | "inactive";
export type BatchStatus = "pending" | "committed" | "rolled_back";
export type ConflictResolution = "pending" | "keep_existing" | "take_new" | "merge";

export interface FieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "email" | "url";
  required?: boolean;
  options?: string[];
}

export interface TooltipField {
  field: string;
  label: string;
}

export interface LayerConfig {
  color_field: string;
  aggregate_function: AggregateFunction;
  tooltip_fields: TooltipField[];
  filter_fields?: string[];
  filter_definitions?: FilterDefinition[];
}

export interface Dataset {
  event_key?: string | null;
  event_metadata?: EventMetadata | null;
  import_config?: ImportConfiguration | null;
  id: number;
  name: string;
  description: string | null;
  entity_type: EntityType;
  psgc_level: PsgcLevel;
  match_key_fields: string[];
  field_definitions: FieldDefinition[];
  layer_config: LayerConfig;
  allow_duplicates: boolean;
  is_active: boolean;
  created_by: number;
  creator?: { id: number; name: string; email: string };
  records_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DatasetPayload {
  name: string;
  description?: string;
  entity_type: EntityType;
  psgc_level: PsgcLevel;
  match_key_fields: string[];
  field_definitions: FieldDefinition[];
  layer_config: LayerConfig;
  allow_duplicates?: boolean;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface DatasetRecord {
  id: number;
  dataset_id: number;
  psgc_code: string | null;
  location_source?: Record<string, string> | null;
  location_reason?: string | null;
  data: Record<string, unknown>;
  match_hash: string;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface RecordHistoryEntry {
  id: number;
  record_id: number;
  batch_id: number | null;
  action: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  changed_by: number;
  changed_at: string;
  changed_by_user?: { id: number; name: string; email: string };
  batch?: { id: number; original_filename: string; status: BatchStatus };
}

export interface PaginatedRecords {
  data: DatasetRecord[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Batch types
// ---------------------------------------------------------------------------

export interface BatchStats {
  new: number;
  updates: number;
  conflicts: number;
  skipped: number;
  rejected: number;
}

export interface BatchConflict {
  id: number;
  batch_id: number;
  existing_record_id: number;
  incoming_data: Record<string, unknown>;
  conflict_reason: string;
  resolution: ConflictResolution;
  merged_data: Record<string, unknown> | null;
  resolved_by: number | null;
  resolved_at: string | null;
}

export interface UploadBatch {
  id: number;
  dataset_id: number;
  filename: string;
  original_filename: string;
  status: BatchStatus;
  uploaded_by: number;
  committed_at: string | null;
  stats: BatchStats | null;
  rejection_report: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
  conflicts?: BatchConflict[];
}

export interface UploadPreview {
  pending_conflicts?: number;
  batch_id: number;
  stats: BatchStats;
  preview: {
    new: Record<string, unknown>[];
    updates: Record<string, unknown>[];
    conflicts: Record<string, unknown>[];
    rejected: Record<string, unknown>[];
  };
}

// ---------------------------------------------------------------------------
// Layer types
// ---------------------------------------------------------------------------

export interface LayerDataPoint {
  psgc_code: string;
  display_value: number;
  count: number;
  tooltip: Record<string, unknown>;
}

export interface LayerResponse {
  dataset: Pick<
    Dataset,
    "id" | "name" | "entity_type" | "psgc_level" | "layer_config" | "event_key" | "event_metadata"
  >;
  layer_data: LayerDataPoint[];
  summary?: {
    total: number;
    unfiltered_total: number;
    mapped: number;
    unmapped: number;
    unknown?: number;
    areas: number;
    unique_participants: number | null;
  };
}

export interface EventMetadata {
  id: string;
  name: string;
  date: string;
  organizer: string;
  category: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  venue: string;
  venue_psgc?: string;
  latitude?: number | null;
  longitude?: number | null;
}
export interface ImportColumn {
  source: string;
  key: string;
  label: string;
  role:
    | "participant_id"
    | "attendee_name"
    | "residence"
    | "attendance_status"
    | "field"
    | "event_id"
    | "event_name"
    | "ignore";
  type: "text" | "number" | "date" | "category" | "select" | "email" | "url";
  options?: string[];
  filter: boolean;
  filter_mode?: "category" | "search" | "range" | "date";
  popup: boolean;
  required: boolean;
  date_format?: "Y-m-d" | "m/d/Y" | "d/m/Y";
}
export interface ImportConfiguration {
  version?: number;
  type?: "event" | "general";
  location_source?: Partial<Record<"single" | "province" | "city" | "barangay", string>>;
  sheet: string;
  header_row: number;
  columns: ImportColumn[];
  locations: Record<string, string | null>;
}
export interface WorkbookInspection {
  suggestions?: { sheet: string; header_row: number; score: number }[];
  sample_rows?: (string | null)[][];
  sheets: string[];
  sheet: string;
  header_row: number;
  row_count: number;
  columns: { source: string; samples: string[]; values: string[]; has_more: boolean }[];
}
export interface FilterDefinition {
  key: string;
  label: string;
  type: "category" | "range" | "date" | "search";
  values?: string[];
  has_more?: boolean;
  has_missing?: boolean;
}
export type DatasetFilterValues = Record<
  string,
  {
    values?: string[];
    min?: string | number;
    max?: string | number;
    search?: string;
    missing?: boolean;
  }
>;

export function filterQuery(filters: DatasetFilterValues = {}, prefix?: string): string {
  const params = new URLSearchParams({ filters: JSON.stringify(filters) });
  if (prefix) params.set("psgc_prefix", prefix);
  return "?" + params.toString();
}
export async function inspectWorkbook(
  file: File,
  sheet?: string,
  headerRow = 1,
): Promise<WorkbookInspection> {
  const form = new FormData();
  form.append("file", file);
  form.append("header_row", String(headerRow));
  if (sheet) form.append("sheet", sheet);
  return apiFetch("/datasets/import/inspect", { method: "POST", body: form });
}
export async function saveEventImport(
  payload: ImportConfiguration & {
    metadata: EventMetadata;
    psgc_level: PsgcLevel;
    template_name?: string;
  },
  id?: number,
): Promise<Dataset> {
  return apiFetch(id ? `/datasets/${id}/import-config` : "/datasets/import/events", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export const fetchImportTemplates = () =>
  apiFetch<
    { id: number; name: string; configuration: ImportConfiguration & { psgc_level: PsgcLevel } }[]
  >("/datasets/import/templates");
export const findImportLocations = (level: PsgcLevel, q: string) =>
  apiFetch<{ data: { code: string; name: string }[]; total: number }>(
    `/datasets/import/locations?${new URLSearchParams({ level, q })}`,
  );
export const fetchDatasetFilterOptions = (id: number, q = "") =>
  apiFetch<{ data: FilterDefinition[] }>(
    `/datasets/${id}/filter-options?${new URLSearchParams({ q })}`,
  );
export const fetchBatchPreview = (id: number) => apiFetch<UploadPreview>(`/batches/${id}/preview`);

export async function downloadDatasetFile(path: string, filename: string): Promise<void> {
  const generation = sessionGeneration();
  const response = await apiRequest(path);
  if (!response.ok) throw new Error("Could not download this file. Please retry.");
  const blob = await response.blob();
  assertSession(generation);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Dataset CRUD
// ---------------------------------------------------------------------------

export async function fetchDatasets(activeOnly = false): Promise<Dataset[]> {
  const qs = activeOnly ? "?active_only=true" : "";
  return apiFetch<Dataset[]>(`/datasets${qs}`);
}

export async function fetchDataset(id: number): Promise<Dataset> {
  return apiFetch<Dataset>(`/datasets/${id}`);
}

export async function createDataset(payload: DatasetPayload): Promise<Dataset> {
  return apiFetch<Dataset>("/datasets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateDataset(
  id: number,
  payload: Partial<DatasetPayload>,
): Promise<Dataset> {
  return apiFetch<Dataset>(`/datasets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deactivateDataset(id: number): Promise<void> {
  await apiFetch<{ message: string }>(`/datasets/${id}`, { method: "DELETE" });
}

export async function deleteDatasetPermanently(
  id: number,
  confirmation: string,
): Promise<{ message: string; file_cleanup_pending: boolean }> {
  return apiFetch(`/datasets/${id}/permanent`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation }),
  });
}

export async function activateDataset(id: number): Promise<Dataset> {
  return apiFetch<Dataset>(`/datasets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: true }),
  });
}

export async function downloadDatasetTemplate(id: number): Promise<void> {
  const generation = sessionGeneration();
  const response = await apiRequest(`/datasets/${id}/template`);
  if (!response.ok) throw new Error("Could not download the template. Please retry.");
  const blob = await response.blob();
  assertSession(generation);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dataset-${id}-template.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Upload / Batch
// ---------------------------------------------------------------------------

export async function uploadDatasetFile(
  datasetId: number,
  file: File,
  confirmation?: { sheets: string[] },
): Promise<UploadPreview> {
  const form = new FormData();
  form.append("file", file);
  if (confirmation) {
    form.append("confirmed_single_event", "1");
    form.append("reviewed_sheets", JSON.stringify(confirmation.sheets));
  }
  return apiFetch<UploadPreview>(`/datasets/${datasetId}/upload`, {
    method: "POST",
    body: form,
  });
}

export async function fetchBatches(datasetId: number): Promise<{ data: UploadBatch[] }> {
  return apiFetch<{ data: UploadBatch[] }>(`/datasets/${datasetId}/batches`);
}

export async function fetchBatch(batchId: number): Promise<UploadBatch> {
  return apiFetch<UploadBatch>(`/batches/${batchId}`);
}

export async function commitBatch(batchId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/batches/${batchId}/commit`, {
    method: "POST",
  });
}

export async function rollbackBatch(batchId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/batches/${batchId}/rollback`, {
    method: "POST",
  });
}

export async function resolveConflict(
  batchId: number,
  conflictId: number,
  resolution: Exclude<ConflictResolution, "pending">,
  mergedData?: Record<string, unknown>,
): Promise<{ message: string; pending_conflicts: number }> {
  return apiFetch<{ message: string; pending_conflicts: number }>(
    `/batches/${batchId}/conflicts/${conflictId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, merged_data: mergedData }),
    },
  );
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export async function fetchRecords(
  datasetId: number,
  params?: Record<string, string>,
): Promise<PaginatedRecords> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch<PaginatedRecords>(`/datasets/${datasetId}/records${qs}`);
}

export async function fetchRecord(
  datasetId: number,
  recordId: number,
): Promise<{ record: DatasetRecord; history: RecordHistoryEntry[] }> {
  return apiFetch(`/datasets/${datasetId}/records/${recordId}`);
}

export async function updateRecord(
  datasetId: number,
  recordId: number,
  data: Record<string, unknown>,
  psgcCode?: string | null,
): Promise<DatasetRecord> {
  return apiFetch<DatasetRecord>(`/datasets/${datasetId}/records/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data,
      ...(psgcCode !== undefined ? { psgc_code: psgcCode } : {}),
    }),
  });
}

export async function updateRecordStatus(
  datasetId: number,
  recordId: number,
  status: RecordStatus,
): Promise<DatasetRecord> {
  return apiFetch<DatasetRecord>(`/datasets/${datasetId}/records/${recordId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function fetchRecordHistory(
  datasetId: number,
  recordId: number,
): Promise<RecordHistoryEntry[]> {
  return apiFetch<RecordHistoryEntry[]>(`/datasets/${datasetId}/records/${recordId}/history`);
}

// ---------------------------------------------------------------------------
// Map Layer
// ---------------------------------------------------------------------------

export async function fetchDatasetLayer(
  datasetId: number,
  filters: DatasetFilterValues = {},
  prefix?: string,
): Promise<LayerResponse> {
  const res = await apiFetch<LayerResponse>(
    `/datasets/${datasetId}/layer${filterQuery(filters, prefix)}`,
  );
  // Ensure psgc_code is always a string regardless of DB column type
  res.layer_data = res.layer_data
    .filter((pt) => pt.psgc_code != null)
    .map((pt) => ({ ...pt, psgc_code: String(pt.psgc_code) }));
  return res;
}

// ---------------------------------------------------------------------------
// Map panel records (limited columns, filtered by psgc prefix)
// ---------------------------------------------------------------------------

export interface MapPanelRecord {
  id: number;
  psgc_code: string | null;
  data: Record<string, unknown>;
}

export interface MapPanelRecordsResponse {
  data: MapPanelRecord[];
  total: number;
}

export async function fetchMapPanelRecords(
  datasetId: number,
  psgcPrefix?: string,
  page = 1,
  filters: DatasetFilterValues = {},
): Promise<MapPanelRecordsResponse> {
  const params: Record<string, string> = {
    per_page: "20",
    page: String(page),
    status: "active",
    filters: JSON.stringify(filters),
  };
  if (psgcPrefix) params.psgc_prefix = psgcPrefix;
  const qs = "?" + new URLSearchParams(params).toString();
  return apiFetch<MapPanelRecordsResponse>(`/datasets/${datasetId}/records${qs}`);
}
