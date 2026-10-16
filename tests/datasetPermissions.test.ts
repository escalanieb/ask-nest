import assert from "node:assert/strict";
import test from "node:test";
import { canManageDatasets } from "../src/lib/datasetPermissions.ts";

test("dataset management needs an allowed role and enabled team feature", () => {
  for (const role of ["admin", "data_manager"]) {
    assert.equal(canManageDatasets({ role, capabilities: ["datasets.use"] }), true);
    assert.equal(canManageDatasets({ role, capabilities: [] }), false);
    assert.equal(canManageDatasets({ role }), false);
  }
  for (const role of ["viewer", "owner", "", "DATA_MANAGER"]) {
    assert.equal(canManageDatasets({ role, capabilities: ["datasets.use"] }), false);
  }
  assert.equal(canManageDatasets(null), false);
  assert.equal(canManageDatasets(undefined), false);
});
