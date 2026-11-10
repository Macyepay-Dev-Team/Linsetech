/**
 * Pre-rendered clips (Blender, see web/tools/blender). When `enabled`, the hero plays the intro film
 * and the Stack scrubs the machine clip, exactly like sharplink.com; otherwise the real-time
 * three.js scenes are used. Flip `enabled` once the files exist in public/clips.
 */
export const clips = {
  hero: { enabled: true, webm: "/clips/hero_chrome.webm", mp4: "/clips/hero_safari.mp4", poster: "/clips/hero_poster.webp" },
  // hold: the frame the scrub rests on (CLIP_MIN), shown as a still until the clip has landed its first seek
  stack: { enabled: true, webm: "/clips/stack_chrome.webm", mp4: "/clips/stack_safari.mp4", poster: "/clips/stack_poster.webp", hold: "/clips/stack_hold.webp" },
  // Sharplink's opportunity clip recreated (tools/blender/opportunity.py): an 8.7 s seamless loop beside the services list
  opportunity: { enabled: true, webm: "/clips/opportunity_chrome.webm", mp4: "/clips/opportunity_safari.mp4", poster: "/clips/opportunity_poster.webp" },
  // the Linse POS terminal assembling, checking out and printing (tools/blender/pos.py ANIM=1), scrubbed on the retail case
  posTill: { enabled: true, webm: "/clips/pos_till_chrome.webm", mp4: "/clips/pos_till_safari.mp4", poster: "/clips/pos_till_poster.webp" },
};

export type Clip = { webm: string; mp4: string; poster?: string };

const clip = (name: string, poster = "webp"): Clip => ({ webm: `/clips/${name}_chrome.webm`, mp4: `/clips/${name}_safari.mp4`, poster: `/clips/${name}_poster.${poster}` });

/**
 * Sharplink-style chrome clips for the inner pages (web/tools/blender/sl_*.py, being rendered). `ready: false` serves the
 * fallback until the render lands in public/clips; flip `ready` per clip once its files exist.
 */
const SL = {
  sl_coin_careers: { ready: true, fallback: clip("stack") },
  sl_coin_support: { ready: true, fallback: clip("stack") },
  sl_chain: { ready: true, fallback: clip("about_mark") },
  sl_press: { ready: true, fallback: clip("services_hero") },
  sl_sphere: { ready: true, fallback: clip("about_logo") },
  sl_watch: { ready: true, fallback: clip("about_logo") },
  sl_coins: { ready: true, fallback: clip("about_logo") },
  // the exploded chrome device, transparent 5 s loop (tools/blender/services_hero.py ALPHA=1): websites-and-apps hero
  services_hero: { ready: true, fallback: clip("services_hero") },
} as const;

export type SlClipName = keyof typeof SL | "about_logo";

/** The clip files for a Sharplink-style clip name (or its fallback while it renders). */
export function slClip(name: SlClipName): Clip {
  if (name === "about_logo") return clip("about_logo");
  const c = SL[name];
  return c.ready ? clip(name) : c.fallback;
}
