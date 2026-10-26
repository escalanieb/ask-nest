import assert from "node:assert/strict";
import test from "node:test";
import { configurationForFile, essentialProblem, importError } from "../src/lib/guidedImport.ts";

const inspection = {
  sheet: "Attendees",
  sheets: ["Attendees"],
  header_row: 2,
  row_count: 2,
  columns: ["ID", "Full Name", "Residence"].map((source) => ({
    source,
    samples: ["Example"],
    values: ["Example"],
    has_more: false,
  })),
};

test("file-first configuration suggests ID without inventing person identity or date", () => {
  const config = configurationForFile(inspection, "outreach-attendees.xlsx");
  assert.equal(config.metadata.name, "outreach attendees");
  assert.equal(config.metadata.date, "");
  assert.equal(config.columns[0].role, "participant_id");
  assert.equal(config.columns[0].type, "text");
  assert.equal(config.header_row, 2);
  assert.equal(config.location_source.single, "Residence");
  assert.equal(essentialProblem(config), "");
  assert.match(
    essentialProblem({
      ...config,
      columns: config.columns.map((c) => ({ ...c, role: "field" as const })),
    }),
    /participant ID/,
  );
});

test("saved compatible mappings and event metadata survive reselection", () => {
  const previous = configurationForFile(inspection, "original.xlsx");
  previous.metadata.name = "Reviewed event";
  previous.columns[1].filter = true;
  const resumed = configurationForFile(inspection, "same-name.xlsx", undefined, previous);
  assert.equal(resumed.metadata.id, previous.metadata.id);
  assert.equal(resumed.metadata.name, "Reviewed event");
  assert.equal(resumed.columns[1].filter, true);
});

test("import errors use actionable server validation and expiry explanations", () => {
  assert.equal(
    importError(new Error('API error 422: {"errors":{"columns":["Choose an ID"]}}')),
    "Choose an ID",
  );
  assert.match(importError(new Error("API error 410: {}")), /expired/);
  assert.equal(
    importError(new Error("API error 500: <html>Oops</html>")),
    "The server could not complete this step. Please retry.",
  );
});
