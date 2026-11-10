import manifest from "../data/philippineBoundaries.json" with { type: "json" };

export type BoundaryLevel = "region" | "province" | "municity" | "barangay";
interface BoundaryEntry {
  file: string;
  codeField: string;
  featureCount: number;
  regionCodes?: string[];
  sha256: string;
}
interface BarangayManifest {
  barangays: Record<string, BoundaryEntry>;
  withoutShapes: string[];
}

/** The city exists but the source has no barangay shapes for it (or no file was packed). */
export class BarangayShapesUnavailable extends Error {
  constructor() {
    super("Barangay shapes are not available for this city.");
    this.name = "BarangayShapesUnavailable";
  }
}

export const boundaryAttribution =
  'Boundaries: <a href="https://github.com/faeldon/philippines-json-maps">Faeldon</a> / NAMRIA, PSA via OCHA (historical 2019 snapshot)';

/** Look up real asset/parent entries; do not manufacture filenames from a current PSGC code. */
export function boundaryEntries(
  level: BoundaryLevel,
  region?: string,
  province?: string,
): BoundaryEntry[] {
  if (level === "region") return [manifest.regions];
  if (level === "barangay") return []; // Barangay files are resolved asynchronously by the loader.
  if (level === "province") {
    const entries = Object.entries(manifest.provinces);
    return entries.filter(([code]) => !region || code === region).map(([, entry]) => entry);
  }
  return Object.entries(manifest.municipalities)
    .filter(([code, entry]) =>
      province ? code === province : !!region && entry.regionCodes.includes(region),
    )
    .map(([, entry]) => entry);
}

function validate(value: unknown, entry: BoundaryEntry): GeoJSON.FeatureCollection {
  const collection = value as GeoJSON.FeatureCollection;
  if (
    !collection ||
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    collection.features.length !== entry.featureCount
  )
    throw new Error(`Boundary file is missing or invalid: ${entry.file}`);
  for (const feature of collection.features) {
    if (
      feature.type !== "Feature" ||
      !/^PH\d{9}$/.test(String(feature.properties?.[entry.codeField] ?? "")) ||
      !feature.geometry ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry.type)
    )
      throw new Error(`Incompatible boundary feature: ${entry.file}`);
  }
  return collection;
}

/** Same-origin static assets; shared in-flight/cache entries, with failures evicted for retry. */
export function createBoundaryLoader(fetcher: typeof fetch = fetch, baseUrl = "/maps/ph-2019/") {
  const cache = new Map<string, Promise<GeoJSON.FeatureCollection>>();
  // ~400 KB index of per-city barangay files: fetched once, on first use, and checksum-versioned.
  let barangayIndex: Promise<BarangayManifest> | undefined;
  function loadBarangayIndex(): Promise<BarangayManifest> {
    const { file, sha256 } = manifest.barangayIndex;
    const request = (async () => {
      const response = await fetcher(
        `${baseUrl.replace(/\/?$/, "/")}${file}?v=${sha256.slice(0, 12)}`,
      );
      if (!response.ok) throw new Error(`Could not load the barangay index (${response.status})`);
      const index = (await response.json()) as BarangayManifest;
      if (!index?.barangays || !Array.isArray(index.withoutShapes))
        throw new Error("The barangay index is invalid.");
      return index;
    })();
    barangayIndex = request;
    void request.catch(() => {
      if (barangayIndex === request) barangayIndex = undefined;
    });
    return request;
  }
  function loadFile(entry: BoundaryEntry): Promise<GeoJSON.FeatureCollection> {
    const url = `${baseUrl.replace(/\/?$/, "/")}${entry.file}?v=${entry.sha256.slice(0, 12)}`;
    const existing = cache.get(url);
    if (existing) return existing;
    const request = (async () => {
      const response = await fetcher(url);
      if (!response.ok)
        throw new Error(`Could not load local boundaries (${response.status}): ${entry.file}`);
      return validate(await response.json(), entry);
    })();
    cache.set(url, request);
    void request.catch(() => {
      if (cache.get(url) === request) cache.delete(url);
    });
    return request;
  }
  return async (
    level: BoundaryLevel,
    region?: string,
    province?: string,
    city?: string,
  ): Promise<GeoJSON.FeatureCollection> => {
    let entries: BoundaryEntry[];
    if (level === "barangay") {
      const entry = city
        ? (await (barangayIndex ?? loadBarangayIndex())).barangays[city]
        : undefined;
      if (!entry) throw new BarangayShapesUnavailable();
      entries = [entry];
    } else {
      entries = boundaryEntries(level, region, province);
    }
    if (!entries.length)
      throw new Error("No compatible historical boundaries are available for this area.");
    // Reject an incomplete load instead of presenting partial country coverage as complete.
    const collections = await Promise.all(entries.map(loadFile));
    const seen = new Set<string>();
    const codeField = entries[0].codeField;
    const features = collections
      .flatMap((collection) => collection.features)
      .filter((feature) => {
        const code = String(feature.properties?.[codeField]);
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      });
    return { type: "FeatureCollection", features };
  };
}
