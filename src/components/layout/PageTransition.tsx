"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";
import { waveArrive, waveTo } from "@/components/sections/work/pixelWave";

/**
 * Sharplink `PageTransition`: a fixed, pointer-transparent curtain (theirs in the page gradient; ours in the loading
 * screen's night, since every page opens on a dark hero).
 *
 * Leaving (their route middleware): `gsap.to("#page-transition", { opacity: 1, duration: 0.5, ease: "power3.inOut" })`
 * runs to completion *before* the route changes, Lenis is stopped, and the header theme flips under cover.
 * Entering (their `page:finish` / `onAfterEnter`): Lenis is re-enabled, scroll jumps to the top (`immediate`),
 * `ScrollTrigger.refresh()`, then the curtain fades out with the same 0.5s power3.inOut.
 * Their back-to-top reuses the curtain (`curtain()` below): cover → instant scroll → uncover.
 *
 * Since 10 Nov 2026 every route change leaves through Puture's pixel wave instead (the owner liked it on the case
 * pages): the click covers the page with the grid of cells from the click point, the route changes under it, and the
 * arriving page clears it from the centre (pixelWave.ts). The curtain is kept for back-to-top.
 */
const FAST = 0.5;
const EASE = "power3.inOut";
const WATCHDOG = 8000;

let overlay: HTMLDivElement | null = null;
let busy = false;

function fadeTo(opacity: number, onComplete?: () => void) {
  if (!overlay) {
    onComplete?.();
    return;
  }
  gsap.to(overlay, { opacity, duration: FAST, ease: EASE, overwrite: true, onComplete });
}

/** Cover the page, run `between` (an instant scroll, a theme swap…), uncover. */
export function curtain(between: () => void) {
  if (busy || !overlay || prefersReducedMotion()) {
    between();
    return;
  }
  busy = true;
  fadeTo(1, () => {
    between();
    fadeTo(0, () => {
      busy = false;
    });
  });
}

export default function PageTransition() {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef<string | null>(null);
  const watchdog = useRef<number | undefined>(undefined);
  // the path this component last settled on: an effect run for the same path (first mount, or React's dev-mode
  // double run) is not a navigation and must not flash the curtain
  const settled = useRef(pathname);

  useEffect(() => {
    overlay = ref.current;
    return () => {
      overlay = null;
    };
  }, []);

  // Leaving: intercept same-origin link clicks, raise the curtain, then push the route (next/intl links are already localized).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition != null) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (!overlay || prefersReducedMotion()) return;
      e.preventDefault();
      if (pending.current) return;
      const href = url.pathname + url.search + url.hash;
      pending.current = href;
      const from = e.detail === 0 ? null : { x: e.clientX, y: e.clientY };
      // the wave covers from the click point, then pushes the route (it uncovers by itself if the route never mounts)
      waveTo(href, from, (h) => router.push(h, { scroll: false }));
      window.clearTimeout(watchdog.current);
      watchdog.current = window.setTimeout(() => {
        pending.current = null;
      }, WATCHDOG);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // Entering: the new page is mounted under the curtain — reset scroll, re-measure, lower the curtain.
  // Back / forward render at once (Next swaps the page before anything can cover it), so there is no curtain to lower:
  // snapping it up just to fade it out read as a flash.
  useEffect(() => {
    if (settled.current === pathname) return;
    settled.current = pathname;
    window.clearTimeout(watchdog.current);
    const viaClick = pending.current != null;
    pending.current = null;
    if (!viaClick || !overlay || prefersReducedMotion()) {
      getLenis()?.start();
      busy = false;
      return;
    }
    const id = window.setTimeout(() => {
      // under the wave: back to the top (unless the link carries an anchor, which the wave jumps to), re-measure,
      // then let the wave clear (a no-op if the page's own WaveLinks already started it)
      const lenis = getLenis();
      lenis?.start();
      if (!window.location.hash) {
        lenis?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
      }
      ScrollTrigger.refresh();
      waveArrive();
    }, 60);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return <div ref={ref} id="page-transition" aria-hidden />;
}
