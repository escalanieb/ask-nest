import { test } from "node:test";
import assert from "node:assert/strict";
import { permittedMapSource } from "../src/lib/mapSource.ts";
test("TIPAS remains unavailable after revocation and on teams with only imported data", () => {
  assert.equal(permittedMapSource("tipas", ["datasets.use"]), "imported");
  assert.equal(permittedMapSource("tipas", []), "none");
  assert.equal(permittedMapSource("imported", ["tipas.use"]), "tipas");
});
test("authorized source switches retain their explicit choice", () => {
  const caps = ["datasets.use", "tipas.use"];
  assert.equal(permittedMapSource("tipas", caps), "tipas");
  assert.equal(permittedMapSource("imported", caps), "imported");
});
