import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BarangayShapesUnavailable,
  boundaryEntries,
  createBoundaryLoader,
} from "../src/services/mapBoundaries.ts";

async function localFetch(input: string | URL | Request) {
  const url = new URL(String(input), "http://localhost");
  return new Response(await readFile(new URL(`../public${url.pathname}`, import.meta.url)));
}

test("local boundaries preserve the nine-digit feature contract at all three levels", async () => {
  const load = createBoundaryLoader(localFetch as typeof fetch);
  const regions = await load("region");
  assert.equal(regions.features.length, 18);
  assert.ok(regions.features.some((f) => f.properties?.ADM1_PCODE === "PH130000000"));
  const provinces = await load("province");
  assert.ok(provinces.features.length > 80);
  assert.ok(provinces.features.every((f) => /^PH\d{9}$/.test(f.properties?.ADM2_PCODE)));
  const cities = await load("municity", "130000000");
  // Legacy snapshot represents Manila's 14 subcity districts individually.
  assert.equal(cities.features.length, 30);
  assert.ok(cities.features.some((f) => f.properties?.ADM3_PCODE === "PH137607000"));
  assert.ok(cities.features.every((f) => f.properties?.ADM1_PCODE === "PH130000000"));
});

test("manifest selects existing parent files and never guesses an unknown area", () => {
  assert.equal(boundaryEntries("province").length, 18);
  assert.equal(boundaryEntries("province", "130000000").length, 1);
  assert.equal(boundaryEntries("municity", "130000000").length, 4);
  assert.equal(boundaryEntries("municity", undefined, "137400000").length, 1);
  assert.deepEqual(boundaryEntries("municity", "999999999"), []);
});

test("concurrent loads reuse cached files, respect a deployment base path, and retry failures", async () => {
  let requests = 0;
  const fetcher = async (input: string | URL | Request) => {
    requests++;
    const url = new URL(String(input), "http://localhost");
    assert.ok(url.pathname.startsWith("/portal/maps/ph-2019/"));
    assert.ok(url.searchParams.get("v"));
    if (requests === 1) return new Response("Unavailable", { status: 503 });
    return localFetch(url.pathname.replace("/portal", "") + url.search);
  };
  const load = createBoundaryLoader(fetcher as typeof fetch, "/portal/maps/ph-2019/");
  await assert.rejects(load("region"), /503/);
  const [a, b] = await Promise.all([load("region"), load("region")]);
  assert.equal(requests, 2);
  assert.equal(a.features.length, b.features.length);
});

test("a missing child file rejects a whole load instead of silently drawing partial coverage", async () => {
  const fetcher = async (input: string | URL | Request) =>
    String(input).includes("137400000")
      ? new Response("Missing", { status: 404 })
      : localFetch(input);
  const load = createBoundaryLoader(fetcher as typeof fetch);
  await assert.rejects(load("municity", "130000000"), /404/);
  await assert.rejects(load("municity", "999999999"), /No compatible/);
});

test("barangay shapes load per city, keep nine-digit codes and never invent a missing city", async () => {
  const load = createBoundaryLoader(localFetch as typeof fetch);
  const quezonCity = await load("barangay", undefined, undefined, "137404000");
  assert.ok(quezonCity.features.length > 100);
  assert.ok(
    quezonCity.features.every(
      (f) =>
        /^PH\d{9}$/.test(f.properties?.ADM4_PCODE) &&
        f.properties?.ADM3_PCODE === "PH137404000" &&
        ["Polygon", "MultiPolygon"].includes(f.geometry.type),
    ),
  );
  assert.ok(quezonCity.features.some((f) => f.properties?.ADM4_PCODE === "PH137404001"));
  // Source has barangays for this city but none with a shape; unknown codes are never guessed.
  for (const city of ["012801000", "999999999", undefined]) {
    await assert.rejects(
      load("barangay", undefined, undefined, city),
      (error) => error instanceof BarangayShapesUnavailable,
    );
  }
  assert.deepEqual(boundaryEntries("barangay"), []);
});

test("every packed barangay file stays inside the size budget and matches its manifest", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/maps/ph-2019/barangays/index.json", import.meta.url), "utf8"),
  );
  const entries = Object.values(manifest.barangays) as { file: string; featureCount: number }[];
  assert.ok(entries.length > 1600);
  assert.equal(entries.length + manifest.withoutShapes.length, 1647);
  let total = 0;
  for (const entry of entries) {
    const bytes = (await readFile(new URL(`../public/maps/ph-2019/${entry.file}`, import.meta.url)))
      .length;
    assert.ok(bytes <= 250 * 1024, entry.file);
    total += bytes;
  }
  assert.ok(total <= 18 * 1024 * 1024);
});
