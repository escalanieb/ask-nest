const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export interface AnalyticsSummary {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_region: Record<string, number>;
}

export async function fetchAnalyticsSummary(psgcCode?: string | null): Promise<AnalyticsSummary> {
  const qs = psgcCode ? `?psgc_code=${encodeURIComponent(psgcCode)}` : "";
  const res = await fetch(`${BASE_URL}/analytics/summary${qs}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AnalyticsSummary>;
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
  const res = await fetch(`${BASE_URL}/analytics/datasets${qs}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<DatasetCoverage>;
}
