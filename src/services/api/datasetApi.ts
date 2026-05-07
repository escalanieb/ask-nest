import { apiFetch } from "./_fetch";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type EntityType = "person" | "establishment" | "location" | "event";
export type PsgcLevel = "barangay" | "city" | "province";
export type AggregateFunction = "count" | "sum" | "average" | "max";
export type RecordStatus = "active" | "inactive";
export type BatchStatus = "pending" | "committed" | "rolled_back";
export type ConflictResolution =
  | "pending"
  | "keep_existing"
  | "take_new"
  | "merge";

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
}

export interface Dataset {
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
  psgc_code: string;
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
    "id" | "name" | "entity_type" | "psgc_level" | "layer_config"
  >;
  layer_data: LayerDataPoint[];
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

export async function activateDataset(id: number): Promise<Dataset> {
  return apiFetch<Dataset>(`/datasets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: true }),
  });
}

export function getTemplateUrl(id: number): string {
  const token =
    (
      JSON.parse(localStorage.getItem("auth-store") ?? "{}") as {
        state?: { token?: string };
      }
    ).state?.token ?? "";
  return `${BASE_URL}/datasets/${id}/template?token=${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// Upload / Batch
// ---------------------------------------------------------------------------

export async function uploadDatasetFile(
  datasetId: number,
  file: File,
): Promise<UploadPreview> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<UploadPreview>(`/datasets/${datasetId}/upload`, {
    method: "POST",
    body: form,
  });
}

export async function fetchBatches(
  datasetId: number,
): Promise<{ data: UploadBatch[] }> {
  return apiFetch<{ data: UploadBatch[] }>(`/datasets/${datasetId}/batches`);
}

export async function fetchBatch(batchId: number): Promise<UploadBatch> {
  return apiFetch<UploadBatch>(`/batches/${batchId}`);
}

export async function commitBatch(
  batchId: number,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/batches/${batchId}/commit`, {
    method: "POST",
  });
}

export async function rollbackBatch(
  batchId: number,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/batches/${batchId}/rollback`, {
    method: "POST",
  });
}

export async function resolveConflict(
  batchId: number,
  conflictId: number,
  resolution: Exclude<ConflictResolution, "pending">,
  mergedData?: Record<string, unknown>,
): Promise<BatchConflict> {
  return apiFetch<BatchConflict>(
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
  psgcCode?: string,
): Promise<DatasetRecord> {
  return apiFetch<DatasetRecord>(`/datasets/${datasetId}/records/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data,
      ...(psgcCode ? { psgc_code: psgcCode } : {}),
    }),
  });
}

export async function updateRecordStatus(
  datasetId: number,
  recordId: number,
  status: RecordStatus,
): Promise<DatasetRecord> {
  return apiFetch<DatasetRecord>(
    `/datasets/${datasetId}/records/${recordId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
}

export async function fetchRecordHistory(
  datasetId: number,
  recordId: number,
): Promise<RecordHistoryEntry[]> {
  return apiFetch<RecordHistoryEntry[]>(
    `/datasets/${datasetId}/records/${recordId}/history`,
  );
}

// ---------------------------------------------------------------------------
// Map Layer
// ---------------------------------------------------------------------------

export async function fetchDatasetLayer(
  datasetId: number,
): Promise<LayerResponse> {
  const res = await apiFetch<LayerResponse>(`/datasets/${datasetId}/layer`);
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
  psgc_code: string;
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
): Promise<MapPanelRecordsResponse> {
  const params: Record<string, string> = { per_page: "20", page: String(page) };
  if (psgcPrefix) params.psgc_prefix = psgcPrefix;
  const qs = "?" + new URLSearchParams(params).toString();
  return apiFetch<MapPanelRecordsResponse>(
    `/datasets/${datasetId}/records${qs}`,
  );
}
