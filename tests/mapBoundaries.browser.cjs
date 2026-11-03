const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const base = process.env.TEST_APP_URL || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const user = {
      id: 1,
      name: "Synthetic boundary tester",
      email: "synthetic@example.invalid",
      role: "data_manager",
      team: { id: 1, slug: "legislative", name: "Legislative", accent_color: "#00864a" },
      capabilities: ["datasets.use", "analytics.use", "rss.use"],
    };
    await context.addInitScript(
      (user) =>
        localStorage.setItem(
          "commsdash-auth",
          JSON.stringify({ state: { token: "synthetic-test", user }, version: 0 }),
        ),
      user,
    );
    const requests = [];
    const dataset = {
      id: 1,
      name: "Local venue check",
      event_key: "local-venue",
      event_metadata: {
        id: "local-venue",
        name: "Local venue check",
        date: "2026-10-26",
        venue: "Quezon City",
        venue_psgc: "137404000",
      },
      entity_type: "person",
      psgc_level: "city",
      is_active: true,
      field_definitions: [],
      match_key_fields: ["reference"],
      layer_config: { aggregate_function: "count", tooltip_fields: [] },
    };
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      requests.push(url.href);
      if (url.pathname.startsWith("/api/")) {
        let value = [];
        if (url.pathname === "/api/auth/me") value = user;
        if (url.pathname === "/api/datasets") value = [dataset];
        if (url.pathname === "/api/datasets/1") value = dataset;
        if (url.pathname.startsWith("/api/datasets/1/records"))
          value = { data: [], total: 0, current_page: 1, last_page: 1, per_page: 20 };
        if (url.pathname === "/api/datasets/1/layer")
          value = {
            dataset,
            layer_data: [{ psgc_code: "137404000", count: 1, display_value: 1, tooltip: {} }],
            summary: {
              total: 1,
              unfiltered_total: 1,
              mapped: 1,
              unmapped: 0,
              unknown: 0,
              areas: 1,
            },
          };
        if (url.pathname === "/api/datasets/1/filter-options") value = { data: [] };
        if (url.pathname === "/api/analytics/datasets")
          value = { datasets: [{ ...dataset, record_count: 1 }], total_records: 1 };
        if (url.pathname === "/api/psgc/regions")
          value = [{ code: "130000000", name: "National Capital Region" }];
        return route.fulfill({ json: value });
      }
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.goto(base + "/");
    const polygons = page.locator('.leaflet-overlay-pane path.leaflet-interactive:not([d*="a"])');
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.leaflet-overlay-pane path.leaflet-interactive:not([d*="a"])')
          .length === 18,
    );
    await page.getByRole("button", { name: "Local venue check" }).click();
    const venue = page.locator('.leaflet-overlay-pane path.leaflet-interactive[d*="a"]');
    await venue.waitFor();
    await venue.click();
    await page.getByText("Approximate area centre", { exact: false }).waitFor();
    await page.locator(".leaflet-popup-close-button").click();
    assert.ok(await page.getByText(/historical 2019 snapshot/).isVisible());
    const province = page.getByRole("button", { name: "Province", exact: true });
    if (!(await province.isVisible()))
      await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await province.click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.leaflet-overlay-pane path.leaflet-interactive:not([d*="a"])')
          .length > 80,
    );
    await page.getByRole("button", { name: "Municities", exact: true }).click();
    const region = page.getByLabel("Region", { exact: true });
    if (!(await region.isVisible()))
      await page.getByText("Geographic area", { exact: true }).click();
    await region.selectOption("130000000");
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.leaflet-overlay-pane path.leaflet-interactive:not([d*="a"])')
          .length === 30,
    );
    assert.equal(await polygons.count(), 30);
    assert.equal(
      requests.some(
        (url) => url.includes("raw.githubusercontent.com") || url.includes("cdn.jsdelivr.net"),
      ),
      false,
    );
    assert.ok(requests.some((url) => url.includes("/maps/ph-2019/municipalities-137400000.json")));
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: path.join(process.env.TEMP, "ask-nest-local-boundaries.png"),
      fullPage: true,
    });
    console.log(
      "Real local assets: 18 region polygons, >80 province/district polygons, 30 legacy NCR city/subcity polygons; no GitHub/CDN map requests.",
    );
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
