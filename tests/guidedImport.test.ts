import assert from "node:assert/strict";
import test from "node:test";
import { configurationForFile, essentialProblem, importError } from "../src/lib/guidedImport.ts";
import type { Dataset } from "../src/services/api/datasetApi.ts";

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

test("guided imports into a Political type match its existing fields without requiring an ID", () => {
  const target = {
    political_entry: true,
    name: "Campaign Volunteers",
    data_type: "Campaign Volunteers",
    entity_type: "location",
    psgc_level: "barangay",
    match_key_fields: [],
    allow_duplicates: true,
    field_definitions: [{ key: "full_name", label: "Full Name", type: "text", required: true }],
    layer_config: {
      aggregate_function: "count",
      color_field: "",
      tooltip_fields: [],
      show_on_map: false,
    },
  } as Dataset;
  const config = configurationForFile(inspection, "volunteers.xlsx", target);
  assert.equal(config.columns[0].role, "ignore");
  assert.equal(config.columns[1].key, "full_name");
  assert.equal(config.columns[1].required, true);
  assert.equal(essentialProblem(config, true), "");
  assert.match(essentialProblem(config), /record identifier/);
});

test("guided imports ignore the generated number in a workspace CSV and retain a similarly named custom field", () => {
  const target = {
    political_entry: true,
    name: "Practice sites",
    psgc_level: "barangay",
    match_key_fields: [],
    allow_duplicates: true,
    field_definitions: [{ key: "record_number", label: "Record number", type: "text" }],
    layer_config: { filter_fields: [], tooltip_fields: [] },
  } as unknown as Dataset;
  for (const generatedHeading of ["Record number", "Record number (ask-nest 2)"]) {
    const exported = {
      ...inspection,
      columns: [
        generatedHeading,
        "psgc_code",
        "record_number",
        "location_status",
        "location_source",
        "location_reason",
      ].map((source) => ({ ...inspection.columns[0], source })),
    };
    const config = configurationForFile(exported, "sites.csv", target);
    assert.equal(config.columns[0].role, "ignore");
    assert.equal(config.columns[2].role, "field");
    assert.equal(config.columns[2].key, "record_number");
    assert.equal(essentialProblem(config, true), "");
  }
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
