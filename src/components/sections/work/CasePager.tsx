import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Arrow } from "@/components/ui/Button";
import type { Project } from "@/content/work";
import { Device, ScreenImage } from "./Device";

type Card = { href: string; dir: "previous" | "next"; label: string; meta: string; name: string; project?: Project; section?: string };

function Cover({ project, section, comingSoon }: { project?: Project; section?: string; comingSoon: string }) {
  if (section)
    return (
      <span
        className="relative my-1 grid aspect-[16/10] w-full place-items-center bg-[#22c55e14] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] transition-[background-color,box-shadow] duration-[400ms] group-hover:bg-[#22c55e1f] group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "48px 48px", backgroundPosition: "50%" }}
      >
        <span className="text-[clamp(36px,6vw,88px)] leading-none tracking-[-0.04em] text-off-white">{section}</span>
      </span>
    );
  const p = project!;
  const portrait = p.shape !== "landscape";
  return (
    <span className="relative my-1 grid aspect-[16/10] w-full min-w-0 place-items-center overflow-hidden bg-white/[0.03] p-[clamp(14px,3vw,44px)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] transition-[background-color,box-shadow] duration-[400ms] group-hover:bg-[#22c55e1a] group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]">
      {/* sized by height in both shapes: a 16:10 screen sized by width is taller than the padded 16:10 plate, which then
          grew wider than its column and pushed the cover into the next card */}
      <span className="block h-full min-h-0 transition-[scale] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]">
        <Device shape={portrait ? "portrait" : "screen"} fit="height">
          <ScreenImage screen={{ src: p.cover, caption: p.title }} shape={portrait ? "portrait" : "screen"} index={0} sizes="(min-width:900px) 40vw, 50vw" label={comingSoon} />
        </Device>
      </span>
    </span>
  );
}

/**
 * Puture's `.case-pager`: previous / next project side by side (next aligned right), each "← PREVIOUS PROJECT",
 * its cover in a device on a 16:10 plate (plate tints the accent, device scales 1.03, arrow nudges 4px on hover),
 * "02 · client" and the name. The last project's "next" is a section card, like Puture's hand-off to Process:
 * ours leads back to the archive on /work.
 */
export default function CasePager({ cards, comingSoon, label }: { cards: Card[]; comingSoon: string; label: string }) {
  return (
    <nav aria-label={label} className="grid grid-cols-2 gap-[clamp(14px,3vw,40px)]" data-fade>
      {cards.map((c) => (
        <Link key={c.dir} href={c.href as never} className={cn("group grid min-w-0 content-start gap-3 text-off-white", c.dir === "next" ? "justify-items-end text-right" : "justify-items-start")}>
          <span className={cn("inline-flex items-center gap-2 font-narrow text-[12px] uppercase tracking-[0.08em] text-off-white/70 transition-colors duration-300 group-hover:text-off-white", c.dir === "next" && "flex-row-reverse")}>
            <Arrow className={cn("transition-[translate] duration-[400ms] ease-[cubic-bezier(.16,1,.3,1)]", c.dir === "previous" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
            {c.label}
          </span>
          <Cover project={c.project} section={c.section} comingSoon={comingSoon} />
          <span className="font-narrow text-[11px] uppercase tracking-[0.08em] text-off-white/60">{c.meta}</span>
          <strong className="text-[clamp(20px,3vw,44px)] font-normal leading-[1.05] tracking-[-0.035em]">{c.name}</strong>
        </Link>
      ))}
    </nav>
  );
}
