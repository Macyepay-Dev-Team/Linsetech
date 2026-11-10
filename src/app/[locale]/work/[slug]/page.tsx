import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { projects as localProjects } from "@/content/work";
import { clips } from "@/content/clips";
import DeviceScrub from "@/components/sections/work/DeviceScrub";
import { getProjects, getProject } from "@/sanity/data";
import StatTiles from "@/components/sections/pages/StatTiles";
import { ChapterLabel } from "@/components/sections/WorkChapter";
import { Arrow } from "@/components/ui/Button";
import CaseBackdrop from "@/components/sections/work/CaseBackdrop";
import CaseMotion from "@/components/sections/work/CaseMotion";
import CasePager from "@/components/sections/work/CasePager";
import JourneyFlow from "@/components/sections/work/JourneyFlow";
import PinnedScreens from "@/components/sections/work/PinnedScreens";
import ScreenGrid from "@/components/sections/work/ScreenGrid";
import WaveLinks from "@/components/sections/work/WaveLinks";
import { ContactButton } from "@/components/sections/ContactButton";
import { localizeProject, localizeProjects } from "@/components/sections/work/localize";
import styles from "@/components/sections/work/case.module.css";
import { breadcrumbJsonLd, JsonLd, pageMetadata } from "@/lib/seo";
import { CHAPTER_INDEX } from "@/components/sections/WorkPacing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => localProjects.map((p) => ({ locale, slug: p.slug })));
}

async function load(locale: Locale, slug: string) {
  const t = await getTranslations({ locale, namespace: "workPage" });
  const over = t.has("content") ? (t.raw("content") as Record<string, unknown>) : null;
  const [p, all] = await Promise.all([getProject(locale, slug), getProjects(locale)]);
  return { t, project: p ? localizeProject(p, over) : undefined, projects: localizeProjects(all, over) };
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale, slug } = await params;
  const { project } = await load(locale as Locale, slug);
  return project ? pageMetadata({ locale, path: `/work/${project.slug}`, title: project.title, description: project.blurb }, parent) : {};
}

const WRAP = "mx-auto w-full max-w-[1440px] px-[clamp(16px,2.5vw,40px)]";
const SECTION = "relative py-[clamp(96px,14vh,160px)]";
const H2 = "text-[clamp(36px,5vw,78px)] font-normal leading-none tracking-[-0.04em]";

/** Puture's `.case-tint`: a night veil over the fixed space, opaque for the body, clearing over the last 90vh before the CTA. */
const TINT =
  "linear-gradient(180deg, rgba(2,10,7,.84) 0, rgba(2,10,7,.84) calc(100% - 90vh), rgba(2,10,7,.78) calc(100% - 76vh), rgba(2,10,7,.64) calc(100% - 60vh), rgba(2,10,7,.45) calc(100% - 44vh), rgba(2,10,7,.26) calc(100% - 28vh), rgba(2,10,7,.1) calc(100% - 13vh), rgba(2,10,7,0) 100%)";

function Head({ index, label, title, text, note }: { index: string; label: string; title: string; text?: string; note?: string }) {
  return (
    <header className="grid max-w-[860px] justify-items-start gap-[18px]">
      <span data-fade>
        <ChapterLabel index={index} dark>
          {label}
        </ChapterLabel>
      </span>
      <h2 data-chars className={H2}>
        {title}
      </h2>
      {text && (
        <p data-fade className="max-w-[40em] text-[18px] leading-[1.45] text-off-white/70 max-[900px]:text-base">
          {text}
        </p>
      )}
      {note && (
        <p data-fade className="font-narrow text-[11px] uppercase tracking-[0.08em] text-off-white/45">
          {note}
        </p>
      )}
    </header>
  );
}

function Chip({ mark, strong, rest }: { mark?: boolean; strong: string; rest?: string }) {
  return (
    <span className="inline-flex items-stretch gap-[3px] font-narrow text-[11px] font-medium uppercase tracking-[0.08em]">
      {mark && (
        <span className="grid w-[26px] place-items-center bg-green-400 text-green-950" aria-hidden>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
            <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" />
          </svg>
        </span>
      )}
      <span className="flex items-center gap-2.5 bg-off-white px-2.5 pb-[5px] pt-1.5 text-ink">
        <strong className="font-medium">{strong}</strong>
        {rest && <span className="text-green-700">{rest}</span>}
      </span>
    </span>
  );
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { project: p, projects } = await load(locale as Locale, slug);
  if (!p) notFound();
  const tc = await getTranslations({ locale, namespace: "workPage.case" });
  const tcat = await getTranslations({ locale, namespace: "workPage.categories" });
  const tcta = await getTranslations({ locale, namespace: "cta" });
  const tp = await getTranslations({ locale, namespace: "process" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const closing = tcta("title");
  const cut = closing.lastIndexOf(",");

  const i = Math.max(0, projects.findIndex((x) => x.slug === p.slug));
  const index = String(i + 1).padStart(2, "0");
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = i < projects.length - 1 ? projects[i + 1] : null;
  const [tagA, ...tagRest] = p.tag.split(" · ");
  const shape = p.shape === "landscape" ? "screen" : "portrait";
  const labels = { close: tc("close"), previous: tc("previousScreen"), next: tc("nextScreen"), comingSoon: tc("comingSoon") };
  const facts = [{ value: p.result.value, label: p.result.label }, ...p.stats];
  const host = p.url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const pad = (k: number) => String(k).padStart(2, "0");
  const base = p.phone ? 3 : 2;
  const order = { screens: pad(1), phone: pad(2), delivered: pad(base), journey: pad(base + 1), system: pad(base + 2) };
  const intro = (delay: number) => ({ style: { animationDelay: `${delay}s` } });

  return (
    <div data-wave-scope className="relative isolate bg-[#020a07] text-off-white" style={{ clipPath: "inset(0)" }}>
      <JsonLd data={breadcrumbJsonLd(locale, [{ name: tn("home"), path: "/" }, { name: tn("work"), path: "/work" }, { name: p.title, path: `/work/${p.slug}` }])} />
      <CaseBackdrop />
      {/* data-case-tint: CaseBackdrop reads where it ends to know how bright the space looks behind the header */}
      <div data-case-tint="" className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[calc(100%-55svh)]" style={{ background: TINT }} aria-hidden />

      <CaseMotion className="relative z-[2]">
        {/* hero: bottom-aligned title block over the space, then the meta row */}
        <section data-theme="dark" className="case-hero relative flex min-h-[92svh] items-end [text-shadow:0_1px_14px_rgba(0,0,0,.55)] max-[900px]:block max-[900px]:min-h-0">
          <div className="hidden h-[46svh] max-[900px]:block" aria-hidden />
          <div className={`${WRAP} grid gap-10 pb-[clamp(48px,9vh,96px)] pt-[120px] max-[900px]:gap-7 max-[900px]:pt-2`}>
            <div>
              <span {...intro(0)} className={`${styles.introIn} inline-block`}>
                <ChapterLabel index={index} dark>
                  {tc("selectedWork")}
                </ChapterLabel>
              </span>
              <h1 data-chars="intro" className="-ml-[0.06em] mt-5 max-w-[9em] text-[clamp(56px,8.4vw,140px)] font-normal leading-[0.95] tracking-[-0.045em]">
                {p.title}
              </h1>
              <p {...intro(0.4)} className={`${styles.introIn} mt-[22px] max-w-[34em] text-[18px] leading-[1.45] text-off-white/85 max-[900px]:text-base`}>
                {p.blurb}
              </p>
              <div {...intro(0.55)} className={`${styles.introIn} mt-[22px] flex flex-wrap gap-2`}>
                <Chip mark strong={tagA} rest={tagRest.join(" · ") || undefined} />
                {p.placeholder ? <Chip strong={tc("sample")} rest={tc("inPreparation")} /> : null}
                {!p.placeholder && p.url && (
                  <span className="inline-flex items-center gap-2 px-2 pb-[5px] pt-1.5 font-narrow text-[11px] font-medium uppercase tracking-[0.08em] shadow-[inset_0_0_0_1px_currentColor]">
                    <span className="h-1.5 w-1.5 bg-green-400 shadow-[0_0_10px_#22c55e]" aria-hidden />
                    {tc("live")}
                  </span>
                )}
              </div>
            </div>
            <dl {...intro(0.7)} className={`${styles.introIn} m-0 grid grid-cols-4 gap-x-6 gap-y-3.5 max-[900px]:grid-cols-2`}>
              {[
                [tc("client"), p.client],
                [tc("where"), p.place ?? "—"],
                [tc("when"), p.meta.period || p.year],
                [tc("part"), p.meta.role],
              ].map(([k, v]) => (
                <div key={k} className="grid content-start gap-0.5 border-t border-white/[0.16] pt-2.5">
                  <dt className="font-narrow text-[11px] font-medium uppercase tracking-[0.08em] text-off-white/50">{k}</dt>
                  <dd className="m-0 text-[15px]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* overview: the long intro left, the facts and the live link right */}
        <section data-theme="dark" className={SECTION}>
          <div className={`${WRAP} grid items-start gap-[clamp(32px,5vw,80px)] min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]`}>
            <p data-fade className="text-[clamp(24px,2.3vw,36px)] leading-[1.25] tracking-[-0.02em]">
              {p.summary}
            </p>
            <div data-fade className="grid gap-8">
              <StatTiles stats={facts} variant="facts" dark />
              {p.url && host && (
                <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 bg-off-white px-[18px] py-4 text-ink shadow-[inset_0_0_0_1px_#d9dce1] transition-colors duration-300 hover:bg-green-500 hover:text-white">
                  <span>{tc("visit", { host })}</span>
                  <Arrow className="-rotate-45" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* the device in 3D, scrubbed by scroll (only cases that have one) */}
        {p.device && clips[p.device.clip].enabled && <DeviceScrub clip={clips[p.device.clip]} label={p.device.label} title={p.device.title} text={p.device.text} beats={p.device.beats} marks={p.device.marks} />}

        {/* 01 screens: the device pinned mid-screen while the captions scroll past it */}
        <section data-theme="dark" className={SECTION}>
          <div className={`${WRAP} grid gap-[clamp(32px,5vh,56px)]`}>
            <Head index={order.screens} label={tc("screens")} title={tc("screensTitle")} text={p.meta.scope} note={p.placeholder ? tc("sampleScreens") : undefined} />
            <PinnedScreens screens={p.screens} items={p.screens.map((s) => s.caption)} shape={shape} heading={tc("screens")} caption={p.placeholder ? tc("sampleScreens") : tc("recorded")} labels={labels} open={tc("open")} />
          </div>
        </section>

        {/* 02 mobile: wide composites of the app screens, opened in the viewer */}
        {p.phone && (
          <section data-theme="dark" className={SECTION}>
            <div className={`${WRAP} grid gap-[clamp(32px,5vh,56px)]`}>
              <Head index={order.phone} label={tc("app")} title={p.phone.title} text={p.phone.text} />
              <div data-fade>
                <ScreenGrid screens={p.phone.screens} shape="wide" cols={2} labels={labels} open={tc("open")} />
              </div>
            </div>
          </section>
        )}

        {/* delivered: Puture's .case-list, two numbered columns */}
        <section data-theme="dark" className={SECTION}>
          <div className={`${WRAP} grid gap-[clamp(32px,5vh,56px)]`}>
            <Head index={order.delivered} label={tc("deliveredLabel")} title={tc("deliveredTitle")} />
            <ol data-fade className={`${styles.counted} m-0 grid list-none grid-cols-2 gap-x-8 p-0 text-[17px] leading-[1.45] max-[900px]:grid-cols-1`}>
              {p.delivered.map((d) => (
                <li key={d} className="grid grid-cols-[34px_minmax(0,1fr)] border-t border-white/15 py-3.5">
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* journey: Puture's system flow, one stage per step */}
        <section data-theme="dark" className={SECTION}>
          <div className={`${WRAP} grid gap-[clamp(32px,5vh,56px)]`}>
            <Head index={order.journey} label={tc("journeyLabel")} title={tc("journeyTitle")} />
            <div data-fade>
              <JourneyFlow steps={p.journey} />
            </div>
          </div>
        </section>

        {/* system: key engineering in two numbered columns, then the stack as line tags */}
        <section data-theme="dark" className={SECTION}>
          <div className={`${WRAP} grid gap-[clamp(32px,5vh,56px)]`}>
            <Head index={order.system} label={tc("systemLabel")} title={tc("systemTitle")} />
            <ol data-fade className={`${styles.counted} m-0 grid list-none grid-cols-2 gap-x-8 p-0 max-[900px]:grid-cols-1`}>
              {p.engineering.map((e) => (
                <li key={e.title} className="grid grid-cols-[34px_minmax(0,1fr)] border-t border-white/15 py-3.5">
                  <div>
                    <p className="text-[17px] text-off-white">{e.title}</p>
                    <p className="mt-1 text-[15px] leading-[1.45] text-off-white/65">{e.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul data-fade aria-label={tc("stack")} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {[tcat(p.category), ...p.meta.stack].map((s, k) => (
                <li key={s} className={`px-2 pb-[5px] pt-1.5 font-narrow text-[11px] font-medium uppercase leading-none tracking-[0.08em] ${k === 0 ? "bg-green-500 text-white" : "shadow-[inset_0_0_0_1px_currentColor]"}`}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* next project hand-off */}
        <section data-theme="dark" className="relative pb-[clamp(64px,12vh,120px)] pt-[clamp(96px,14vh,160px)]">
          <div className={WRAP}>
            <CasePager
              label={tc("more")}
              comingSoon={tc("comingSoon")}
              cards={[
                // with two projects the previous one is also the next one: lead back to the archive instead of repeating it
                next && next.slug === prev.slug
                  ? { dir: "previous", href: "/work", label: tc("archiveName"), meta: tc("archiveMeta"), name: tc("archiveName"), section: tc("archiveName") }
                  : { dir: "previous", href: `/work/${prev.slug}`, label: tc("previous"), meta: `${String(projects.indexOf(prev) + 1).padStart(2, "0")} · ${prev.client}`, name: prev.title, project: prev },
                next
                  ? { dir: "next", href: `/work/${next.slug}`, label: tc("next"), meta: `${String(i + 2).padStart(2, "0")} · ${next.client}`, name: next.title, project: next }
                  : { dir: "next", href: "/#process", label: tc("nextSection"), meta: `${CHAPTER_INDEX.process} · ${tp("eyebrow")}`, name: tp("title"), section: tp("eyebrow") },
              ]}
            />
          </div>
        </section>
      </CaseMotion>

      {/* Puture's case-page close ("Your next experience, with PUTURE."): a two-tone line bottom-left over the space's
          "foot" frame (picked once this section reaches mid-screen, like Puture's contact), then the footer.
          Header theme: when that frame makes the space behind the logo bright enough for ink type (CaseBackdrop reads it
          back, tint included), the header turns light — an invisible themed marker that only shows while CaseBackdrop
          sets html[data-scene-top=light]; it starts half a screen above this section, where the header line is when the
          section can first reach mid-screen. */}
      <section data-theme="dark" data-case-foot className="relative z-[2] flex min-h-[64svh] items-end pb-[clamp(72px,12vh,140px)] text-off-white">
        <div aria-hidden data-theme="light" className="pointer-events-none absolute inset-x-0 -top-[50svh] bottom-0 hidden [html[data-scene-top=light]_&]:block" />
        <div className={WRAP}>
          <h2 className="h1-sm max-w-[14em] [text-shadow:0_1px_18px_rgba(0,0,0,.45)]">
            {cut > 0 ? (
              <>
                <span className="block">{closing.slice(0, cut + 1)}</span>
                <span className="block text-off-white/55">{closing.slice(cut + 1).trim()}</span>
              </>
            ) : (
              closing
            )}
          </h2>
          <div className="mt-8">
            <ContactButton>{tcta("button")}</ContactButton>
          </div>
        </div>
      </section>
      <WaveLinks landing={false} header />
    </div>
  );
}
