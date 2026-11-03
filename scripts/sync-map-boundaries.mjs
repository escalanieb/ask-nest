import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/maps/ph-2019");
const manifestPath = path.join(root, "src/data/philippineBoundaries.json");
const repository = "faeldon/philippines-json-maps";
// Last known compatible legacy property/code schema; never follow a moving branch.
const revision = "8eeead560246863c8c820c31ca6fbca81a279477";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const code = /^PH\d{9}$/;

function validate(collection, field) {
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    !collection.features.length
  )
    throw new Error("Empty or invalid boundary collection");
  const ids = new Set();
  for (const feature of collection.features) {
    const id = feature.properties?.[field];
    if (
      feature.type !== "Feature" ||
      !code.test(id) ||
      ids.has(id) ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry?.type) ||
      !feature.geometry.coordinates.length
    )
      throw new Error(`Invalid/duplicate feature ${id}`);
    ids.add(id);
  }
  return collection.features.length;
}

async function check() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entries = [
    manifest.regions,
    ...Object.values(manifest.provinces),
    ...Object.values(manifest.municipalities),
  ];
  let bytes = 0;
  for (const entry of entries) {
    const buffer = await readFile(path.join(output, entry.file));
    if (digest(buffer) !== entry.sha256) throw new Error(`Checksum mismatch: ${entry.file}`);
    if (validate(JSON.parse(buffer), entry.codeField) !== entry.featureCount)
      throw new Error(`Feature count changed: ${entry.file}`);
    bytes += buffer.length;
  }
  console.log(
    `Verified ${entries.length} local boundary files; ${(bytes / 1024 / 1024).toFixed(2)} MiB; all checksums and feature IDs match.`,
  );
}

async function download(url) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "ask-nest-boundary-pack" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

function compact(collection) {
  const properties = [
    "ADM0_EN",
    "ADM0_PCODE",
    "ADM1_EN",
    "ADM1_PCODE",
    "ADM2_EN",
    "ADM2_PCODE",
    "ADM3_EN",
    "ADM3_PCODE",
    "date",
    "validOn",
  ];
  const coordinates = (value) =>
    Array.isArray(value)
      ? value.map(coordinates)
      : typeof value === "number" && Number.isFinite(value)
        ? Number(value.toFixed(6))
        : (() => {
            throw new Error("Invalid boundary coordinate");
          })();
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      type: "Feature",
      properties: Object.fromEntries(
        properties
          .filter((key) => Object.hasOwn(feature.properties, key))
          .map((key) => [key, feature.properties[key]]),
      ),
      geometry: {
        type: feature.geometry.type,
        coordinates: coordinates(feature.geometry.coordinates),
      },
    })),
  };
}

async function sync() {
  const response = await download(
    `https://api.github.com/repos/${repository}/git/trees/${revision}?recursive=1`,
  );
  const tree = JSON.parse(response);
  if (tree.truncated || !Array.isArray(tree.tree))
    throw new Error("Could not enumerate the pinned source tree");
  const sources = tree.tree.filter(
    (entry) =>
      entry.type === "blob" &&
      /^2019\/geojson\/(regions|provinces|municties)\/medres\/[^/]+\.json$/.test(entry.path),
  );
  if (sources.length !== 106)
    throw new Error(`Expected 106 compatible boundary files; found ${sources.length}`);
  const files = new Array(sources.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < sources.length) {
        const index = next++;
        const source = sources[index];
        const original = await download(
          `https://raw.githubusercontent.com/${repository}/${revision}/${source.path}`,
        );
        // Verify the download against Git's content-addressed blob, not only its URL.
        const gitHash = createHash("sha1")
          .update(`blob ${original.length}\0`)
          .update(original)
          .digest("hex");
        if (gitHash !== source.sha)
          throw new Error(`Upstream blob verification failed: ${source.path}`);
        const level = source.path.split("/")[2];
        const field =
          level === "regions" ? "ADM1_PCODE" : level === "provinces" ? "ADM2_PCODE" : "ADM3_PCODE";
        const collection = JSON.parse(original);
        validate(collection, field);
        const data = compact(collection);
        const featureCount = validate(data, field);
        const parent = source.path.match(/-ph(\d{9})\./)?.[1];
        const file =
          level === "regions"
            ? "regions.json"
            : `${level === "provinces" ? "provinces" : "municipalities"}-${parent}.json`;
        if (level !== "regions" && !parent)
          throw new Error(`Unexpected source name: ${source.path}`);
        const bytes = Buffer.from(JSON.stringify(data) + "\n");
        const regionCodes = [
          ...new Set(data.features.map((f) => f.properties.ADM1_PCODE.slice(2))),
        ];
        files[index] = {
          bytes,
          level,
          parent,
          entry: {
            file,
            codeField: field,
            featureCount,
            regionCodes,
            sha256: digest(bytes),
            sourcePath: source.path,
            sourceBlob: source.sha,
          },
        };
      }
    }),
  );
  const license = await download(
    `https://raw.githubusercontent.com/${repository}/${revision}/LICENSE`,
  );
  const manifest = {
    schemaVersion: 1,
    vintage: "2019",
    resolution: "medres",
    coordinateDecimals: 6,
    repository: `https://github.com/${repository}`,
    revision,
    regions: null,
    provinces: {},
    municipalities: {},
  };
  for (const file of files) {
    if (file.level === "regions") manifest.regions = file.entry;
    else
      manifest[file.level === "provinces" ? "provinces" : "municipalities"][file.parent] =
        file.entry;
  }
  if (
    !manifest.regions ||
    Object.keys(manifest.provinces).length !== 18 ||
    Object.keys(manifest.municipalities).length !== 87
  )
    throw new Error("Incomplete boundary manifest");
  // All downloads/validation finish before any application assets are changed.
  await mkdir(output, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  for (const file of files) await writeFile(path.join(output, file.entry.file), file.bytes);
  await writeFile(path.join(output, "LICENSE.txt"), license);
  await writeFile(
    path.join(output, "NOTICE.txt"),
    `Philippine administrative boundary snapshot (historical 2019 directory)\n\nSource: https://github.com/${repository}/tree/${revision}/2019\nMedium-resolution source GeoJSON; retained administrative properties, coordinates rounded to six decimal places.\nMap processing: Copyright James Faeldon, MIT (see LICENSE.txt).\nUnderlying boundaries: credit NAMRIA and PSA, through OCHA's Philippines COD-AB, CC BY-IGO 3.0.\nhttps://data.humdata.org/dataset/cod-ab-phl\nhttps://creativecommons.org/licenses/by/3.0/igo/\n\nThis compatibility snapshot preserves the application's historical nine-digit PSGC joins.\nIt does not represent current administrative divisions. Some features contain earlier source validity dates.\nDo not substitute a new vintage without validating code correspondence and feature-property changes.\n`,
  );
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  await check();
}

try {
  if (process.argv.includes("--check")) await check();
  else await sync();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
