const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const base = process.env.TEST_APP_URL || "http://127.0.0.1:4173";
const sample = {
  name: "synthetic-attendees.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    "Reference,Residence,Sector\n001,Synthetic A,Youth\n002,Unknown place,Education\n,Synthetic A,Invalid",
  ),
};
const inspection = {
  sheets: ["Attendees"],
  sheet: "Attendees",
  header_row: 1,
  row_count: 3,
  columns: [
    { source: "Reference", samples: ["001", "002"], values: ["001", "002", ""], has_more: false },
    {
      source: "Residence",
      samples: ["Synthetic A", "Unknown place"],
      values: ["Synthetic A", "Unknown place"],
      has_more: false,
    },
    {
      source: "Sector",
      samples: ["Youth", "Education"],
      values: ["Youth", "Education", "Invalid"],
      has_more: false,
    },
  ],
};

async function installImportMocks(context) {
  const sessions = new Map();
  const fileInspection = structuredClone(inspection);
  let commits = 0;
  let loseResponse = false;
  const rows = [
    {
      row: 2,
      data: { reference: "001", sector: "Youth", psgc_code: "012345001" },
      category: "new",
      errors: [],
    },
    {
      row: 3,
      data: { reference: "002", sector: "Education", psgc_code: null },
      category: "new",
      errors: [],
    },
    {
      row: 4,
      data: { reference: null, sector: "Invalid", psgc_code: "012345001" },
      category: "rejected",
      errors: ["Missing participant identifier"],
    },
  ];
  const stats = { new: 2, updates: 0, skipped: 0, conflicts: 0, rejected: 1, unknown: 1 };
  await context.route("**/api/datasets/import/sessions**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[4],
      action = parts[5];
    if (!id && method === "GET")
      return route.fulfill({
        json: [...sessions.values()].filter(
          (s) => s.state !== "committed" && s.state !== "discarded",
        ),
      });
    if (!id && method === "POST") {
      const body = request.postDataJSON();
      const session = {
        id: `00000000-0000-4000-8000-${String(sessions.size + 1).padStart(12, "0")}`,
        dataset_id: body.dataset_id ?? null,
        state: "draft",
        revision: 1,
        configuration: null,
        original_filename: null,
        expires_at: "2026-11-02T12:00:00Z",
        updated_at: "2026-10-26T12:00:00Z",
        result: null,
      };
      sessions.set(session.id, session);
      return route.fulfill({ status: 201, json: session });
    }
    let session = sessions.get(id);
    if (!session) return route.fulfill({ status: 404, json: { message: "No such draft" } });
    const change = (patch) => {
      session = { ...session, revision: session.revision + 1, ...patch };
      sessions.set(id, session);
    };
    const review = () => {
      const category = url.searchParams.get("category");
      const filtered = category ? rows.filter((r) => r.category === category) : rows;
      return {
        session,
        stats,
        rows: filtered,
        pending_conflicts: rows.filter((r) => r.resolution === "pending").length,
        total: filtered.length,
        page: 1,
        last_page: 1,
      };
    };
    if (!action && method === "GET") return route.fulfill({ json: session });
    if (action === "resume") {
      change({});
      return route.fulfill({ json: session });
    }
    if (!action && method === "PUT") {
      const body = request.postDataJSON();
      assert.equal(body.revision, session.revision);
      change({
        configuration: body.configuration,
        dataset_id: body.dataset_id ?? null,
        state: "draft",
      });
      return route.fulfill({ json: session });
    }
    if (!action && method === "DELETE") {
      change({ state: "discarded" });
      return route.fulfill({ json: { message: "Discarded" } });
    }
    if (action === "inspect") {
      change({ original_filename: sample.name, state: "draft" });
      return route.fulfill({ json: { session, inspection: fileInspection } });
    }
    if (action === "locations")
      return route.fulfill({
        json: {
          data: [
            {
              key: "known",
              raw: { single: "Synthetic A" },
              count: 2,
              code: "012345001",
              status: "verified",
              candidates: [{ code: "012345001", name: "Synthetic A" }],
            },
            {
              key: "unknown",
              raw: { single: "Unknown place" },
              count: 1,
              code: null,
              status: "unmatched",
              candidates: [],
            },
          ],
          total: 2,
          page: 1,
          last_page: 1,
          unresolved: 1,
          unknown_rows: 1,
        },
      });
    if (action === "prepare") {
      change({ state: "reviewing" });
      return route.fulfill({ json: review() });
    }
    if (action === "review") return route.fulfill({ json: review() });
    if (action === "conflicts") {
      const body = request.postDataJSON();
      rows.find((r) => r.row === body.row).resolution = body.resolution;
      change({});
      return route.fulfill({ json: review() });
    }
    if (action === "errors")
      return route.fulfill({
        contentType: "text/csv",
        body: "worksheet_row,reason\n4,Missing participant identifier\n",
        headers: { "Content-Disposition": 'attachment; filename="import-errors.csv"' },
      });
    if (action === "commit") {
      assert.equal(request.postDataJSON().acknowledge_exclusions, true);
      commits++;
      const result = {
        dataset_id: 2,
        batch_id: 10,
        new: 2,
        updates: 0,
        skipped: 0,
        rejected: 1,
        unknown: 1,
      };
      change({ state: "committed", result });
      if (loseResponse) {
        loseResponse = false;
        return route.abort("failed");
      }
      return route.fulfill({ json: result });
    }
    return route.fulfill({ status: 500, json: { message: `Unmocked ${method} ${url.pathname}` } });
  });
  return {
    sessions,
    inspection: fileInspection,
    commits: () => commits,
    rows,
    stats,
    loseNextCommitResponse: () => {
      loseResponse = true;
    },
  };
}

async function continueStep(page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function exerciseGuidedImport(
  page,
  { general = false, refresh = false, screenshot = "" } = {},
) {
  await page.getByRole("heading", { name: "Choose file", exact: true }).waitFor();
  await page.getByLabel("Choose spreadsheet").setInputFiles(sample);
  await page.getByText("3 data rows", { exact: true }).waitFor();
  if (refresh) {
    await page.reload();
    await page.getByRole("heading", { name: "Reselect your spreadsheet to continue" }).waitFor();
    assert.equal(await page.locator("input[type=file]").inputValue(), "");
    await page.getByLabel("Choose spreadsheet").setInputFiles(sample);
    await page.getByText("3 data rows", { exact: true }).waitFor();
  }
  await continueStep(page);
  await page.getByRole("heading", { name: "Dataset details", exact: true }).waitFor();
  if (general) {
    await page.getByRole("radio", { name: /A general dataset/ }).check();
    await page.getByLabel(/^Dataset name/).fill("Synthetic general dataset");
  } else {
    await page.getByLabel(/^Event name/).fill("Synthetic consultation");
    await page.getByLabel(/^Event date/).fill("2026-10-26");
  }
  await continueStep(page);
  await page.getByRole("heading", { name: "Match columns", exact: true }).waitFor();
  assert.equal(await page.getByLabel(/Which column identifies/).inputValue(), "Reference");
  await page.getByText("Customize your dataset", { exact: false }).click();
  await page.getByLabel("Dropdown filter for Sector", { exact: true }).check();
  if (screenshot)
    await page.screenshot({
      path: path.join(process.env.TEMP, `${screenshot}-columns.png`),
      fullPage: true,
    });
  await continueStep(page);
  await page.getByRole("button", { name: "Check location matches" }).click();
  await page.getByText("1 record with unknown locations", { exact: true }).waitFor();
  await page.getByRole("checkbox", { name: /Keep 1 record/ }).check();
  if (!general) await page.getByRole("checkbox", { name: /Every attendee belongs/ }).check();
  if (screenshot)
    await page.screenshot({
      path: path.join(process.env.TEMP, `${screenshot}-locations.png`),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Review changes", exact: true }).click();
  await page.getByRole("heading", { name: "Review changes", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Import records", exact: true }).isDisabled(),
    true,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download rows with errors" }).click();
  await download;
  await page.getByRole("checkbox", { name: /Exclude 1 rows/ }).check();
  if (screenshot)
    await page.screenshot({
      path: path.join(process.env.TEMP, `${screenshot}-review.png`),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Import records", exact: true }).click();
  await page.getByRole("heading", { name: "Your records are ready" }).waitFor();
  assert.ok(await page.getByRole("link", { name: "View records", exact: true }).isVisible());
  if (screenshot)
    await page.screenshot({
      path: path.join(process.env.TEMP, `${screenshot}-complete.png`),
      fullPage: true,
    });
}

async function main() {
  const browser = await chromium.launch({
    channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  try {
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      for (const general of [false, true]) {
        const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
        const user = {
          id: 1,
          name: "Synthetic Manager",
          email: "test@example.invalid",
          role: "data_manager",
          team: { id: 1, slug: "legislative", name: "Legislative", accent_color: "#00864a" },
          capabilities: ["datasets.use"],
        };
        await context.addInitScript(
          (user) =>
            localStorage.setItem(
              "commsdash-auth",
              JSON.stringify({ state: { token: "synthetic-test", user }, version: 0 }),
            ),
          user,
        );
        await context.route("**/api/**", (route) => {
          const url = new URL(route.request().url());
          return route.fulfill({ json: url.pathname === "/api/auth/me" ? user : [] });
        });
        const mock = await installImportMocks(context);
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.stack));
        await page.goto(base + "/datasets/import");
        if (general && viewport.width === 1440) mock.loseNextCommitResponse();
        await exerciseGuidedImport(page, {
          general,
          refresh: !general,
          screenshot: `guided-${general ? "general" : "event"}-${viewport.width}`,
        });
        assert.equal(mock.commits(), 1);
        if (!general) {
          await page.getByRole("button", { name: "Import another file", exact: true }).click();
          mock.inspection.columns.push(
            ...Array.from({ length: 50 }, (_, i) => ({
              source: "Extra column " + i,
              samples: ["Example"],
              values: ["Example"],
              has_more: false,
            })),
          );
          await page.getByLabel("Choose spreadsheet").setInputFiles(sample);
          await page.getByText("3 data rows", { exact: true }).waitFor();
          await continueStep(page);
          await page.getByLabel(/^Event date/).fill("2026-10-26");
          await continueStep(page);
          await page.getByText("Customize your dataset", { exact: false }).click();
          const scroll = page.locator("[data-testid=guided-import-scroll]");
          await scroll.hover();
          await page.mouse.wheel(0, 100000);
          await page.waitForFunction(() => {
            const e = document.querySelector("[data-testid=guided-import-scroll]");
            return e.scrollTop > 0 && e.scrollTop + e.clientHeight >= e.scrollHeight - 3;
          });
          const box = await page
            .getByRole("button", { name: "Continue", exact: true })
            .boundingBox();
          assert.ok(
            box && box.y >= 0 && box.y + box.height <= viewport.height,
            "Long mapping footer reached with wheel",
          );
          console.log(
            viewport.width +
              "x" +
              viewport.height +
              ": actual wheel reaches end of 53-column mapping",
          );
        }

        assert.deepEqual(errors, []);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          "No page-level horizontal overflow",
        );
        await page.locator("[data-testid=guided-import-scroll]").hover();
        await page.mouse.wheel(0, 20000);
        await page
          .getByRole("button", { name: general ? "Import another file" : "Continue", exact: true })
          .waitFor({ state: "visible" });
        console.log(
          `${viewport.width}x${viewport.height}: ${general ? "general" : "event"} guided import, recovery, exclusions, error download, result passed`,
        );
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
module.exports = { installImportMocks, exerciseGuidedImport };
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
