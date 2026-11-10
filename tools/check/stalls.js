// node tools/check/stalls.js <url> [webkit]  (SLOW=1: screenshot-like pacing): scroll a page top to bottom with the wheel and list every frame > 50 ms with its scrollY
const pw = require("playwright");
(async () => {
  const [url, br] = process.argv.slice(2);
  const b = br === "webkit" ? await pw.webkit.launch() : await pw.chromium.launch({ channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "linse_cookie_consent", value: "true", url: new URL(url).origin }]);
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem("linse-pre", "1"); } catch {}
    window.__st = [];
    let last = performance.now();
    const tick = (t) => { const g = t - last; if (g > 50) window.__st.push([Math.round(g), Math.round(scrollY), Math.round(t)]); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(3500);
  await p.evaluate(() => (window.__st = []));
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const slow = process.env.SLOW === "1";
  for (let y = 0; y < total; y += slow ? 600 : 220) { await p.mouse.wheel(0, slow ? 600 : 220); await p.waitForTimeout(slow ? 70 : 45); if (slow && Math.floor(y / 3300) !== Math.floor((y + 600) / 3300)) await p.waitForTimeout(900); }
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => window.__st);
  const sections = await p.evaluate(() => [...document.querySelectorAll("main > *, main section[id], [id]")].filter((e) => e.id).map((e) => [e.id, Math.round(e.getBoundingClientRect().top + scrollY)]).slice(0, 30));
  console.log(JSON.stringify({ total, stalls: st, sections }));
  await b.close();
})();
