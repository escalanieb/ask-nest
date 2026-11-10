import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultDatasetFor,
  optionForDataset,
  optionLabel,
  selectionIsStale,
} from "../src/lib/politicalExplore.ts";
import { geographicPrefix } from "../src/lib/geographicPrefix.ts";
import { usesPoliticalExplorer } from "../src/lib/teamAccess.ts";
import { barangayCode } from "../src/lib/barangayCode.ts";
import { areaChip, noShapeNote, summarySentence } from "../src/lib/exploreSummary.ts";
import { barangayCoverage } from "../src/lib/datasetLayer.ts";

const options = [
  {
    key: "sk chairpersons",
    label: "SK Chairpersons",
    record_count: 17,
    datasets: [{ id: 4, name: "SK list", record_count: 17, psgc_level: "barangay" as const }],
  },
  {
    key: "vloggers",
    label: "Vloggers",
    record_count: 1242,
    datasets: [
      { id: 1, name: "Batch A", psgc_level: "city" as const, record_count: 200 },
      { id: 2, name: "Batch B", psgc_level: "city" as const, record_count: 1042 },
    ],
  },
];

test("only the Political team with dataset access gets the political explorer", () => {
  const caps = ["datasets.use"];
  assert.equal(usesPoliticalExplorer({ team: { slug: "political" }, capabilities: caps }), true);
  assert.equal(usesPoliticalExplorer({ team: { slug: "political" }, capabilities: [] }), false);
  assert.equal(
    usesPoliticalExplorer({ team: { slug: "communications" }, capabilities: caps }),
    false,
  );
  assert.equal(usesPoliticalExplorer({ capabilities: caps }), false);
  assert.equal(usesPoliticalExplorer(null), false);
});

test("labels show the data type with its count", () => {
  assert.equal(optionLabel(options[0]), "SK Chairpersons (17)");
  assert.match(optionLabel(options[1]), /^Vloggers \(1,?242\)$/);
});

test("a data type with several lists defaults to the largest one", () => {
  assert.equal(defaultDatasetFor(options[1]), 2);
  assert.equal(defaultDatasetFor(options[0]), 4);
});

test("a selection is stale once the area no longer has that data", () => {
  assert.equal(optionForDataset(options, 2)?.label, "Vloggers");
  assert.equal(selectionIsStale(options, 2), false);
  assert.equal(selectionIsStale(options, 99), true);
  assert.equal(selectionIsStale(options, null), false);
  assert.equal(selectionIsStale([], 2), true);
});

test("barangay selection narrows the prefix to that barangay", () => {
  const base = { activeRegion: "130000000", activeProvince: null, activeCityMuni: "137404000" };
  assert.equal(geographicPrefix(base), "137404");
  assert.equal(geographicPrefix({ ...base, activeBarangay: "137404001" }), "137404001");
  assert.equal(geographicPrefix({ ...base, activeBarangay: null }), "137404");
});

test("political summary names the data type and deepest area", () => {
  const area = [
    { level: "region" as const, code: "130000000", name: "NCR" },
    { level: "barangay" as const, code: "137404001", name: "Barangay 1" },
  ];
  assert.equal(areaChip(area)?.label, "NCR, Barangay 1");
  assert.equal(
    summarySentence({
      datasetName: "SK list",
      total: 17,
      area: area.slice(0, 1),
      chipCount: 1,
      dataTypeLabel: "SK Chairpersons",
    }),
    "Showing 17 SK Chairpersons in NCR.",
  );
  assert.equal(
    summarySentence({
      datasetName: "SK list",
      total: null,
      area: [],
      chipCount: 0,
      dataTypeLabel: "SK Chairpersons",
    }),
    "Showing SK Chairpersons across the Philippines.",
  );
});

test("a barangay shape's code matches the dropdown code (nine digits, no PH prefix)", () => {
  assert.equal(barangayCode({ properties: { ADM4_PCODE: "PH137404001" } }), "137404001");
  assert.equal(barangayCode({ properties: {} }), "");
  assert.equal(barangayCode({ properties: null }), "");
});

test("barangay records without a shape are counted, never dropped or guessed", () => {
  const shapes = new Set(["137404001", "137404002"]);
  const points = [
    { psgc_code: "137404001", count: 3 },
    { psgc_code: "137404002", count: 2 },
    { psgc_code: "137404099", count: 4 }, // no shape for this barangay
    { psgc_code: "137404000", count: 9 }, // city-level record: not a barangay record
  ];
  assert.deepEqual(barangayCoverage(points, shapes), { withShape: 5, withoutShape: 4 });
  // A city whose source has no shapes at all: every barangay record is "no shape".
  assert.deepEqual(barangayCoverage(points, new Set()), { withShape: 0, withoutShape: 9 });
  assert.equal(noShapeNote(0), "");
  assert.equal(noShapeNote(null), "");
  assert.equal(noShapeNote(1), "1 record has no barangay shape on the map.");
  assert.equal(noShapeNote(12), "12 records have no barangay shape on the map.");
});
