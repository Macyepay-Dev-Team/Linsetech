/**
 * node tools/check/qa.js <origin> <outDir> <profile: desktop|phone> <browser: chromium|webkit> <paths…>
 * For each page: load (loader skipped), scroll it like a visitor (wheel steps), screenshot along the way into a sheet,
 * and record console errors, failed same-origin requests and frame stalls (rAF gaps) while scrolling.
 */
const pw = require("playwright");
const sharp = require("../../node_modules/sharp");
(async () => {
  const [origin, out, profile, br, ...paths] = process.argv.slice(2);
  const vp = profile === "phone" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const b = br === "webkit" ? await pw.webkit.launch() : await pw.chromium.launch({ channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const report = [];
  for (const path of paths) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, ...(profile === "phone" ? { isMobile: br !== "webkit" ? true : undefined, hasTouch: true } : {}) });
    await ctx.addCookies([{ name: "linse_cookie_consent", value: "true", url: origin }]);
    await ctx.addInitScript(() => {
      try { sessionStorage.setItem("linse-pre", "1"); } catch {}
      window.__gaps = [];
      let last = performance.now();
      const tick = (t) => { window.__gaps.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const p = await ctx.newPage();
    const errs = [], fails = [];
    p.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 200)));
    p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
    p.on("response", (r) => { if (r.url().startsWith(origin) && r.status() >= 400) fails.push(`${r.status()} ${r.url().replace(origin, "")}`); });
    const t0 = Date.now();
    let status = 0;
    try { const r = await p.goto(origin + path, { waitUntil: "load", timeout: 90000 }); status = r ? r.status() : 0; } catch (e) { errs.push("goto: " + e.message.slice(0, 120)); }
    await p.waitForTimeout(3000);
    const loadMs = Date.now() - t0;
    const total = await p.evaluate(() => document.documentElement.scrollHeight);
    const shots = Math.max(2, Math.min(profile === "phone" ? 12 : 16, Math.ceil(total / vp.height)));
    const files = [];
    await p.evaluate(() => (window.__gaps = []));
    for (let i = 0; i < shots; i++) {
      const target = Math.round(((total - vp.height) * i) / Math.max(1, shots - 1));
      for (let k = 0; k < 40; k++) {
        const y = await p.evaluate(() => scrollY);
        if (Math.abs(y - target) < 20) break;
        await p.mouse.wheel(0, Math.max(-600, Math.min(600, target - y)));
        await p.waitForTimeout(70);
      }
      await p.waitForTimeout(900);
      const f = `${out}/${profile}-${br}-${path.replace(/\//g, "_") || "_home"}-${String(i).padStart(2, "0")}.png`;
      await p.screenshot({ path: f });
      files.push(f);
    }
    const gaps = await p.evaluate(() => window.__gaps);
    const over = (ms) => gaps.filter((g) => g > ms).length;
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    report.push({ path, status, loadMs, height: total, frames: gaps.length, stalls50: over(50), stalls100: over(100), maxGap: Math.round(Math.max(0, ...gaps)), overflowX: overflow, errs: [...new Set(errs)].slice(0, 6), fails: [...new Set(fails)].slice(0, 6) });
    // contact sheet
    const cw = profile === "phone" ? 200 : 360;
    const ch = Math.round((vp.height * cw) / vp.width);
    const cols = profile === "phone" ? 6 : 4;
    const rows = Math.ceil(files.length / cols);
    const comp = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(cw, ch).toBuffer(), left: (i % cols) * (cw + 4), top: Math.floor(i / cols) * (ch + 4) })));
    await sharp({ create: { width: cols * (cw + 4), height: rows * (ch + 4), channels: 3, background: "#ff00ff" } }).composite(comp).jpeg({ quality: 72 }).toFile(`${out}/sheet-${profile}-${br}-${path.replace(/\//g, "_") || "_home"}.jpg`);
    await ctx.close();
  }
  require("fs").writeFileSync(`${out}/report-${profile}-${br}.json`, JSON.stringify(report, null, 1));
  for (const r of report) console.log(`${r.path.padEnd(40)} ${r.status} load ${r.loadMs}ms h${r.height} stalls>50:${r.stalls50} >100:${r.stalls100} max:${r.maxGap}ms overflowX:${r.overflowX} errs:${r.errs.length} fails:${r.fails.length}`);
  await b.close();
})();
