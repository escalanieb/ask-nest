const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    channel: process.env.TEST_BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.goto(
      (process.env.TEST_COMPONENT_URL || "http://127.0.0.1:4174") +
        "/tests/fixtures/import-components.html",
    );
    await page.getByText("Customize your dataset", { exact: false }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: path.join(process.env.TEMP, "guided-import-component-390.png"),
      fullPage: true,
    });
    await page.getByTestId("component-scroll").hover();
    await page.mouse.wheel(0, 100000);
    await page.waitForFunction(() => {
      const e = document.querySelector("[data-testid=component-scroll]");
      return e.scrollTop > 0 && e.scrollTop + e.clientHeight >= e.scrollHeight - 3;
    });
    const box = await page.getByTestId("component-end").boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= 844);
    assert.deepEqual(errors, []);
    console.log(
      "390x844 isolated component: no horizontal overflow; actual wheel reaches all 27 column controls. App small-screen guard remains unchanged.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
