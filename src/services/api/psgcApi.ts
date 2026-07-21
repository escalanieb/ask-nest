const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface PsgcRegion {
  code: string;
  name: string;
  regionName?: string;
  islandGroupCode?: string;
  psgc10DigitCode?: string;
}

export interface PsgcProvince {
  code: string;
  name: string;
  regionCode: string;
}

export interface PsgcDistrict {
  code: string;
  name: string;
  regionCode: string;
}

export interface PsgcCity {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string;
}

export interface PsgcMunicipality {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string;
}

export interface PsgcCityMunicipality {
  code: string;
  name: string;
  provinceCode: string;
}

export interface PsgcBarangay {
  code: string;
  name: string;
  cityMunicipalityCode: string;
}

export const psgcApi = {
  // Top-level collections
  regions: () => apiFetch<PsgcRegion[]>("/psgc/regions"),
  provinces: () => apiFetch<PsgcProvince[]>("/psgc/provinces"),
  citiesMunicipalities: () => apiFetch<PsgcCityMunicipality[]>("/psgc/cities-municipalities"),
  barangays: () => apiFetch<PsgcBarangay[]>("/psgc/barangays"),

  // Region sub-resources
  regionDetail: (regionCode: string) => apiFetch<PsgcRegion>(`/psgc/regions/${regionCode}`),
  regionProvinces: (regionCode: string) =>
    apiFetch<PsgcProvince[]>(`/psgc/regions/${regionCode}/provinces`),
  regionDistricts: (regionCode: string) =>
    apiFetch<PsgcDistrict[]>(`/psgc/regions/${regionCode}/districts`),
  regionCities: (regionCode: string) => apiFetch<PsgcCity[]>(`/psgc/regions/${regionCode}/cities`),
  regionMunicipalities: (regionCode: string) =>
    apiFetch<PsgcMunicipality[]>(`/psgc/regions/${regionCode}/municipalities`),
  regionCitiesMunicipalities: (regionCode: string) =>
    apiFetch<PsgcCityMunicipality[]>(`/psgc/regions/${regionCode}/cities-municipalities`),
  barangaysByCityMunicipality: (cityMuniCode: string) =>
    apiFetch<PsgcBarangay[]>(`/psgc/cities-municipalities/${cityMuniCode}/barangays`),
};
