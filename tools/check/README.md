# Checks (run against `npm run dev` on :3000)

Set `PW` to a Playwright module path (Chrome channel + WebKit installed), as with `tools/ref/*.js`.

- `node navcheck.js <chrome|webkit> <desk|phone>` — scrolls every page and compares the real pixels behind the header
  logo with the header theme (`html[data-nav]`); `PAGES=/a,/b` to limit. Content passing under the logo (cards, photos)
  shows up as a few isolated misses; runs of misses are real theme errors.
- `node peek.js <chrome|webkit> <desk|phone> <path> <y1,y2,…> <name>` — viewport shots at scroll positions → one sheet
  (`OUT` folder, `SETTLE` ms per stop).
- `node width.js` — horizontal overflow per page in Chrome 1800, WebKit 1800 and WebKit iPhone.
- `node glitch-live.js [path]` — wheel-scrolls a page in Chrome like a visitor (Lenis on) while recording the browser's
  frame stream; flags flashes (a frame unlike both neighbours) and jumps, saves every frame with its scroll position
  (`frames.json`) for per-transition sheets. `MOBILE=1 W=390 H=844` for a phone, `DIR=up` to scroll back up,
  `FROM`/`TO` for a range, `MAXS` time cap. Run with the GPU flags it sets (WebGL scenes render as in a real browser).
- `node glitch.js <chrome|webkit> <desk|phone> [path]` — the same idea with settled steps (every 40px): finds state
  jumps between scroll positions rather than motion glitches.
- `recording.swift` + `recording-sheet.js` — read a screen recording someone sends (a .mov from macOS; Homebrew's ffmpeg
  is broken on this machine, so frames come out through AVFoundation): `swiftc -O recording.swift -o recording`, then
  `./recording clip.mov out 0 -1 0.5 720` (a frame every 0.5 s, 720px wide; `all` for every frame) and
  `node recording-sheet.js out sheet 6 5 360` for contact sheets. `out/frames.csv` lists every frame's timestamp:
  macOS recordings are variable-rate, so long gaps between timestamps are moments the screen did not update (stalls).
- `node preload.js` — the loading screen as a visitor sees it: a fresh visit, a repeat load in the same visit, a
  client-side navigation (the curtain), reduced motion, and a load with every script blocked (the CSS fallback must hide
  it and unlock the page), each as a frame sheet with pass/fail lines. `ENGINE=webkit`, `MOBILE=1`, `PAGE=/about`.
  WebKit has no frame stream, so its sheets are a screenshot loop: judge timings in Chrome.

Note: if a CSS change does not show in `npm run dev`, restart it — its watcher can stop picking up `globals.css`.

## qa.js and stalls.js (10 Nov 2026 visual QA pass)
- `qa.js <origin> <outDir> <desktop|phone> <chromium|webkit> <paths…>`: loads each page with the loader skipped, scrolls it with the wheel, saves screenshots and a contact sheet per page, and writes a report of console errors, failed same-origin requests, horizontal overflow and frame stalls. In WebKit the screenshots themselves cause ~60–100 ms gaps, so read its stall counts with that in mind.
- `stalls.js <url> [webkit]`: no screenshots; scrolls top to bottom and lists every frame over 50 ms with its scrollY and time. Use it to locate jank (e.g. a 3D model compiling its shaders on first sight).
- Both need Playwright (same setup as the other scripts here) and are run against a production build (`web-prod` on :3100).
