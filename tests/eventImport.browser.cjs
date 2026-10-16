const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.TEST_APP_URL || "http://127.0.0.1:4173";
const meta = {
  id: "event-a",
  name: "Synthetic consultation",
  date: "2026-10-16",
  organizer: "Test office",
  category: "Consultation",
  status: "completed",
  venue: "Synthetic venue",
  latitude: 14,
  longitude: 121,
};
const dataset = {
  id: 1,
  name: meta.name,
  event_key: "event-a",
  event_metadata: meta,
  psgc_level: "barangay",
  entity_type: "person",
  is_active: true,
  match_key_fields: ["reference"],
  field_definitions: [
    { key: "reference", label: "Reference", type: "text", required: true },
    { key: "sector", label: "Sector", type: "text" },
  ],
  layer_config: {
    aggregate_function: "count",
    tooltip_fields: [],
    filter_definitions: [{ key: "sector", label: "Sector", type: "category" }],
  },
};
const preview = {
  batch_id: 10,
  stats: { new: 1, updates: 0, conflicts: 0, rejected: 0, skipped: 0 },
  pending_conflicts: 0,
  preview: {
    new: [{ reference: "001", psgc_code: "012345001", sector: "Youth" }],
    updates: [],
    conflicts: [],
    rejected: [],
  },
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const profile of [
      "communications",
      "legislative",
      "political",
      "legislative-manager",
      "political-manager",
      "communications-viewer",
    ]) {
      const team = profile.replace(/-(viewer|manager)$/, "");
      const role = profile.endsWith("-viewer")
        ? "viewer"
        : profile.endsWith("-manager")
          ? "data_manager"
          : "admin";
      const context = await browser.newContext({
        viewport: { width: team === "legislative" ? 1024 : 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      const user = {
        id: 1,
        name: "Synthetic User",
        email: "synthetic@example.invalid",
        role,
        team: { id: 1, slug: team, name: team, accent_color: "#7c3aed" },
        capabilities: [
          "datasets.use",
          "analytics.use",
          "rss.use",
          ...(team === "communications" ? ["tipas.use"] : []),
        ],
      };
      await context.addInitScript(
        (user) =>
          localStorage.setItem(
            "commsdash-auth",
            JSON.stringify({ state: { token: "synthetic-local-test", user }, version: 0 }),
          ),
        user,
      );
      let omitMappedRows = false;
      let datasetDeleted = false;
      const calls = [];
      const errors = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/api/")) {
          calls.push(url.pathname + url.search);
          let value = [];
          if (url.pathname === "/api/auth/me") value = user;
          else if (url.pathname === "/api/datasets") value = datasetDeleted ? [] : [dataset];
          else if (url.pathname === "/api/datasets/1/permanent") {
            assert.equal(role, "data_manager");
            assert.equal(route.request().method(), "DELETE");
            assert.equal(route.request().postDataJSON().confirmation, dataset.name);
            datasetDeleted = true;
            value = {
              message: "Dataset, records and imports permanently deleted.",
              file_cleanup_pending: false,
            };
          } else if (/^\/api\/datasets\/[12]$/.test(url.pathname)) value = dataset;
          else if (url.pathname.endsWith("/batches")) value = { data: [] };
          else if (url.pathname.endsWith("/filter-options"))
            value = {
              data: [
                {
                  key: "sector",
                  label: "Sector",
                  type: "category",
                  values: ["Youth", "Education"],
                  has_missing: false,
                },
              ],
            };
          else if (url.pathname.endsWith("/layer"))
            value = {
              dataset,
              layer_data: omitMappedRows
                ? []
                : [{ psgc_code: "012345001", count: 1, display_value: 1, tooltip: { Total: 1 } }],
              summary: {
                total: 1,
                unfiltered_total: 2,
                mapped: omitMappedRows ? 0 : 1,
                unmapped: omitMappedRows ? 1 : 0,
                areas: 1,
                unique_participants: 1,
              },
            };
          else if (url.pathname.endsWith("/records"))
            value = {
              data: [
                {
                  id: 1,
                  status: "active",
                  data: { reference: "001", sector: "Youth" },
                  psgc_code: "012345001",
                },
              ],
              total: 1,
            };
          else if (url.pathname === "/api/datasets/1/records/1")
            value = {
              record: {
                id: 1,
                status: "active",
                data: { reference: "001", sector: "Youth" },
                psgc_code: "012345001",
              },
              history: [],
            };
          else if (url.pathname.endsWith("/inspect"))
            value = {
              sheets: ["Worksheet"],
              sheet: "Worksheet",
              header_row: 1,
              row_count: 1,
              columns: [
                { source: "Reference", samples: ["001"], values: ["001"] },
                { source: "Residence", samples: ["012345001"], values: ["012345001"] },
                { source: "Sector", samples: ["Youth"], values: ["Youth"] },
                { source: "Event Code", samples: ["MOCK-NEW-EVENT"], values: ["MOCK-NEW-EVENT"] },
              ],
            };
          else if (url.pathname === "/api/datasets/import/events") {
            const body = route.request().postDataJSON();
            assert.equal(body.metadata.id, "MOCK-NEW-EVENT");
            assert.equal(body.columns.find((c) => c.source === "Sector").filter_mode, "category");
            value = { ...dataset, id: 2 };
          } else if (url.pathname.endsWith("/upload")) value = preview;
          else if (url.pathname === "/api/batches/10/commit")
            value = { message: "Import committed" };
          else if (url.pathname === "/api/tipas/events")
            value = [
              {
                id: 7,
                name: "Synthetic TIPAS event",
                registered_count: 2,
                checked_in_count: 1,
                psgc_code: "012345000",
                location: "Synthetic city",
                start_time: "2026-10-16",
              },
            ];
          else if (url.pathname.includes("distribution"))
            value = [{ psgc_code: "012345001", count: 2 }];
          else if (url.pathname.includes("attendees")) value = { data: [], total: 0 };
          else if (url.pathname === "/api/analytics/datasets")
            value = { datasets: [{ ...dataset, record_count: 1 }], total_records: 1 };
          return route.fulfill({ json: value });
        }
        if (url.hostname === "127.0.0.1") return route.continue();
        if (url.hostname === "raw.githubusercontent.com")
          return route.fulfill({
            json: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {
                    ADM1_PCODE: "PH010000000",
                    ADM1_EN: "Synthetic region",
                    ADM2_PCODE: "PH012300000",
                    ADM3_PCODE: "PH012345000",
                  },
                  geometry: {
                    type: "Polygon",
                    coordinates: [
                      [
                        [120, 13],
                        [122, 13],
                        [122, 15],
                        [120, 15],
                        [120, 13],
                      ],
                    ],
                  },
                },
              ],
            },
          });
        return route.abort();
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.stack));
      await page.clock.install();
      await page.goto(base + "/");
      await page.getByText("Imported data", { exact: true }).first().waitFor();
      if (role === "viewer") {
        assert.equal(
          await page.getByRole("link", { name: "Import dataset", exact: false }).count(),
          0,
        );
        await page.getByRole("button", { name: "Panels and sources", exact: true }).click();
        await page.getByRole("button", { name: "RSS sources", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: /Add Feed/ }).count(), 0);
        console.log("communications viewer: import and feed-management actions hidden");
        await page.goto(base + "/datasets/1/records");
        await page.getByText("001", { exact: true }).first().waitFor();
        await page.getByRole("row").filter({ hasText: "001" }).click();
        await page.getByText("Record #1", { exact: true }).waitFor();
        assert.equal(await page.getByRole("link", { name: "Upload", exact: true }).count(), 0);
        assert.equal(await page.getByRole("button", { name: "Edit", exact: true }).count(), 0);
        assert.equal(
          await page.getByRole("button", { name: "Deactivate", exact: true }).count(),
          0,
        );
        await page.goto(base + "/datasets/import");
        await page.waitForURL(base + "/");
        assert.deepEqual(errors, []);
        await context.close();
        continue;
      }
      if (role === "data_manager") {
        await page.getByRole("button", { name: "Panels and sources", exact: true }).click();
        await page.getByRole("button", { name: "RSS sources", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: /Add Feed/ }).count(), 0);
      }
      const appearance = page.getByRole("button", { name: "Appearance", exact: true });
      await appearance.focus();
      await page.keyboard.press("Enter");
      assert.equal(await appearance.getAttribute("aria-expanded"), "true");
      await page.keyboard.press("Enter");
      assert.equal(await appearance.getAttribute("aria-expanded"), "false");
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      );
      await page.getByRole("button", { name: meta.name }).click();
      await page.locator(".leaflet-overlay-pane path.leaflet-interactive").first().waitFor();
      assert.ok((await page.getByRole("link", { name: "Datasets", exact: true }).count()) > 0);
      await appearance.click();
      await page.getByRole("button", { name: "Count Labels", exact: true }).click();
      await page.locator(".dataset-count-badge").first().waitFor();
      const badgeStyle = await page
        .locator(".dataset-count-badge")
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            background: style.backgroundColor,
            shadow: style.boxShadow,
            radius: style.borderRadius,
          };
        });
      assert.equal(badgeStyle.background, "rgb(255, 255, 255)");
      assert.notEqual(badgeStyle.shadow, "none");
      assert.equal(badgeStyle.radius, "8px");
      assert.equal(await page.locator(".dataset-count-icon img").count(), 0);
      await page.screenshot({
        path: require("node:path").join(
          process.env.TEMP,
          "ask-nest-" + profile + "-count-badge.png",
        ),
        fullPage: true,
      });
      await appearance.click();
      await page.getByLabel("Filter by Sector", { exact: true }).click();
      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes("/layer?") && response.url().includes("Youth"),
        ),
        page.getByLabel("Youth", { exact: true }).check(),
      ]);
      if (team === "communications") {
        await page.getByRole("button", { name: "TIPAS", exact: true }).first().click();
        await page.getByRole("combobox", { name: /^Show/ }).selectOption("both");
        await page.getByText("TIPAS attendee residence distribution", { exact: true }).waitFor();
        assert.equal(await page.getByText("1 filtered / 2 imported", { exact: false }).count(), 0);
        await page.getByText("All TIPAS events", { exact: true }).waitFor();
        await Promise.all([
          page.waitForResponse((response) => response.url().includes("/tipas/events/7/attendees")),
          page.getByRole("combobox", { name: /^Event/ }).selectOption("7"),
        ]);
        await page.getByRole("button", { name: "Imported data", exact: true }).click();
        await page.getByText("1 filtered / 2 imported", { exact: false }).waitFor();
        assert.equal(await page.getByLabel("Youth", { exact: true }).isChecked(), true);
      } else {
        assert.equal(await page.getByRole("button", { name: "TIPAS", exact: true }).count(), 0);
        assert.equal(
          calls.some((path) => path.startsWith("/api/tipas")),
          false,
        );
      }
      assert.ok(
        (await page.locator(".leaflet-overlay-pane path.leaflet-interactive").count()) >= 2,
        "Polygon and event venue both render",
      );
      // Reproduce records that exist but have no map-ready location rows.
      omitMappedRows = true;
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/layer?") &&
            new URL(response.url()).searchParams.get("psgc_prefix") === "01",
        ),
        page
          .locator(".leaflet-overlay-pane path.leaflet-interactive")
          .first()
          .dispatchEvent("click", { clientX: 200, clientY: 150 }),
      ]);
      const total = page.getByText("Total Records", { exact: true }).locator("..");
      await total.getByText("1", { exact: true }).waitFor();
      const recordsLink = page.getByRole("link", { name: "View all records" });
      const target = new URL(await recordsLink.getAttribute("href"), base);
      assert.equal(target.searchParams.get("psgc_prefix"), "01");
      assert.deepEqual(JSON.parse(target.searchParams.get("filters")), {
        sector: { values: ["Youth"] },
      });
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/records?") && response.url().includes("per_page=25"),
        ),
        recordsLink.click(),
      ]);
      assert.ok(
        calls.some(
          (path) =>
            path.includes("/records?") &&
            new URL(path, base).searchParams.get("psgc_prefix") === "01",
        ),
      );
      // A reload retains the exact area and dataset filters from the map link.
      await page.reload();
      await page.getByText("001", { exact: true }).first().waitFor();
      assert.equal(await page.getByRole("link", { name: "Upload", exact: true }).count(), 1);
      await page.getByRole("row").filter({ hasText: "001" }).click();
      await page.getByText("Record #1", { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Edit", exact: true }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Deactivate", exact: true }).count(), 1);
      const matchingRequests = calls.filter(
        (path) =>
          path.includes("/records?") && new URL(path, base).searchParams.get("per_page") === "25",
      );
      assert.ok(matchingRequests.length >= 2);
      for (const path of matchingRequests) {
        const params = new URL(path, base).searchParams;
        assert.equal(params.get("psgc_prefix"), "01");
        assert.equal(params.get("status"), "active");
        assert.deepEqual(JSON.parse(params.get("filters")), { sector: { values: ["Youth"] } });
      }
      await page.goto(base + "/");
      omitMappedRows = false;
      await page.getByRole("button", { name: meta.name }).waitFor();
      await page.screenshot({
        path: require("node:path").join(process.env.TEMP, "ask-nest-" + team + "-sidebar.png"),
        fullPage: true,
      });
      await page.getByRole("link", { name: "Import dataset", exact: false }).first().click();
      await page
        .getByLabel("Event name", { exact: true })
        .waitFor({ timeout: 5000 })
        .catch(async (error) => {
          console.log(page.url(), errors, await page.locator("body").innerText());
          throw error;
        });
      await page.getByLabel("Event name", { exact: true }).fill("New consultation");
      await page.getByLabel("Event date").fill("2026-10-16");
      await page.getByLabel("Event venue", { exact: true }).fill("Test venue");
      await page.locator("input[type=file]").setInputFiles({
        name: "synthetic.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "Reference,Residence,Sector,Event Code\n001,012345001,Youth,MOCK-NEW-EVENT",
        ),
      });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      assert.equal(
        await page.getByLabel("Use Reference for", { exact: true }).inputValue(),
        "participant_id",
      );
      assert.equal(
        await page.getByLabel("Use Residence for", { exact: true }).inputValue(),
        "residence",
      );
      assert.equal(
        await page.getByLabel("Use Event Code for", { exact: true }).inputValue(),
        "event_id",
      );
      await page.getByLabel("Dropdown filter for Sector", { exact: true }).check();
      assert.equal(await page.getByLabel("Key for Sector", { exact: true }).isVisible(), false);
      await page.screenshot({
        path: require("node:path").join(
          process.env.TEMP,
          "ask-nest-" + profile + "-simple-import.png",
        ),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByLabel("I reviewed all non-empty sheets", { exact: false }).check();
      await page.getByLabel("Every attendee in this workbook", { exact: false }).check();
      await page.getByRole("button", { name: "Save event & preview import" }).click();
      await page.getByRole("button", { name: "Commit", exact: false }).waitFor();
      await page.screenshot({
        path: require("node:path").join(process.env.TEMP, "ask-nest-" + team + "-preview.png"),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Commit", exact: true }).click();
      await page.getByText("Import committed.", { exact: false }).waitFor();
      await Promise.all([
        page.waitForResponse((response) => response.url().includes("/datasets/2/layer")),
        page.getByRole("button", { name: "View on map" }).click(),
      ]);
      if (team === "communications") {
        await page.getByRole("button", { name: "TIPAS", exact: true }).first().click();
        user.capabilities = user.capabilities.filter((capability) => capability !== "tipas.use");
        await page.clock.fastForward(61_000);
        await page
          .getByRole("button", { name: "TIPAS", exact: true })
          .first()
          .waitFor({ state: "hidden" });
        assert.equal(
          await page.getByText("TIPAS attendee residence distribution", { exact: true }).count(),
          0,
        );
      }
      if (role === "data_manager") {
        await page.goto(base + "/datasets");
        await page.getByRole("button", { name: "Delete permanently", exact: true }).first().click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        assert.equal(
          await dialog
            .getByRole("button", { name: "Delete permanently", exact: true })
            .isDisabled(),
          true,
        );
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        assert.equal(datasetDeleted, false);
        await page.getByRole("button", { name: "Delete permanently", exact: true }).first().click();
        await dialog.getByLabel("Dataset name confirmation").fill("wrong name");
        assert.equal(
          await dialog
            .getByRole("button", { name: "Delete permanently", exact: true })
            .isDisabled(),
          true,
        );
        await dialog.getByLabel("Dataset name confirmation").fill(dataset.name);
        await page.screenshot({
          path: require("node:path").join(
            process.env.TEMP,
            "ask-nest-" + profile + "-delete-confirm.png",
          ),
          fullPage: true,
        });
        await dialog.getByRole("button", { name: "Delete permanently", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });
        await page
          .getByText("Dataset, records and imports permanently deleted.", { exact: true })
          .waitFor();
        assert.equal(datasetDeleted, true);
        await page.goto(base + "/");
        await page.getByRole("link", { name: "Import dataset", exact: false }).first().waitFor();
        user.role = "viewer";
        await page.clock.fastForward(61_000);
        await page
          .getByRole("link", { name: "Import dataset", exact: false })
          .first()
          .waitFor({ state: "hidden" });
        await page.goto(base + "/datasets/import");
        await page.waitForURL(base + "/");
      }
      assert.deepEqual(errors, []);
      console.log(
        profile + ": source gating, filters, guided preview, commit and map handoff passed",
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
