import { apiFetch } from "./_fetch";

export interface AnalyticsSummary {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_region: Record<string, number>;
}

export async function fetchAnalyticsSummary(psgcCode?: string | null): Promise<AnalyticsSummary> {
  const qs = psgcCode ? `?psgc_code=${encodeURIComponent(psgcCode)}` : "";
  return apiFetch<AnalyticsSummary>(`/analytics/summary${qs}`);
}

export interface DatasetCoverageItem {
  id: number;
  name: string;
  entity_type: string;
  psgc_level: string;
  record_count: number;
}

export interface DatasetCoverage {
  datasets: DatasetCoverageItem[];
  total_records: number;
}

export async function fetchDatasetCoverage(psgcPrefix?: string | null): Promise<DatasetCoverage> {
  const qs = psgcPrefix ? `?psgc_prefix=${encodeURIComponent(psgcPrefix)}` : "";
  return apiFetch<DatasetCoverage>(`/analytics/datasets${qs}`);
}
