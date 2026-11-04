import test from "node:test";
import assert from "node:assert/strict";
import {
  areaChip,
  filterChips,
  splitQuickFilters,
  summarySentence,
  withoutFilter,
} from "../src/lib/exploreSummary.ts";

const defs = [
  { key: "status", label: "Status" },
  { key: "age", label: "Age" },
];

test("filter chips use plain labels and skip empty filters", () => {
  const chips = filterChips(
    {
      status: { values: ["Checked in", "Registered", "Walk-in"] },
      age: { min: 18, max: "" },
      empty: { values: [] },
      __location_status: { values: ["unknown"] },
    },
    defs,
  );
  assert.deepEqual(
    chips.map((c) => c.label),
    ["Status: Checked in, Registered +1 more", "Age: from 18", "People with no known location"],
  );
});

test("blank option and search appear on the chip", () => {
  const [chip] = filterChips({ status: { values: ["A"], missing: true, search: " x " } }, defs);
  assert.equal(chip.label, 'Status: A, (blank), contains "x"');
});

test("removing one filter keeps the others", () => {
  assert.deepEqual(withoutFilter({ a: { values: ["1"] }, b: { values: ["2"] } }, "a"), {
    b: { values: ["2"] },
  });
});

test("area chip lists the whole path", () => {
  assert.equal(areaChip([]), null);
  assert.equal(
    areaChip([
      { level: "region", code: "070000000", name: "Region VII" },
      { level: "province", code: "072200000", name: "Cebu" },
    ])?.label,
    "Region VII, Cebu",
  );
});

test("sentence names dataset, total and deepest area", () => {
  const area = [{ level: "region" as const, code: "07", name: "Region VII" }];
  assert.equal(
    summarySentence({ datasetName: "Youth Summit", total: 1240, area, chipCount: 1 }),
    'Showing 1,240 records of "Youth Summit" in Region VII.',
  );
  assert.equal(
    summarySentence({ datasetName: "Youth Summit", total: 1, area: [], chipCount: 1 }),
    'Showing 1 record of "Youth Summit" across the Philippines, narrowed by your filters.',
  );
  assert.equal(
    summarySentence({ datasetName: null, total: null, area: [], chipCount: 0 }),
    "Pick an event or list to begin.",
  );
});

test("quick filters are the first three", () => {
  const { quick, more } = splitQuickFilters([1, 2, 3, 4, 5]);
  assert.deepEqual(quick, [1, 2, 3]);
  assert.deepEqual(more, [4, 5]);
  assert.deepEqual(splitQuickFilters([1]).more, []);
});
