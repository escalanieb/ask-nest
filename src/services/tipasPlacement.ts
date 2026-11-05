import type { BoundaryLevel } from "./mapBoundaries";

/** Bump when the placement algorithm changes so cached results are not reused. */
export const TIPAS_PLACEMENT_VERSION = "interior-v1";
export const TIPAS_GEO_VERSION = "ph-2019-medres";

export type PlacementAccuracy = "city" | "province" | "region";
export interface TipasPlacement {
  lat: number;
  lng: number;
  /** Resolved administrative area (nine digits, no PH prefix). */
  areaCode: string;
  accuracy: PlacementAccuracy;
}

type Ring = [number, number][];
type Loader = (
  level: BoundaryLevel,
  region?: string,
  province?: string,
) => Promise<GeoJSON.FeatureCollection>;

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(a / 2);
}

/** Widest interior interval of a polygon (outer ring + holes) along horizontal line y. */
function widestInterval(rings: Ring[], y: number): { lo: number; hi: number } | null {
  const xs: number[] = [];
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
  }
  xs.sort((a, b) => a - b);
  let best: { lo: number; hi: number } | null = null;
  // Even-odd rule: consecutive pairs are inside the polygon (holes cut out automatically).
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (!best || xs[i + 1] - xs[i] > best.hi - best.lo) best = { lo: xs[i], hi: xs[i + 1] };
  }
  return best && best.hi > best.lo ? best : null;
}

/**
 * Deterministic point guaranteed to lie inside the geometry (not a vertex mean).
 * Uses the largest polygon part, then the widest interior span of several scanlines.
 * Holes are respected; multipart areas use only their largest part.
 */
export function representativePoint(
  geometry: GeoJSON.Geometry | null | undefined,
): { lat: number; lng: number } | null {
  if (!geometry) return null;
  let polygons: number[][][][];
  if (geometry.type === "Polygon") polygons = [geometry.coordinates];
  else if (geometry.type === "MultiPolygon") polygons = geometry.coordinates;
  else return null;
  let best: Ring[] | null = null;
  let bestArea = -1;
  for (const poly of polygons) {
    const rings = poly as Ring[];
    if (!rings.length || rings[0].length < 4) continue;
    const area = ringArea(rings[0]) - rings.slice(1).reduce((s, r) => s + ringArea(r), 0);
    if (area > bestArea) {
      bestArea = area;
      best = rings;
    }
  }
  if (!best) return null;
  const ys = best[0].map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let found: { y: number; lo: number; hi: number } | null = null;
  const STEPS = 21;
  for (let k = 0; k < STEPS; k++) {
    // Start at the middle and alternate outwards for a centred, deterministic choice.
    const offset = ((k % 2 ? 1 : -1) * Math.ceil(k / 2)) / (STEPS + 1);
    const y = minY + (maxY - minY) * (0.5 + offset);
    const span = widestInterval(best, y);
    if (span && (!found || span.hi - span.lo > found.hi - found.lo))
      found = { y, ...span };
  }
  if (!found) return null;
  return { lat: found.y, lng: (found.lo + found.hi) / 2 };
}

const strip = (code: unknown): string => String(code ?? "").replace(/^PH/, "");

/** Canonical legacy code: exactly nine digits. Anything else (e.g. modern 10-digit) is unmapped. */
export function canonicalPsgc(code: string | null | undefined): string | null {
  const c = (code ?? "").trim();
  return /^\d{9}$/.test(c) ? c : null;
}

/**
 * Resolve an event PSGC code to a stable point, independent of the displayed
 * boundary level or any rendering cache. Falls back city → province → region
 * and reports which one was used. Returns null for unmapped codes.
 */
export function createTipasPlacer(loader: Loader) {
  const memo = new Map<string, Promise<TipasPlacement | null>>();

  async function find(
    level: BoundaryLevel,
    field: string,
    code: string,
    region: string,
    province?: string,
  ): Promise<TipasPlacement | null> {
    let collection: GeoJSON.FeatureCollection;
    try {
      collection = await loader(level, region, province);
    } catch {
      return null;
    }
    const feature = collection.features.find((f) => strip(f.properties?.[field]) === code);
    const pt = representativePoint(feature?.geometry);
    if (!pt) return null;
    return {
      ...pt,
      areaCode: code,
      accuracy: level === "municity" ? "city" : level === "province" ? "province" : "region",
    };
  }

  async function compute(code: string): Promise<TipasPlacement | null> {
    const region = code.slice(0, 2) + "0000000";
    const province = code.slice(0, 4) + "00000";
    if (code !== region && code !== province) {
      const city = await find("municity", "ADM3_PCODE", code, region);
      if (city) return city;
    }
    if (code !== region) {
      const prov = await find("province", "ADM2_PCODE", province, region);
      if (prov) return prov;
    }
    return find("region", "ADM1_PCODE", region, region);
  }

  return function place(rawCode: string | null | undefined): Promise<TipasPlacement | null> {
    const code = canonicalPsgc(rawCode);
    if (!code) return Promise.resolve(null);
    let p = memo.get(code);
    if (!p) {
      p = compute(code).then((r) => {
        // Do not memoize failures (e.g. transient asset errors) so they can retry.
        if (!r) memo.delete(code);
        return r;
      });
      memo.set(code, p);
    }
    return p;
  };
}
