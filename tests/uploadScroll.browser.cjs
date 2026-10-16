const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.TEST_APP_URL || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      const context = await browser.newContext({ viewport });
      const user = {
        id: 1,
        name: "Synthetic Manager",
        email: "test@example.invalid",
        role: "data_manager",
        team: { id: 1, slug: "legislative", name: "Legislative", accent_color: "#4338ca" },
        capabilities: ["datasets.use"],
      };
      await context.addInitScript(
        (user) =>
          localStorage.setItem(
            "commsdash-auth",
            JSON.stringify({ state: { token: "synthetic-local-test", user }, version: 0 }),
          ),
        user,
      );
      let longHistory = true;
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/api/")) {
          let value = [];
          if (url.pathname === "/api/auth/me") value = user;
          else if (url.pathname === "/api/datasets/1")
            value = { id: 1, name: "Synthetic Event", event_key: "test-event", psgc_level: "city" };
          else if (url.pathname === "/api/datasets/1/batches")
            value = {
              data: longHistory
                ? Array.from({ length: 40 }, (_, i) => ({
                    id: i + 1,
                    original_filename: `Synthetic-import-${i + 1}.xlsx`,
                    status: "committed",
                    stats: { new: 50, updates: 0, rejected: 0 },
                  }))
                : [],
            };
          return route.fulfill({ json: value });
        }
        return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto(base + "/datasets/1/upload");
      await page
        .getByText("Synthetic-import-40.xlsx", { exact: true })
        .waitFor({ state: "attached" });
      const scrollArea = page.locator("main").locator("..");
      const sizes = await scrollArea.evaluate((element) => ({
        height: element.clientHeight,
        content: element.scrollHeight,
        overflow: getComputedStyle(element).overflowY,
      }));
      assert.equal(sizes.overflow, "auto");
      assert.ok(sizes.content > sizes.height);
      assert.ok(sizes.height <= viewport.height);
      await scrollArea.hover();
      await page.mouse.wheel(0, 20_000);
      await page.waitForFunction(() => {
        const element = document.querySelector("main").parentElement;
        return (
          element.scrollTop > 0 &&
          element.scrollTop + element.clientHeight >= element.scrollHeight - 2
        );
      });
      const lastRow = await page
        .getByText("Synthetic-import-40.xlsx", { exact: true })
        .boundingBox();
      assert.ok(lastRow && lastRow.y >= 0 && lastRow.y + lastRow.height <= viewport.height);
      const title = await page
        .getByRole("heading", { name: "Upload Records", exact: true })
        .boundingBox();
      assert.ok(
        title && title.y >= 0 && title.y < 100,
        "Upload header remains visible while scrolling",
      );
      longHistory = false;
      await page.reload();
      await page.getByText("No committed batches yet", { exact: true }).waitFor();
      assert.ok((await scrollArea.boundingBox()).height <= viewport.height);
      console.log(
        `${viewport.width}x${viewport.height}: wheel scrolling reaches last batch; sticky header and short history fit`,
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
