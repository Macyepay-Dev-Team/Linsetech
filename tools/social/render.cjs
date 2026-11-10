/**
 * Render Linse social posts from template.html.
 *   node tools/social/render.cjs <specs.json> <out-dir>
 * specs.json: [{ "name": "intro-01", ...spec }]. Writes <out-dir>/<name>.png at the spec's native size.
 * Needs Playwright (PLAYWRIGHT=/path/to/node_modules/playwright if it isn't installed here; PW_CHANNEL=chrome to use the system Chrome).
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");

(async () => {
  const [specFile, outDir] = process.argv.slice(2);
  const specs = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const base = path.dirname(path.resolve(specFile));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const s of specs) {
    const spec = { ...s };
    if (spec.hero && !/^(https?|file):/.test(spec.hero)) spec.hero = "file://" + path.resolve(base, spec.hero);
    await page.setViewportSize({ width: spec.w || 1080, height: spec.h || 1350 });
    await page.goto("file://" + path.join(__dirname, "template.html") + "?spec=" + encodeURIComponent(JSON.stringify(spec)));
    await page.waitForSelector("body[data-ready='1']", { timeout: 20000 });
    await page.waitForTimeout(150);
    const out = path.join(outDir, `${s.name}.png`);
    await page.locator("#post").screenshot({ path: out });
    console.log("wrote", out);
  }
  await browser.close();
})();
