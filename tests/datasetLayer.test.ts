import test from "node:test";
import assert from "node:assert/strict";
import { buildDatasetLayer, summarizeDatasetArea } from "../src/lib/datasetLayer.ts";
import type { LayerResponse } from "../src/services/api/datasetApi.ts";

const response = {
  dataset: { layer_config: { aggregate_function: "sum" } },
  layer_data: [
    { psgc_code: "012345001", count: 1, display_value: 10, tooltip: {} },
    { psgc_code: "012345002", count: 3, display_value: 20, tooltip: {} },
    { psgc_code: "012346001", count: 1, display_value: 5, tooltip: {} },
  ],
} as LayerResponse;

test("barangay imports roll up to cities, provinces and regions without mutating cached data", () => {
  const city = buildDatasetLayer(response, "municity");
  assert.equal(city.get("012345000")?.count, 4);
  assert.equal(city.get("012345000")?.display_value, 30);
  assert.equal(buildDatasetLayer(response, "province").get("012300000")?.display_value, 35);
  assert.equal(buildDatasetLayer(response, "region").get("010000000")?.count, 5);
  assert.equal(response.layer_data[0].count, 1);
});

test("averages are weighted by record count and maxima stay maxima when areas are grouped", () => {
  const average = {
    ...response,
    dataset: {
      ...response.dataset,
      layer_config: { ...response.dataset.layer_config, aggregate_function: "average" as const },
    },
  };
  assert.equal(buildDatasetLayer(average, "municity").get("012345000")?.display_value, 17.5);
  const max = {
    ...response,
    dataset: {
      ...response.dataset,
      layer_config: { ...response.dataset.layer_config, aggregate_function: "max" as const },
    },
  };
  assert.equal(buildDatasetLayer(max, "municity").get("012345000")?.display_value, 20);
});

test("area details aggregate only the latest filtered rows and their category breakdowns", () => {
  const points = [
    {
      psgc_code: "012345001",
      count: 2,
      display_value: 2,
      tooltip: { Total: 2, Sector: { Youth: 2 } },
    },
    {
      psgc_code: "012345002",
      count: 3,
      display_value: 3,
      tooltip: { Total: 3, Sector: { Youth: 1, Education: 2 } },
    },
    { psgc_code: "022345001", count: 99, display_value: 99, tooltip: { Total: 99 } },
  ];
  assert.deepEqual(summarizeDatasetArea(points, "01"), {
    count: 5,
    tooltip: { Sector: { Youth: 3, Education: 2 } },
  });
  assert.deepEqual(summarizeDatasetArea(points.slice(0, 1), "01"), {
    count: 2,
    tooltip: { Sector: { Youth: 2 } },
  });
});
