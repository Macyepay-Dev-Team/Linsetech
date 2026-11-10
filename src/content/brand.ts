/**
 * Brand tokens shown on /brand. The site itself styles from src/app/globals.css (@theme and :root); the values here
 * mirror those tokens one for one, so change both together. Every visible string lives in the brand messages
 * (src/messages/pages/brand/*.json, namespace `brandPage`) under the same ids.
 */

export const palette = [
  { id: "night", hex: "#020A07", text: "light" },
  { id: "green", hex: "#22C55E", text: "dark" },
  { id: "offWhite", hex: "#F3F3F3", text: "dark" },
  { id: "ink", hex: "#0B1411", text: "light" },
  { id: "paper", hex: "#F7F9F7", text: "dark" },
  { id: "mist", hex: "#FBFDF9", text: "dark" },
] as const;

/** The green scale (globals.css --color-green-*). */
export const greens = [
  ["50", "#F1FAF4"],
  ["100", "#CDEFD9"],
  ["200", "#86EFAC"],
  ["300", "#4ADE80"],
  ["400", "#22C55E"],
  ["500", "#16A34A"],
  ["600", "#15803D"],
  ["700", "#0F5132"],
  ["800", "#0B3D2E"],
  ["900", "#06281F"],
  ["950", "#04150F"],
] as const;

export const gradients = [
  { id: "nightfall", css: "linear-gradient(180deg, #020a07 0%, #04150f 28%, #0b3d2e 58%, #1f8f5a 82%, #cdefd9 100%)" },
  { id: "sweep", css: "linear-gradient(115deg, #04150f, #0b3d2e 45%, #22c55e)" },
  { id: "glow", css: "radial-gradient(ellipse 90% 60% at 50% 115%, rgba(34,197,94,.38), rgba(34,197,94,0) 70%), #020a07" },
] as const;

/** 60 / 30 / 10: night, off-white and greys, green. */
export const ratio = [
  { id: "night", share: 60, hex: "#020A07" },
  { id: "neutral", share: 30, hex: "#F3F3F3" },
  { id: "green", share: 10, hex: "#22C55E" },
] as const;

export const typeScale = [
  { id: "display", font: "sans", size: 88, mobile: 44, weight: 500, leading: 1.0, tracking: -0.02 },
  { id: "h2", font: "sans", size: 68, mobile: 44, weight: 500, leading: 1.06, tracking: -0.02 },
  { id: "h3", font: "sans", size: 32, mobile: 24, weight: 500, leading: 1.16, tracking: -0.01 },
  { id: "body", font: "sans", size: 19, mobile: 16, weight: 500, leading: 1.35, tracking: 0 },
  { id: "label", font: "narrow", size: 13, mobile: 12, weight: 500, leading: 1.2, tracking: 0.06 },
] as const;

export const materials = [
  { id: "chrome", image: "/brand/brand_chrome.webp" },
  { id: "glass", image: "/brand/brand_glass_v3.webp" },
] as const;

/** The square unit in six versions (Checkmarx-style module). */
export const squareUnits = ["solid", "layered", "outline", "grid", "glass", "chrome"] as const;

export const easings = [
  { id: "expo", css: "cubic-bezier(0.16, 1, 0.3, 1)", ms: 1000 },
  { id: "inOutQuart", css: "cubic-bezier(0.77, 0, 0.175, 1)", ms: 800 },
  { id: "outQuad", css: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", ms: 600 },
] as const;

export const voice = ["plain", "specific", "confident", "local"] as const;

export const socialSizes = [
  { id: "feed", w: 1080, h: 1350 },
  { id: "story", w: 1080, h: 1920 },
  { id: "x", w: 1200, h: 675 },
  { id: "linkedin", w: 1200, h: 627 },
] as const;

export const brandDownloads = [
  { id: "logos", type: "ZIP", href: "/brand/linse-logo-pack.zip" },
  { id: "guidelines", type: "PDF", href: null },
] as const;
