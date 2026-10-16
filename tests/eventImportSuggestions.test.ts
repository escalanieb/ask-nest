import assert from "node:assert/strict";
import test from "node:test";
import {
  suggestedColumns,
  singleEventValue,
  eventColumnProblem,
} from "../src/lib/eventImportSuggestions.ts";

const inspection = {
  sheet: "Participants",
  sheets: ["Participants"],
  header_row: 1,
  row_count: 50,
  columns: [
    {
      source: "Activity Reference",
      samples: ["TEST-NCR-SKILLS-20261017"],
      values: ["TEST-NCR-SKILLS-20261017"],
      has_more: false,
    },
    ...[
      "Registration Number",
      "Participant Display Name",
      "Home Location Code",
      "Program Track",
      "Years Old",
      "Program-Track",
      "PSGC Code",
    ].map((source) => ({ source, samples: ["Example"], values: ["Example"], has_more: false })),
  ],
};

test("workbook headers receive visible suggestions with unique safe internal keys", () => {
  const columns = suggestedColumns(inspection);
  assert.equal(columns[0].role, "event_id");
  assert.equal(columns[1].role, "participant_id");
  assert.equal(columns[2].role, "attendee_name");
  assert.equal(columns[3].role, "residence");
  assert.equal(columns[4].role, "field");
  assert.equal(columns[4].filter_mode, "category");
  assert.equal(columns.filter((c) => c.role === "residence").length, 1);
  assert.equal(new Set(columns.map((c) => c.key)).size, columns.length);
  assert.ok(columns.every((c) => /^[a-z][a-z0-9_]{0,63}$/.test(c.key)));
  assert.equal(singleEventValue(inspection, columns, "event_id"), "TEST-NCR-SKILLS-20261017");
  assert.equal(
    eventColumnProblem(inspection, columns, { id: "TEST-NCR-SKILLS-20261017", name: "Workshop" }),
    "",
  );
  assert.match(
    eventColumnProblem(inspection, columns, { id: "wrong-event", name: "Workshop" }),
    /Activity Reference/,
  );
});

test("saved mappings remain authoritative and mixed event columns cannot supply one ID", () => {
  const columns = suggestedColumns(inspection);
  columns[4] = { ...columns[4], role: "ignore", key: "custom_key" };
  assert.deepEqual(suggestedColumns(inspection, columns), columns);
  const mixed = {
    ...inspection,
    columns: inspection.columns.map((c, i) =>
      i === 0 ? { ...c, values: ["event-a", "event-b"] } : c,
    ),
  };
  assert.equal(singleEventValue(mixed, columns, "event_id"), undefined);
  assert.match(
    eventColumnProblem(mixed, columns, { id: "event-a", name: "Workshop" }),
    /must contain only/,
  );
});
