"use client";
import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { Project } from "@/content/work";
import type { TileChipState } from "@/components/three/WorkSpace";
import { ButtonLink } from "@/components/ui/Button";
import WhenNear from "@/components/media/WhenNear";
import { cn } from "@/lib/cn";
import { CHAPTER_INDEX, workPacing } from "./WorkPacing";
import { ChapterLabel, REVEAL } from "./work/chapterParts";
import ExhibitCursor, { type ExhibitHover } from "./work/ExhibitCursor";
import TileChip from "./work/TileChip";
import WorkAward, { type AwardFact } from "./work/WorkAward";
import { useBeatChars } from "./work/beatMotion";

export { ChapterLabel, REVEAL } from "./work/chapterParts";

const WorkFloor = dynamic(() => import("@/components/three/WorkFloor"), { ssr: false });

type Props = {
  projects: Project[];
  /** chapter label for the HUD */
  chapter?: string;
  dark?: boolean;
  /** extra "See all work" stop at the end */
  tail?: { label: string; href: string };
  className?: string;
  /** kept for callers: the home teaser and /work now share Puture's pacing */
  compact?: boolean;
  /** "dark": after the fold the scene ramps to the dark opening frame of the Process chapter (default on the teaser) */
  handoff?: "dark" | "none";
  /** "award": Puture's opening beat (headline + glass box) before project 1; on by default for the home teaser (the one with a tail) */
  opening?: "award" | "none";
};

/**
 * Puture's Work chapter (02 WORK on theirs): a pinned floor the camera walks along. It opens on the award beat (5.2
 * screens, then 2.4 of travel), then one framed project panel after another, each held four screens with its copy
 * left (one screen of travel between), and the pull-back over the whole floor. The canvas stays aligned with the
 * viewport while the section enters and (with the dark hand-off) leaves, so the space is revealed in place rather than
 * scrolling in as a block. Panels hover and click like Puture's: the exhibit cursor rides the pointer and a click leaves
 * through the pixel wave; icon tiles show a "NN | Name" chip.
 */
export default function WorkChapter({ projects, chapter = "work", dark = false, tail, className, compact = false, handoff = compact ? "dark" : "none", opening = tail ? "award" : "none" }: Props) {
  const t = useTranslations("work");
  const tc = useTranslations("chapters");
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const screens = useRef(0);
  const toDark = handoff === "dark";
  const pacing = useMemo(() => workPacing(projects.length, !!tail, compact, toDark), [projects.length, tail, compact, toDark]);
  // shared with the scene, which writes them every frame
  const hover = useMemo<ExhibitHover>(() => ({ index: -1, amount: 0 }), []);
  const chip = useMemo<TileChipState>(() => ({ index: -1, x: 0, y: 0, show: 0 }), []);
  const tiles = useMemo(() => (t.has("tiles") ? (t.raw("tiles") as string[]) : []), [t]);
  const flagship = projects.find((p) => p.featured) ?? projects[0];
  const award =
    opening === "award" && t.has("award.headline")
      ? { headline: t("award.headline"), kicker: t("award.kicker"), explainer: t("award.explainer"), facts: t.raw("award.facts") as AwardFact[], cta: t("award.cta") }
      : null;

  useBeatChars(root, award?.headline);

  useGSAP(
    () => {
      const el = root.current!;
      const beats = el.querySelectorAll<HTMLElement>("[data-in]");
      const apply = (progress: number) => {
        const s = progress * pacing.total;
        screens.current = s;
        beats.forEach((b) => {
          const from = Number(b.dataset.in);
          const to = Number(b.dataset.out);
          b.classList.toggle("is-in", s >= from && s < to);
          b.classList.toggle("is-past", s >= to);
        });
      };
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
      apply(trigger.progress);

      // Keep the canvas aligned with the viewport while the frame is not pinned (clipped by the frame): entering, the
      // previous chapter scrolls off over a space that stays in place (Puture has one fixed canvas); leaving into the
      // dark hand-off, the next chapter, which opens on the same frame, reveals pixel-identical content.
      if (stage.current) {
        const frame = stage.current.parentElement!;
        const align = () => {
          const top = frame.getBoundingClientRect().top;
          const vh = window.innerHeight;
          // only while the frame is on screen: a refresh further up the page used to park the shifted canvas over the
          // viewport, and Safari drew it there (a light plate over the Stack and the banner) when it failed to clip it
          const shift = (top > 0 && top < vh) || (top < 0 && top > -vh && toDark) ? -top : 0;
          stage.current!.style.transform = shift ? `translate3d(0, ${shift.toFixed(1)}px, 0)` : "";
          // entering, the frame's top edge would cut the space off from the page above in a hard line: it fades in over
          // up to 35 % of the screen instead, shrinking to nothing as the frame reaches the top and pins
          const fade = top > 0 && top < vh ? Math.min(top, vh * 0.35) : 0;
          const mask = fade > 1 ? `linear-gradient(to bottom, transparent 0, #000 ${fade.toFixed(0)}px)` : "";
          frame.style.maskImage = mask;
          frame.style.webkitMaskImage = mask;
        };
        ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onUpdate: align, onRefresh: align, onLeave: align, onEnterBack: align, onLeaveBack: align });
        align();
      }
    },
    { scope: root, dependencies: [pacing, toDark] },
  );

  const cards = useMemo(() => projects.map((p) => ({ slug: p.slug, title: p.title, cover: p.cover, shape: p.shape, accent: p.accent, model: p.model })), [projects]);

  return (
    <section
      ref={root}
      id={chapter}
      data-theme={dark ? "dark" : "light"}
      data-chapter={chapter}
      // the light variant has no background of its own: the frame covers the screen once pinned, and while it enters,
      // its faded top edge shows the page backdrop behind it (as the section above does), not a flat plate
      className={cn("relative", dark ? "bg-[#020a07] text-off-white" : "text-ink", className)}
      style={{ height: `${(pacing.total + 1) * 100}svh` }}
    >
      {/* header theme: the floor turns night during the dark hand-off, through a bright saturated green; from 70 % of
          the way into it (measured at 1.05 of 1.5 screens: where the space behind the logo drops under ~0.19 luminance,
          so white type has the better contrast) the header uses its dark theme (an invisible themed marker — the header
          follows the innermost themed element under it) */}
      {toDark && <div aria-hidden data-theme="dark" className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: `${(pacing.fold.at + (pacing.end - pacing.fold.at) * 0.7) * 100}svh` }} />}
      {/* clip-path as well as overflow: Safari let the shifted (composited) stage escape an overflow clip alone */}
      <div className="sticky top-0 h-svh overflow-hidden [clip-path:inset(0)]">
        <div ref={stage} className="absolute inset-0 will-change-transform">
          {/* built once the page has settled (or when the chapter is 1.5 screens away), not on arrival: creating the
              canvas and compiling its shaders on load stalled the hero intro for over a second in Safari */}
          <WhenNear className="absolute inset-0" margin="150% 0px" idle={3500}>
            <WorkFloor cards={cards} pacing={pacing} screensRef={screens} dark={dark} handoff={toDark} hover={hover} chip={chip} className="absolute inset-0" />
          </WhenNear>
        </div>

        {/* the opening beat: Puture's work-award */}
        {award && flagship && (
          <WorkAward
            beat={pacing.award}
            index={CHAPTER_INDEX.work}
            label={tc("work")}
            headline={award.headline}
            kicker={award.kicker}
            explainer={award.explainer}
            facts={award.facts}
            cta={
              <ButtonLink href={`/work/${flagship.slug}`} variant="light">
                {award.cta}
              </ButtonLink>
            }
          />
        )}

        {/* project copy: left, vertically centred (bottom-aligned on phones, above the panel) */}
        {projects.map((p, i) => (
          <div key={p.slug} className="pointer-events-none absolute inset-0 flex items-center max-md:items-end max-md:pb-[calc(132px+env(safe-area-inset-bottom))]">
            <article
              data-in={pacing.cards[i].in}
              data-out={pacing.cards[i].out}
              className={cn(REVEAL, "grid justify-items-start gap-4 max-md:mx-[clamp(1rem,4vw,4rem)] max-md:w-auto max-md:gap-3 md:ml-[max(clamp(1rem,4vw,4rem),5vw)] md:w-[min(400px,28vw)] md:max-lg:w-[24vw]")}
            >
              <div className="flex flex-wrap gap-2">
                <ChapterLabel index={String(i + 1).padStart(2, "0")} dark={dark}>
                  {p.client}
                </ChapterLabel>
                <span className="inline-flex gap-[3px] font-narrow text-[11px] font-medium uppercase tracking-[0.08em]">
                  <span className="grid w-[26px] place-items-center bg-green-400 text-green-950" aria-hidden>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" />
                    </svg>
                  </span>
                  <span className={cn("flex items-center px-[10px] py-[6px]", dark ? "bg-off-white text-ink" : "bg-ink text-off-white")}>{p.tag}</span>
                </span>
              </div>
              <h3 className="text-[clamp(36px,4vw,64px)] font-normal leading-none tracking-[-0.04em] max-md:text-[32px]">{p.title}</h3>
              <p className={cn("text-base max-md:text-sm", dark ? "text-off-white/75" : "text-ink/75")}>{p.blurb}</p>
              <p className={cn("font-narrow text-xs uppercase tracking-[0.08em]", dark ? "text-off-white/55" : "text-ink/55")}>
                {p.client} · {p.year}
              </p>
              <Link
                href={`/work/${p.slug}` as never}
                className={cn("relative border-b border-green-500 pb-0.5 font-narrow text-[13px] uppercase tracking-[0.08em] transition-colors after:absolute after:-inset-x-2 after:-inset-y-2.5 hover:text-green-600", dark && "hover:text-green-300")}
              >
                {t("view")} →
              </Link>
            </article>
          </div>
        ))}

        {/* the pull-back: everything lies back down, and the way to the archive shows */}
        {tail && (
          <div className="pointer-events-none absolute inset-0 flex items-center max-md:items-end max-md:pb-[calc(132px+env(safe-area-inset-bottom))]">
            <div data-in={pacing.fold.in} data-out={pacing.fold.out} className={cn(REVEAL, "grid justify-items-start gap-5 max-md:mx-[clamp(1rem,4vw,4rem)] md:ml-[max(clamp(1rem,4vw,4rem),5vw)]")}>
              {/* the chapter's own number: "04" (after projects 01–03) read as out of order before Process's "03" */}
              <ChapterLabel index={CHAPTER_INDEX.work} dark={dark}>
                {t("eyebrow")}
              </ChapterLabel>
              <ButtonLink href={tail.href} variant={dark ? "light" : "primary"}>
                {tail.label}
              </ButtonLink>
            </div>
          </div>
        )}

        {/* Puture's hover helpers (fixed; the frame has no transform, so fixed means the viewport) */}
        <ExhibitCursor label={t("view")} hover={hover} />
        {tiles.length > 0 && <TileChip state={chip} names={tiles} />}
      </div>
    </section>
  );
}
