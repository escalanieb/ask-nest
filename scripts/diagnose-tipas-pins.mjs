// Read-only reproduction of MapCanvas's current TIPAS placement, using real local boundaries.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../public/maps/ph-2019/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("../src/data/philippineBoundaries.json", import.meta.url), "utf8"),
);
const code = process.argv.find((arg) => /^\d{9}$/.test(arg)) ?? "137607000";
const vertices = (value) => (typeof value[0] === "number" ? [value] : value.flatMap(vertices));
// Ray casting for diagnostic containment; fixtures here are ordinary Philippine polygons.
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function contains(geometry, point) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    ([outer, ...holes]) => inRing(point, outer) && !holes.some((hole) => inRing(point, hole)),
  );
}
function centre(feature) {
  const points = vertices(feature.geometry.coordinates);
  const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  return {
    lat,
    lng,
    vertices: points.length,
    insideResolvedArea: contains(feature.geometry, [lng, lat]),
  };
}
const cache = new Map();
async function add(entry) {
  const collection = JSON.parse(await readFile(new URL(entry.file, root), "utf8"));
  for (const feature of collection.features)
    cache.set(feature.properties[entry.codeField].replace(/^PH/, ""), centre(feature));
}
function result(step) {
  const resolvedCode = [code, code.slice(0, 4) + "00000", code.slice(0, 2) + "0000000"].find(
    (candidate) => cache.has(candidate),
  );
  return {
    step,
    eventCode: code,
    resolvedCode: resolvedCode ?? null,
    point: cache.get(resolvedCode) ?? null,
  };
}
const rows = [];
await add(manifest.regions);
rows.push(result("fresh mount: region"));
for (const entry of Object.values(manifest.provinces)) await add(entry);
rows.push(result("then province"));
cache.clear(); // MapCanvas clears only when loading municipality boundaries.
const entries = Object.values(manifest.municipalities).filter((entry) =>
  entry.regionCodes.includes(code.slice(0, 2) + "0000000"),
);
for (const entry of entries) await add(entry);
rows.push(result("then city/municipality"));
await add(manifest.regions);
rows.push(result("return to region (retained city cache)"));
console.log(JSON.stringify({ assetRoot: fileURLToPath(root), rows }, null, 2));

if (process.argv.includes("--compare-upstream")) {
  const entry = manifest.municipalities[code.slice(0, 4) + "00000"];
  if (!entry) throw new Error("No legacy municipality file for this code");
  const repository = manifest.repository.replace("https://github.com/", "");
  const sourcePath = entry.sourcePath
    .replace("/medres/", "/hires/")
    .replace(".0.01.json", ".0.1.json");
  const url = `https://raw.githubusercontent.com/${repository}/${manifest.revision}/${sourcePath}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Pinned hires download failed: ${response.status} ${url}`);
  const collection = await response.json();
  const feature = collection.features.find((item) => item.properties.ADM3_PCODE === `PH${code}`);
  if (!feature) throw new Error("Code missing from pinned hires collection");
  const hires = centre(feature);
  const medres = cache.get(code);
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(radians(hires.lat - medres.lat) / 2) ** 2 +
    Math.cos(radians(hires.lat)) *
      Math.cos(radians(medres.lat)) *
      Math.sin(radians(hires.lng - medres.lng) / 2) ** 2;
  console.log(
    JSON.stringify(
      {
        source: url,
        hires,
        medres,
        distanceMetres: 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
      },
      null,
      2,
    ),
  );
}
