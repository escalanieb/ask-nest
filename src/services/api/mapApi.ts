import { apiFetch } from "./_fetch";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export interface MapRecord {
  id: number;
  name: string;
  category: string;
  city_muni_code?: string | null;
  status: string;
}

export interface MapLocationData {
  psgc_code: string;
  name: string;
  type: string;
  total_records: number;
  records: MapRecord[];
}

export interface MapItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  psgc_code: string;
  city_muni_code?: string;
  barangay_code?: string;
  status: string;
  category: string;
  address: string;
  notes: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MapItemPayload {
  name: string;
  latitude: number | string;
  tags?: string[];
  longitude: number | string;
  psgc_code: string;
  city_muni_code?: string;
  barangay_code?: string;
  status: string;
  category: string;
  address?: string;
  notes?: string;
}

export interface MapItemsPage {
  data: MapItem[];
  total: number;
  page: number;
  last_page: number;
}

export async function fetchLocationData(
  psgcCode: string,
): Promise<MapLocationData> {
  return apiFetch<MapLocationData>(`/map/location/${psgcCode}`);
}

export async function fetchMapItems(
  params?: Record<string, string>,
): Promise<MapItemsPage> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch<MapItemsPage>(`/items${qs}`);
}

export async function createMapItem(payload: MapItemPayload): Promise<MapItem> {
  return apiFetch<MapItem>("/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateMapItem(
  id: number,
  payload: MapItemPayload,
): Promise<MapItem> {
  return apiFetch<MapItem>(`/items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteMapItem(id: number): Promise<void> {
  await apiFetch<{ message: string }>(`/items/${id}`, { method: "DELETE" });
}

export async function importMapItemsCsv(
  file: File,
): Promise<{ imported: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ imported: number; errors: string[] }>("/items/import", {
    method: "POST",
    body: form,
  });
}

export function getExportUrl(params?: Record<string, string>): string {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return `${BASE_URL}/items/export${qs}`;
}

export async function fetchAllTags(): Promise<string[]> {
  return apiFetch<string[]>("/items/tags");
}
