"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getLenis } from "@/lib/lenis";
import { cn } from "@/lib/cn";
import { site } from "@/content/site";
import { Logo } from "@/components/ui/Logo";
import { Arrow } from "@/components/ui/Button";
import DashedLine from "@/components/ui/DashedLine";
import DarkGradient from "@/components/backdrop/DarkGradient";
import { curtain } from "./PageTransition";
import FooterNewsletter from "./FooterNewsletter";
import FooterWordmark from "./FooterWordmark";

/** Sharplink .layout-grid: 4 columns, 16px gutters and margins below 800px; 12 columns, 28px above; 1864px at most */
const GRID =
  "mx-auto grid w-[calc(100%-32px)] max-w-[1864px] grid-cols-4 gap-x-4 gap-y-2 min-[800px]:w-[calc(100%-56px)] min-[800px]:grid-cols-12 min-[800px]:gap-x-7";
const DESKTOP = "max-[799px]:hidden";
const MOBILE = "min-[800px]:hidden";
/** Sharplink .menu-link: 19px, 1px underline drawn left → right on hover (.2s ease-in-out-quad) */
const MENU_LINK =
  "relative block w-max text-[19px] font-medium leading-[1.35] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-off-white after:transition-[width] after:duration-200 after:ease-in-out-quad after:content-[''] hover:after:w-full focus-visible:after:w-full motion-reduce:after:transition-none";
/** Sharplink .legal-link: inherits the muted colour and the list's underline, turns off-white in .2s */
const LEGAL_LINK = "transition-colors duration-200 ease-in-out-quad hover:text-off-white focus-visible:text-off-white";

/** Sharplink svg-dashed-line, positioned by the caller (left-0 / left-full + height) */
function VLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute top-0 block w-px", className)}>
      <DashedLine direction="vertical" theme="dark" />
    </span>
  );
}
function HLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute block h-px", className)}>
      <DashedLine theme="dark" />
    </span>
  );
}
/** Sharplink pre-footer line (SvgDashedLineGradient): dashes going from stroke-black-subtle to stroke-off-white-subtle */
function SpacerLine({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg aria-hidden width={1} height="100%" preserveAspectRatio="none" className={cn("pointer-events-none absolute top-0 block h-full w-px", className)} style={{ shapeRendering: "geometricPrecision" }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.15" />
          <stop offset="1" stopColor="#f3f3f3" stopOpacity="0.15" />
        </linearGradient>
        <pattern id={`p${id}`} x="0" y="0" width="1" height="4" patternUnits="userSpaceOnUse">
          <rect width="1" height="2" fill="#fff" />
        </pattern>
        <mask id={`m${id}`}>
          <rect width="100%" height="100%" fill={`url(#p${id})`} />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#g${id})`} mask={`url(#m${id})`} />
    </svg>
  );
}

/**
 * The 150px spacer above the footer follows the page, like Sharplink's `.pre-footer-spacer.<route>`: hidden on /about,
 * lines hidden on /news and the services pages (their /news, /ethereum-opportunity), only the first column's line on
 * desktop and none on phones for /careers and /support (their /investors).
 */
type Spacer = "lines" | "none" | "blank" | "rail";
const spacerFor = (path: string): Spacer => {
  if (path === "/about") return "none";
  if (path === "/news" || path === "/services" || path.startsWith("/services/")) return "blank";
  if (path === "/careers" || path === "/support" || path === "/brand") return "rail";
  return "lines";
};

/**
 * Sharplink site-footer: the pre-footer spacer, the dashed three-column grid (newsletter + badge | navigation + legal |
 * social + back to top + copyright) and the wordmark rising in its own dashed frame. Below 800px the columns dissolve
 * into one stack, the legal lines last, like theirs.
 */
export default function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const spacer = spacerFor(usePathname());
  const year = new Date().getFullYear();

  // Sharplink SiteFooterBackToTop: raise the curtain, jump to the top under it, lower it.
  const toTop = () =>
    curtain(() => {
      getLenis()?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    });

  const links = [
    ...site.nav.map((i) => ({ href: i.href as string, label: tn(i.key) })),
    { href: "/contact", label: t("company.contact") },
    { href: "/careers", label: t("company.careers") },
    { href: "/support", label: t("company.support") },
    { href: "/brand", label: t("company.brand") },
  ];

  // their Nasdaq block: a 24px logo at .6 and two muted narrow lines with the strong part in off-white
  const badge = (
    <div className="mt-auto">
      {/* their 24px <img> sits on a 27.4px line box (normal line height under it) */}
      <div className="flex h-[27.4px] items-start">
        <Logo className="text-[17.8px] leading-none opacity-60" />
      </div>
      <p className="eyebrow mt-4 max-w-[320px] text-off-white/60">
        {site.address[0]}
        <br />
        {t("legal.address")} · <strong className="text-off-white">{site.legalName}</strong>
      </p>
    </div>
  );

  const column = "relative max-[799px]:contents min-[800px]:col-span-4 min-[800px]:pb-7 min-[800px]:pl-7 min-[800px]:pt-[22px]";
  const menuBox = "flex h-full flex-col max-[799px]:contents";
  const menuBody = "col-span-4 mb-7 flex flex-col items-start px-4 min-[800px]:mb-[68px] min-[800px]:flex-row min-[800px]:px-0 min-[800px]:[&>*]:flex-[1_0_0%]";
  const menuFooter = "eyebrow col-span-4 mt-auto px-4 text-off-white/60 max-[799px]:order-10 min-[800px]:px-0";
  const tall = "h-[calc(100%+28px)]";

  return (
    <footer data-theme="dark" className="relative overflow-x-clip text-off-white">
      {/* Sharplink .site-footer .gradient: the flipped dark gradient rising out of the page above (light → arc → green →
          black), 20% + 420px taller than the footer; it shrinks as the page reaches its end (measured on sharplink.com:
          at the bottom of the page it starts ~357px above the footer, scale ≈ 0.84) */}
      {/* Their 2px overhang below the page is clipped here (on our page it would add scrollable height and show a dark
          hairline under the wordmark); the clip box reaches 4000px up so the part rising into the page stays visible,
          hence the height: calc(120% - 4380px) of it = 120% + 420px of the footer. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-[-4000px] overflow-hidden">
        <DarkGradient position="bottom" height="calc(120% - 4380px)" speed={-0.58} style={{ bottom: -2 }} />
      </div>
      <div className="relative z-[1]">
        {spacer !== "none" && (
          <div aria-hidden className={cn(GRID, "h-[150px]")}>
            <div className={cn("relative col-span-4", DESKTOP, spacer === "rail" && "min-[800px]:col-span-3")}>
              <SpacerLine className={cn("left-full", spacer === "blank" && "opacity-0")} />
            </div>
            <div className={cn("relative col-span-4", spacer === "rail" && "min-[800px]:hidden")}>
              <SpacerLine className={cn("left-0", spacer !== "lines" && "opacity-0")} />
              <SpacerLine className={cn("left-full", spacer !== "lines" && "opacity-0")} />
            </div>
            <div className={cn("relative col-span-4", DESKTOP, spacer === "rail" && "hidden")}>
              <SpacerLine className={cn("left-0", spacer === "blank" && "opacity-0")} />
            </div>
          </div>
        )}

        <section>
          <div className={cn(GRID, "relative z-[1] max-[799px]:gap-y-0 before:absolute before:left-0 before:top-0 before:z-[1] before:h-[6px] before:w-[6px] before:bg-off-white before:content-['']")}>
            <VLine className={cn("left-0 h-full", MOBILE)} />
            <VLine className={cn("left-full h-full", MOBILE)} />
            <HLine className="left-0 top-0 w-full max-[799px]:-left-4 max-[799px]:w-[calc(100%+32px)]" />

            {/* newsletter + badge */}
            <div className="relative col-span-4 pb-7 pt-[22px]">
              <div className="relative flex h-full flex-col max-[799px]:px-4">
                <p className="mb-[26px] text-[24px] font-medium leading-[1.4] tracking-[-0.24px]">{t("newsletter.title")}:</p>
                {/* the form block (FooterNewsletter) set on Sharplink's metrics: 66px row, 19px field, their dashed rule */}
                <div className="relative mb-7 min-[800px]:mb-[68px] [&>form]:mt-0 [&>form]:min-h-[66px] [&>form]:gap-2 [&>form]:border-b-0! [&>form]:pb-7 [&>form]:pr-0 min-[800px]:[&>form]:pb-0 min-[800px]:[&>form]:pr-7 [&_input]:text-[19px] [&_input]:font-medium [&_input]:leading-[1.35] [&_input[type=email]]:h-auto">
                  <FooterNewsletter />
                  <HLine className="left-0 top-full w-full max-[799px]:-left-8 max-[799px]:w-[calc(100%+64px)]" />
                </div>
                <div className={cn("mt-auto", DESKTOP)}>{badge}</div>
                <HLine className={cn("-left-4 top-full w-[calc(100%+32px)]", MOBILE)} />
              </div>
              <VLine className={cn("left-full", tall, DESKTOP)} />
            </div>

            {/* navigation + legal */}
            <div className={column}>
              <VLine className={cn("left-0", tall, DESKTOP)} />
              <div className={menuBox}>
                <div className={menuBody}>
                  <div>
                    <p className="eyebrow mb-3 text-off-white/60">{t("columns.navigate")}</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-[800px]:gap-y-0">
                      {links.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} className={MENU_LINK}>
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className={menuFooter}>
                  <ul className="mb-4 flex items-center gap-4 underline min-[800px]:mb-0 min-[800px]:gap-3">
                    <li>
                      <Link href="/privacy" className={LEGAL_LINK}>
                        {t("legal.privacy")}
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className={LEGAL_LINK}>
                        {t("legal.terms")}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <VLine className={cn("left-full", tall, DESKTOP)} />
            </div>

            {/* social + back to top + copyright */}
            <div className={column}>
              <VLine className={cn("left-0", tall, DESKTOP)} />
              <div className={menuBox}>
                <div className={menuBody}>
                  <div>
                    <p className="eyebrow mb-3 text-off-white/60">{t("columns.social")}</p>
                    <ul className="grid gap-y-1.5 min-[800px]:gap-y-0">
                      {site.social.map((s) => (
                        <li key={s.label}>
                          <a href={s.href} target="_blank" rel="noopener noreferrer" className={MENU_LINK}>
                            {s.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Sharplink .back-to-top: label above its button, right-aligned; on phones the button leads */}
                  <div className="eyebrow mt-10 flex flex-row-reverse items-center justify-end gap-3 min-[800px]:mt-0 min-[800px]:flex-col min-[800px]:items-end">
                    {t("legal.top")}
                    <button type="button" onClick={toTop} aria-label={t("legal.top")} className="ui-btn ui-btn--secondary has-icon allow-parent-hover">
                      <span className="ui-btn__icon">
                        <span>
                          <Arrow className="-rotate-90" />
                        </span>
                        <span aria-hidden>
                          <Arrow className="-rotate-90" />
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
                <div className={menuFooter}>{t("legal.rights", { year })}</div>
              </div>
            </div>

            <div className={cn("col-span-4 px-4 pb-14 pt-7", MOBILE)}>{badge}</div>
            <HLine className={cn("left-0 top-full w-full", DESKTOP)} />
          </div>
        </section>

        {/* wordmark in its dashed frame (Sharplink .wordmark-wrapper + .footer-lines) */}
        <section>
          <div className="relative pt-12 min-[800px]:mt-7">
            <div aria-hidden className={cn(GRID, "pointer-events-none absolute left-1/2 top-0 z-[2] h-full -translate-x-1/2")}>
              <VLine className={cn("left-0 h-full", MOBILE)} />
              <VLine className={cn("left-full h-full", MOBILE)} />
              <HLine className={cn("left-0 top-0 w-full", DESKTOP)} />
              <div className="relative col-span-4">
                <VLine className={cn("left-full h-full", DESKTOP)} />
              </div>
              <div className="relative col-span-4">
                <VLine className={cn("left-0 h-full", DESKTOP)} />
                <VLine className={cn("left-full h-full", DESKTOP)} />
              </div>
              <div className="relative col-span-4">
                <VLine className={cn("left-0 h-full", DESKTOP)} />
              </div>
            </div>
            <FooterWordmark word={`${site.name}tech`} />
          </div>
        </section>
      </div>
    </footer>
  );
}
