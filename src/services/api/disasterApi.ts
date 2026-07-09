import { apiFetch } from "./_fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DisasterType =
  | "earthquake"
  | "typhoon"
  | "flood"
  | "volcano"
  | "drought"
  | "alert"
  | "humanitarian";

export type DisasterSeverity = "low" | "medium" | "high";
export type DisasterSource = "USGS" | "GDACS" | "ReliefWeb";

export interface DisasterMetrics {
  // USGS
  magnitude?: number;
  depth_km?: number;
  felt?: number | null;
  tsunami?: number;
  alert?: string | null;
  // GDACS (general)
  alert_level?: string;
  event_type?: string;
  event_id?: string | null;
  population?: string | null;
  // GDACS — Tropical Cyclone specific
  storm_name?: string | null;
  storm_bbox?: string | null;   // "lonMin lonMax latMin latMax"
  wind_speed?: number | null;   // km/h
  episode_id?: string | null;
  // ReliefWeb
  disaster_types?: string[];
  themes?: string[];
  url?: string | null;
}

export interface DisasterEvent {
  id: number;
  external_id: string;
  type: DisasterType;
  source: DisasterSource;
  title: string;
  severity: DisasterSeverity;
  status: string;
  lat: number | null;
  lng: number | null;
  location_label: string | null;
  summary: string | null;
  metrics: DisasterMetrics | null;
  event_started_at: string | null;
  updated_at: string;
}

export interface DisasterListResponse {
  data: DisasterEvent[];
  count: number;
}

export interface DisasterLatestResponse {
  generated_at: string;
  count: number;
  data: DisasterEvent[];
}

export interface DisasterCounts {
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface DisasterQueryParams {
  type?: string;
  severity?: string;
  source?: string;
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
  limit?: number;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

function buildQuery(params: DisasterQueryParams): string {
  const parts: string[] = [];
  if (params.type) parts.push(`type=${encodeURIComponent(params.type)}`);
  if (params.severity)
    parts.push(`severity=${encodeURIComponent(params.severity)}`);
  if (params.source) parts.push(`source=${encodeURIComponent(params.source)}`);
  if (params.bbox) parts.push(`bbox=${encodeURIComponent(params.bbox)}`);
  if (params.limit) parts.push(`limit=${params.limit}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export const disasterApi = {
  /**
   * GET /api/disasters — full filtered list (auth required).
   */
  list: (params: DisasterQueryParams = {}): Promise<DisasterListResponse> =>
    apiFetch<DisasterListResponse>(`/disasters${buildQuery(params)}`),

  /**
   * GET /api/disasters/latest — fast snapshot (auth required).
   */
  latest: (): Promise<DisasterLatestResponse> =>
    apiFetch<DisasterLatestResponse>("/disasters/latest"),

  /**
   * GET /api/disasters/counts — public; used for sidebar badges.
   */
  counts: (): Promise<DisasterCounts> =>
    apiFetch<DisasterCounts>("/disasters/counts"),

  /**
   * GET /api/disasters/typhoon/ph — public; Philippines-scoped typhoon events.
   * Cached server-side for 5 minutes.
   */
  typhoonPh: (limit = 50): Promise<DisasterListResponse> =>
    apiFetch<DisasterListResponse>(`/disasters/typhoon/ph?limit=${limit}`),
};
