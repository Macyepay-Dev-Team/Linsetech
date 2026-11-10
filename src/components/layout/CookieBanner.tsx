"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { Button, Cross } from "@/components/ui/Button";

const COOKIE = "linse_cookie_consent";
const YEAR = 60 * 60 * 24 * 365;
/** Sharplink hides the banner once the page has scrolled this far and brings it back above it */
const SHOW_ABOVE = 100;

const onNavChange = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nav"] });
  return () => mo.disconnect();
};
const readNav = () => document.documentElement.dataset.nav ?? "dark";

/**
 * Sharplink SiteCookieBanner: a glass bar fixed above the header (48px from 800px, 75px below) until it is closed. It
 * fades in (.4s power2.out) while --cookie-offset grows to its height — the header, the menu and the heroes add that
 * offset, so the header slides down under it — hides past 100px of scroll (.3s power2.in) and comes back above.
 * Closing stores the consent for a year. Its tint follows the header theme.
 */
export default function CookieBanner() {
  const t = useTranslations("cookies");
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef<() => void>(() => {});
  const theme = useSyncExternalStore(onNavChange, readNav, () => "dark");

  useEffect(() => {
    const el = ref.current;
    const html = document.documentElement;
    if (!el) return;
    gsap.set(html, { "--cookie-offset": "0px" });
    if (document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))) return;
    let shown = false;
    let accepted = false;
    const show = () => {
      if (shown || accepted) return;
      shown = true;
      gsap.killTweensOf([el, html]);
      gsap.set(el, { display: "flex", autoAlpha: 0 });
      gsap.to(el, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
      gsap.to(html, { "--cookie-offset": `${el.offsetHeight}px`, duration: 0.4, ease: "power2.out" });
    };
    const hide = () => {
      if (!shown) return;
      shown = false;
      gsap.killTweensOf([el, html]);
      gsap.to(el, { autoAlpha: 0, duration: 0.3, ease: "power2.in" });
      gsap.to(html, {
        "--cookie-offset": "0px",
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          if (!shown) gsap.set(el, { display: "none" });
        },
      });
    };
    const onScroll = () => (window.scrollY >= SHOW_ABOVE ? hide() : show());
    // the bar is 75px on phones and 48px from 800px: keep the offset equal to it
    const onResize = () => {
      if (shown) gsap.set(html, { "--cookie-offset": `${el.offsetHeight}px` });
    };
    close.current = () => {
      document.cookie = `${COOKIE}=true; max-age=${YEAR}; path=/; samesite=lax`;
      accepted = true;
      hide();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf([el, html]);
      gsap.set(html, { "--cookie-offset": "0px" });
    };
  }, []);

  const light = theme === "light";
  return (
    <div
      ref={ref}
      role="region"
      aria-label={t("label")}
      className={cn(
        "fixed inset-x-0 top-0 z-[90] hidden h-[75px] items-center justify-between gap-4 px-4 py-3 backdrop-blur-[20px] min-[800px]:h-12 min-[800px]:px-7",
        light ? "bg-[var(--hover-on-light)] text-black" : "bg-[var(--surface-darker-tertiary)] text-off-white",
      )}
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <p className={cn("font-narrow text-[12px] font-normal uppercase leading-[1.4] tracking-[0.08em]", light ? "text-[var(--black-subtle)]" : "text-[var(--off-white-subtle)]")}>
        {t("text")}{" "}
        <Link href="/privacy#section-9" className={cn("underline", light ? "text-black" : "text-off-white")}>
          {t("link")}
        </Link>
      </p>
      <Button
        variant={light ? "secondary" : "tertiary"}
        icon={<Cross />}
        onClick={() => close.current()}
        aria-label={t("close")}
        className="cookie-close shrink-0"
      />
    </div>
  );
}
