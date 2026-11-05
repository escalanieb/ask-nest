import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createBoundaryLoader } from "../src/services/mapBoundaries.ts";
import {
  canonicalPsgc,
  createTipasPlacer,
  representativePoint,
} from "../src/services/tipasPlacement.ts";

async function localFetch(input: string | URL | Request) {
  const url = new URL(String(input), "http://localhost");
  return new Response(await readFile(new URL(`../public${url.pathname}`, import.meta.url)));
}

function inside(ring: number[][], lng: number, lat: number) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

test("representative point stays inside a concave shape and outside holes", () => {
  // C-shape: vertex mean falls in the notch (outside).
  const c: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [
      [[0, 0], [10, 0], [10, 2], [2, 2], [2, 8], [10, 8], [10, 10], [0, 10], [0, 0]],
    ],
  };
  const p = representativePoint(c)!;
  assert.ok(inside(c.coordinates[0], p.lng, p.lat));
  const holed: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]],
    ],
  };
  const h = representativePoint(holed)!;
  assert.ok(inside(holed.coordinates[0], h.lng, h.lat));
  assert.ok(!inside(holed.coordinates[1], h.lng, h.lat));
});

test("multipolygon uses the largest part and is deterministic", () => {
  const mp: GeoJSON.MultiPolygon = {
    type: "MultiPolygon",
    coordinates: [
      [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]],
    ],
  };
  const a = representativePoint(mp)!;
  assert.deepEqual(a, representativePoint(mp));
  assert.ok(a.lng > 20 && a.lng < 30 && a.lat > 20 && a.lat < 30);
});

test("canonicalPsgc rejects non nine-digit codes without truncating", () => {
  assert.equal(canonicalPsgc("072226000"), "072226000");
  assert.equal(canonicalPsgc("0722260000"), null);
  assert.equal(canonicalPsgc("72226000"), null);
  assert.equal(canonicalPsgc(null), null);
});

test("Lapu-Lapu and Taguig resolve inside their city polygons, independent of call history", async () => {
  const load = createBoundaryLoader(localFetch as typeof fetch);
  const place = createTipasPlacer(load);
  for (const [code, region] of [
    ["072226000", "070000000"],
    ["137607000", "130000000"],
  ]) {
    const cities = await load("municity", region);
    const f = cities.features.find((x) => x.properties?.ADM3_PCODE === "PH" + code)!;
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : (f.geometry as GeoJSON.MultiPolygon).coordinates;
    const p = (await place(code))!;
    assert.equal(p.accuracy, "city");
    assert.ok(polys.some((poly) => inside(poly[0], p.lng, p.lat)), `${code} inside`);
    // A fresh placer (different history) yields the identical point.
    const again = (await createTipasPlacer(createBoundaryLoader(localFetch as typeof fetch))(
      code,
    ))!;
    assert.deepEqual(again, p);
  }
});

test("unknown city falls back to province/region with explicit accuracy; bad codes are unmapped", async () => {
  const place = createTipasPlacer(createBoundaryLoader(localFetch as typeof fetch));
  const prov = (await place("072299999"))!;
  assert.equal(prov.accuracy, "province");
  assert.equal(prov.areaCode, "072200000");
  const reg = (await place("079999999"))!;
  assert.equal(reg.accuracy, "region");
  assert.equal(await place("0722260000"), null);
  assert.equal(await place("990000000"), null);
});
