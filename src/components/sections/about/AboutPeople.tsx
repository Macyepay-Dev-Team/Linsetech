"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import DashedLine from "@/components/ui/DashedLine";
import DarkGradient from "@/components/backdrop/DarkGradient";
import DocList from "@/components/sections/company/DocList";
import { leadership, team, certifications, documents, contacts } from "@/content/company";
import { hardwareBrands } from "@/content/hardware";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import TextReveal from "./TextReveal";
import PortraitTile from "./PortraitTile";
import BioDrawer, { type Bio } from "./BioDrawer";
import LoopClip from "./LoopClip";
import { aboutClips } from "./AboutHeroClip";
import "@/components/sections/company/company.css";

const M = "px-[clamp(16px,2.5vw,40px)]";
/** Sharplink layout-grid: 4 columns / 16px on phones, 12 / 28px from 800px, 8px between rows */
const GRID = cn("grid grid-cols-4 gap-x-4 gap-y-2 min-[800px]:grid-cols-12 min-[800px]:gap-x-[28px]", M);
/** their `.team-grid`: columns 4–12 holding an inner 12-column grid (4-up), 2-up on phones */
const TEAM_GRID = "col-span-4 grid grid-cols-4 gap-x-4 gap-y-8 min-[800px]:col-span-9 min-[800px]:grid-cols-12 min-[800px]:gap-x-[28px] min-[800px]:gap-y-9";
const CONTENT = "col-span-4 min-[800px]:col-span-9";

export function Plus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className ?? "h-[14px] w-[14px]"} fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M8 1.5v13M1.5 8h13" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className ?? "h-[12px] w-[12px]"} fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M5.5 5.5h8v8h-8z" />
      <path d="M10.5 5.5v-3h-8v8h3" />
    </svg>
  );
}

/**
 * Sharplink `.subtitle-wrapper`: columns 1–3, a dashed rule on top (desktop), the 24px subtitle and a 16px counter in
 * the subtle colour; on phones the title and the counter share one row, 28px above the grid.
 */
function SubTitle({ title, count, tone }: { title: string; count?: number; tone: "dark" | "light" }) {
  return (
    <div className="relative col-span-4 mb-7 flex items-center justify-between gap-4 min-[800px]:col-span-3 min-[800px]:mb-0 min-[800px]:block min-[800px]:pt-4">
      <DashedLine theme={tone} className="top-0 hidden min-[800px]:block" />
      <h3 className="text-[24px] font-medium leading-[1.4] tracking-[-0.24px]">{title}</h3>
      {count !== undefined && <p className={cn("text-[16px] font-medium leading-[1.35]", tone === "dark" ? "text-[var(--off-white-subtle)]" : "text-[var(--black-subtle)]")}>{count}</p>}
    </div>
  );
}

/** Sharplink coverage "COPY": 12px icon + narrow label; reads "Copied" for 2s. */
function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value).then(() => setCopied(true), () => {})}
      className="eyebrow inline-flex items-center gap-1.5 text-ink transition-opacity hover:opacity-70"
      aria-label={`${label} ${value}`}
    >
      <CopyIcon />
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

/** A name cell in the documents-list language: dashed rule on top, 28px padding, 16px/500. */
function NameCells({ names, marker }: { names: string[]; marker?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 min-[800px]:grid-cols-4 min-[800px]:gap-x-[28px]">
      {names.map((n) => (
        <li key={n} className="co-dash flex items-center gap-3 py-5 text-[16px] font-medium leading-[1.35] min-[800px]:py-7">
          {marker && <span className="block h-1 w-1 shrink-0 bg-[var(--brand)]" aria-hidden />}
          {n}
        </li>
      ))}
    </ul>
  );
}

function Block({ children, first }: { children: ReactNode; first?: boolean }) {
  return <div className={cn(GRID, !first && "pt-14 min-[800px]:pt-[84px]")}>{children}</div>;
}

/**
 * Sharplink AboutPeople, on its own structure (no side rail):
 * - the blurb on black (padding-bottom 160px, 84px on phones): pinned rule, 44px statement whose letters go .4 → 1 in
 *   reading order, scrubbed from the black block's top at 60 % of the window to 25 %;
 * - "Leadership" on black: subtitle + counter in columns 1–3, the 4-up grid of cards in 4–12 (portrait on the green
 *   plate, 19px name, narrow role, "Read bio" → the bio drawer); the whole card is the button, like their card-team;
 * - "Team" in the place of their Board of Directors: same layout, 84px lower, transparent over their board gradient
 *   (top, 180 % of the block; on phones it ends with the logo clip) that runs from black through green into the light
 *   page, on light plates;
 * - their people-video: the looping chrome LS mark (280px, 220px on phones) with 160px (120px) above and below, on light;
 * - then, on the light page, partners, documents and contacts in the same subtitle layout, each listed the way Sharplink
 *   lists those elsewhere (documents-list name cells, card-document files, card-investor-contact cards).
 */
export default function AboutPeople() {
  const t = useTranslations("aboutPage.people");
  const [bio, setBio] = useState<Bio | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const openBio = (i: number) => {
    const p = leadership[i];
    const role = t(`leadership.${p.id}.role`);
    setBio({ index: i, name: t("member"), role, portraitLabel: t("portrait"), paragraphs: [t("bio1", { role, focus: t(`leadership.${p.id}.focus`) }), t("bio2")] });
    setOpen(true);
  };

  return (
    <section className="relative z-[2] text-off-white">
      {/* blurb */}
      <div data-theme="dark" className="people-blurb relative bg-black pb-[84px] min-[800px]:pb-[160px]">
        <div className={M}>
          <div className="relative pt-[28px]">
            <DashedLine theme="dark" className="top-0" />
            <span className="absolute left-0 top-0 h-[6px] w-[6px] bg-green-400" aria-hidden />
            <TextReveal
              as="h2"
              mode="scrub"
              dim={0.4}
              triggerClosest=".people-blurb"
              text={t("statement")}
              className="max-w-[853px] text-[24px] font-medium leading-[1.4] tracking-[-0.24px] min-[800px]:text-[44px] min-[800px]:font-normal min-[800px]:leading-[1.23] min-[800px]:tracking-[-0.44px]"
            />
          </div>
        </div>
      </div>

      {/* leadership (black) */}
      <div data-theme="dark" className="relative bg-black">
        <div className={cn(GRID, "relative z-[1]")}>
          <SubTitle title={t("headings.leadership")} count={leadership.length} tone="dark" />
          <ul className={TEAM_GRID}>
            {leadership.map((p, i) => (
              <li key={p.id} className="col-span-2 min-[800px]:col-span-3">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => openBio(i)}
                  className="flex h-full w-full flex-col text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
                >
                  <PortraitTile index={i} label={t("portrait")} className="w-full" />
                  <span className="mt-4 text-[16px] font-medium leading-[1.35] min-[800px]:text-[19px]">{t("member")}</span>
                  <span className="eyebrow mb-4 mt-2 text-[var(--off-white-subtle)]">{t(`leadership.${p.id}.role`)}</span>
                  <span className="mt-auto ui-btn ui-btn--secondary has-icon allow-parent-hover" aria-hidden>
                    <span className="ui-btn__content">
                      <span>{t("readBio")}</span>
                      <span>{t("readBio")}</span>
                    </span>
                    <span className="ui-btn__icon">
                      <span>
                        <Plus />
                      </span>
                      <span>
                        <Plus />
                      </span>
                    </span>
                  </span>
                  <span className="sr-only">{t("readBio")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* team, in the board's place: transparent over the board gradient (black → green → light) */}
      <div data-theme="dark" className="relative pt-14 min-[800px]:pt-[84px]">
        {/* desktop: their 180 %. Phones: their 220 % spills ~1500px below a 2-up grid, over our light blocks after the
            logo clip; 900px past the block keeps the last row of names on green and the next block on the light end */}
        <DarkGradient position="top" height="180%" heightMobile="calc(100% + 900px)" />
        <div className={cn(GRID, "relative z-[1]")}>
          <SubTitle title={t("headings.team")} count={team.length} tone="dark" />
          <ul className={TEAM_GRID}>
            {team.map((p, i) => (
              <li key={p.id} className="col-span-2 flex flex-col min-[800px]:col-span-3">
                <PortraitTile index={i + 2} label={t("portrait")} tone="light" className="w-full" />
                <span className="mt-4 text-[16px] font-medium leading-[1.35] min-[800px]:text-[19px]">{t("member")}</span>
                <span className="eyebrow mt-2 text-[var(--off-white-subtle)]">{t(`roles.${p.role}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sharplink people-video: their 3D logomark looping on the light end of the gradient */}
      <div data-theme="light" className="relative z-[1] flex items-center justify-center py-[120px] min-[800px]:py-[160px]">
        <div className="h-[220px] w-[220px] min-[800px]:h-[280px] min-[800px]:w-[280px]">
          <LoopClip webm={aboutClips.logo.webm} mp4={aboutClips.logo.mp4} poster={aboutClips.logo.poster} />
        </div>
      </div>

      {/* partners, documents, contacts: light widgets in the same subtitle layout */}
      <div data-theme="light" className="co-light relative z-[1] pb-[112px] text-ink min-[800px]:pb-[140px]">
        <Block first>
          <SubTitle title={t("headings.partners")} tone="light" />
          <div className={CONTENT}>
            <p className="mb-10 max-w-[680px] text-[16px] font-medium leading-[1.35] text-[var(--black-subtle)] min-[800px]:mb-14 min-[800px]:pt-4 min-[800px]:text-[19px]">{t("partners.sub")}</p>
            <p className="eyebrow mb-4 text-[var(--black-subtle)]">{t("partners.brands")}</p>
            <NameCells names={hardwareBrands} />
            <p className="eyebrow mb-4 mt-10 text-[var(--black-subtle)] min-[800px]:mt-14">{t("partners.certs")}</p>
            <NameCells names={certifications.map((c) => t(`certifications.${c}`))} marker />
          </div>
        </Block>

        <Block>
          <SubTitle title={t("headings.documents")} count={documents.length} tone="light" />
          <div className={CONTENT}>
            <DocList items={documents.map((d) => ({ id: d.id, chip: d.type, title: t(`documents.${d.id}`), file: { href: d.href ?? undefined, label: t("documents.download"), soon: t("documents.soon") } }))} />
          </div>
        </Block>

        <Block>
          <SubTitle title={t("headings.contacts")} tone="light" />
          <ul className={cn(CONTENT, "grid grid-cols-1 gap-y-7 min-[800px]:grid-cols-3 min-[800px]:gap-x-[28px]")}>
            {contacts.map((c) => (
              <li key={c.id} className="co-dash flex flex-col pt-7">
                <h4 className="text-[24px] font-medium leading-[1.4] tracking-[-0.24px] min-[800px]:text-[32px] min-[800px]:leading-[1.16] min-[800px]:tracking-[-0.32px]">{t(`contacts.${c.id}`)}</h4>
                <a href={`mailto:${c.email}`} className="mb-5 mt-3 w-fit text-[16px] font-medium leading-[1.35] text-[var(--c-grey)] underline underline-offset-2 [overflow-wrap:anywhere]">
                  {c.email}
                </a>
                <div className="mt-auto">
                  <CopyButton value={c.email} label={t("contacts.copy")} done={t("contacts.copied")} />
                </div>
              </li>
            ))}
            <li className="co-dash flex flex-col pt-7">
              <h4 className="text-[24px] font-medium leading-[1.4] tracking-[-0.24px] min-[800px]:text-[32px] min-[800px]:leading-[1.16] min-[800px]:tracking-[-0.32px]">{t("contacts.office")}</h4>
              <p className="mt-3 text-[16px] font-medium leading-[1.35] text-[var(--c-grey)]">
                {site.address.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </p>
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="mb-5 mt-5 w-fit text-[16px] font-medium leading-[1.35] text-[var(--c-grey)] underline underline-offset-2">
                {site.phone}
              </a>
              <div className="mt-auto">
                <CopyButton value={site.phone} label={t("contacts.copy")} done={t("contacts.copied")} />
              </div>
            </li>
          </ul>
        </Block>
      </div>

      <BioDrawer bio={bio} open={open} title={t("drawerTitle")} closeLabel={t("close")} ctaLabel={t("drawerCta")} onClose={close} />
    </section>
  );
}
