"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { easings, greens, gradients, palette, ratio, squareUnits, typeScale } from "@/content/brand";

/**
 * The /brand page's blocks, in the company pages' language (co-dash rules, narrow eyebrows, 24/32px titles) so they sit
 * inside RailSection. Strings come from the page (namespace `brandPage`); tokens from src/content/brand.ts.
 */

const H3 = "text-[24px] font-medium leading-[1.4] tracking-[-0.24px] min-[800px]:text-[32px] min-[800px]:leading-[1.16] min-[800px]:tracking-[-0.32px]";
const TEXT = "text-[16px] font-medium leading-[1.35] text-[var(--c-sub)]";
const LEAD = "mb-[56px] max-w-[680px] text-[16px] font-medium leading-[1.35] text-[var(--c-sub)] min-[800px]:text-[19px]";

export function Lead({ children }: { children: ReactNode }) {
  return <p className={LEAD}>{children}</p>;
}

/** Title + text cells under a dashed rule, 1 / 2 / 3 columns. */
export function Cells({ items, cols = 3 }: { items: { id: string; title: string; text: string; visual?: ReactNode }[]; cols?: 2 | 3 | 4 }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-y-7 min-[800px]:gap-x-[28px]", cols === 2 && "min-[800px]:grid-cols-2", cols === 3 && "min-[800px]:grid-cols-3", cols === 4 && "min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4")}>
      {items.map((it) => (
        <li key={it.id} className="co-dash flex flex-col pt-7">
          {it.visual}
          <h3 className={H3}>{it.title}</h3>
          <p className={cn(TEXT, "mt-3")}>{it.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function Plate({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative mb-6 aspect-square w-full overflow-hidden", className)} style={{ background: PLATE_BG }}>
      <Image src={src} alt={alt} fill sizes="(min-width: 800px) 30vw, 90vw" className="object-contain p-[10%]" />
    </div>
  );
}

const PLATE_BG = "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(34,197,94,.28), rgba(34,197,94,0) 70%), #020a07";
const CARD_BG = "radial-gradient(ellipse 90% 70% at 70% 120%, rgba(34,197,94,.45), rgba(34,197,94,0) 70%), #020a07";

const TILE_BG: Record<string, string> = { night: "bg-[#020a07] text-off-white", light: "bg-[#f7f9f7] text-ink", green: "bg-[#22c55e] text-[#020a07]", mark: "bg-[#020a07] text-[#22c55e]" };

export function LogoTiles({ labels }: { labels: Record<"night" | "light" | "green" | "mark", string> }) {
  return (
    <ul className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-2 min-[800px]:gap-[28px]">
      {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
        <li key={k}>
          <div className={cn("flex aspect-[16/10] items-center justify-center border border-[var(--c-stroke)]", TILE_BG[k])}>
            {k === "mark" ? <LogoMark className="h-[38%] w-auto" /> : <Logo className="text-[clamp(28px,3.4vw,48px)]" />}
          </div>
          <p className="eyebrow mt-3 text-[var(--c-sub)]">{labels[k]}</p>
        </li>
      ))}
    </ul>
  );
}

export function Donts({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <ul className="grid grid-cols-1 min-[800px]:grid-cols-3 min-[800px]:gap-x-[28px]">
        {items.map((d) => (
          <li key={d} className="co-dash flex items-center gap-3 py-5 text-[16px] font-medium leading-[1.35]">
            <span className="relative block h-3 w-3 shrink-0" aria-hidden>
              <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 rotate-45 bg-[#ef4444]" />
              <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 -rotate-45 bg-[#ef4444]" />
            </span>
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function Copy({ value, label, done, className }: { value: string; label: string; done: string; className?: string }) {
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
      className={cn("eyebrow transition-opacity hover:opacity-70", className)}
      aria-label={`${label} ${value}`}
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

export function Swatches({ names, copy, copied }: { names: Record<string, { name: string; role: string }>; copy: string; copied: string }) {
  return (
    <ul className="grid grid-cols-2 gap-4 min-[800px]:grid-cols-3 min-[800px]:gap-[28px]">
      {palette.map((c) => (
        <li key={c.id}>
          <div className={cn("flex aspect-[4/3] flex-col justify-between border border-[var(--c-stroke)] p-4", c.text === "light" ? "text-off-white" : "text-ink")} style={{ background: c.hex }}>
            <span className="text-[19px] font-medium leading-[1.2]">{names[c.id].name}</span>
            <span className="flex items-end justify-between">
              <span className="eyebrow">{c.hex}</span>
              <Copy value={c.hex} label={copy} done={copied} />
            </span>
          </div>
          <p className="mt-3 text-[14px] font-medium leading-[1.35]">{names[c.id].role}</p>
          <p className="eyebrow mt-1 text-[var(--c-sub)]">RGB {rgb(c.hex)}</p>
        </li>
      ))}
    </ul>
  );
}

export function GreenScale({ title }: { title: string }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <ul className="grid grid-cols-11">
        {greens.map(([k, hex]) => (
          <li key={k} className="flex flex-col">
            <span className="block h-[72px] min-[800px]:h-[96px]" style={{ background: hex }} />
            <span className="eyebrow mt-2 text-[10px] text-[var(--c-sub)] min-[800px]:text-[12px]">{k}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Gradients({ title, labels }: { title: string; labels: Record<string, string> }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <ul className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-3 min-[800px]:gap-[28px]">
        {gradients.map((g) => (
          <li key={g.id}>
            <span className="block h-[140px] border border-[var(--c-stroke)]" style={{ background: g.css }} />
            <p className="mt-3 text-[14px] font-medium">{labels[g.id]}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Ratio({ title, labels, note }: { title: string; labels: Record<string, string>; note: string }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <div className="flex h-[56px] border border-[var(--c-stroke)]">
        {ratio.map((r) => (
          <span key={r.id} className={cn("flex items-end p-2", r.id === "night" ? "text-off-white" : "text-ink")} style={{ width: `${r.share}%`, background: r.hex }}>
            <span className="eyebrow whitespace-nowrap text-[10px] min-[800px]:text-[12px]">{r.share} %</span>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-6">
        {ratio.map((r) => (
          <span key={r.id} className="eyebrow text-[var(--c-sub)]">{`${r.share} % ${labels[r.id]}`}</span>
        ))}
      </div>
      <p className={cn(TEXT, "mt-7 max-w-[680px]")}>{note}</p>
    </div>
  );
}

export function TypeSpecimen({ sample, narrow, weights, scaleTitle, scale, note }: { sample: string; narrow: string; weights: string; scaleTitle: string; scale: Record<string, string>; note: string }) {
  return (
    <div>
      <p className="font-sans text-[clamp(44px,6.4vw,104px)] font-medium leading-[1.0] tracking-[-0.025em]">{sample}</p>
      <p className="eyebrow mt-5 text-[var(--c-sub)]">Archivo · {weights}</p>
      <p className="mt-[56px] font-narrow text-[clamp(22px,2.6vw,40px)] font-medium uppercase tracking-[0.06em]">{narrow}</p>
      <p className="eyebrow mt-5 text-[var(--c-sub)]">Archivo Narrow · Medium 500</p>
      <p className="eyebrow mb-4 mt-[56px] text-[var(--c-sub)]">{scaleTitle}</p>
      <ul>
        {typeScale.map((s) => (
          <li key={s.id} className="co-dash grid grid-cols-[96px_1fr] items-baseline gap-4 py-5 min-[800px]:grid-cols-[180px_160px_1fr]">
            <span className="text-[14px] font-medium">{scale[s.id]}</span>
            <span className="eyebrow hidden text-[var(--c-sub)] min-[800px]:block">{`${s.size} / ${s.mobile} px · ${s.leading}`}</span>
            <span
              className={cn("truncate", s.font === "narrow" ? "font-narrow uppercase" : "font-sans")}
              style={{ fontSize: `clamp(${s.mobile * 0.6}px, ${(s.size / 1440) * 100 * 0.62}vw, ${Math.min(s.size, 64)}px)`, fontWeight: s.weight, lineHeight: s.leading, letterSpacing: `${s.tracking}em` }}
            >
              {sample}
            </span>
          </li>
        ))}
      </ul>
      <p className={cn(TEXT, "mt-7 max-w-[680px]")}>{note}</p>
    </div>
  );
}

function Unit({ kind }: { kind: (typeof squareUnits)[number] }) {
  const box = "relative aspect-square w-full";
  if (kind === "solid") return <span className={cn(box, "block bg-[#22c55e]")} />;
  if (kind === "layered")
    return (
      <span className={cn(box, "block")}>
        <span className="absolute inset-[18%_0_0_18%] bg-[#0b3d2e]" />
        <span className="absolute inset-[9%_9%_9%_9%] bg-[#15803d]" />
        <span className="absolute inset-[0_18%_18%_0] bg-[#22c55e]" />
      </span>
    );
  if (kind === "outline") return <span className={cn(box, "block border-[2px] border-dashed border-[#22c55e]")} />;
  if (kind === "grid")
    return (
      <span className={cn(box, "grid grid-cols-4 gap-[6%]")}>
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className={cn("block", i % 5 === 0 ? "bg-[#22c55e]" : "bg-[#22c55e]/25")} />
        ))}
      </span>
    );
  return (
    <span className={cn(box, "block bg-[#020a07]")}>
      <Image src={kind === "glass" ? "/brand/brand_glass_v3.webp" : "/brand/brand_chrome.webp"} alt="" fill sizes="20vw" className="object-contain p-[8%]" />
    </span>
  );
}

export function SquareUnits({ labels }: { labels: Record<string, string> }) {
  return (
    <ul className="mb-[56px] grid grid-cols-3 gap-4 min-[800px]:grid-cols-6 min-[800px]:gap-[28px]">
      {squareUnits.map((u) => (
        <li key={u}>
          <Unit kind={u} />
          <p className="eyebrow mt-3 text-[var(--c-sub)]">{labels[u]}</p>
        </li>
      ))}
    </ul>
  );
}

/** One track per easing: a green square crosses it with that curve; "Replay" runs them again. */
export function MotionDemo({ labels, replay }: { labels: Record<string, string>; replay: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setOn(true), 400);
    return () => window.clearTimeout(id);
  }, []);
  const again = () => {
    setOn(false);
    window.setTimeout(() => setOn(true), 60);
  };
  return (
    <div>
      <ul>
        {easings.map((e) => (
          <li key={e.id} className="co-dash py-6">
            <p className="mb-4 text-[14px] font-medium">{labels[e.id]}</p>
            <div className="relative h-6">
              <span
                className="absolute left-0 top-0 block h-6 w-6 bg-[#22c55e] motion-reduce:!transition-none"
                style={{ transform: on ? "translateX(calc(min(640px, 70vw) - 24px))" : "translateX(0)", transition: on ? `transform ${e.ms}ms ${e.css}` : "none" } as CSSProperties}
              />
            </div>
            <p className="eyebrow mt-3 text-[var(--c-sub)]">{`${e.css} · ${e.ms} ms`}</p>
          </li>
        ))}
      </ul>
      <button type="button" onClick={again} className="ui-btn ui-btn--secondary mt-7">
        <span className="ui-btn__content">
          <span>{replay}</span>
          <span>{replay}</span>
        </span>
      </button>
    </div>
  );
}

export function VoicePairs({ doTitle, dontTitle, pairs }: { doTitle: string; dontTitle: string; pairs: { do: string; dont: string }[] }) {
  return (
    <ul className="mt-[56px]">
      {pairs.map((p) => (
        <li key={p.do} className="co-dash grid grid-cols-1 gap-4 py-6 min-[800px]:grid-cols-2 min-[800px]:gap-[28px]">
          <p className="text-[16px] font-medium leading-[1.35] min-[800px]:text-[19px]">
            <span className="eyebrow mr-3 text-[#15803d]">{doTitle}</span>
            {p.do}
          </p>
          <p className="text-[16px] font-medium leading-[1.35] text-[var(--c-sub)] line-through decoration-[#ef4444]/60 min-[800px]:text-[19px]">
            <span className="eyebrow mr-3 text-[#ef4444] no-underline">{dontTitle}</span>
            {p.dont}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SocialMocks({ title, sizes, alt }: { title: string; sizes: string; alt: string }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <ul className="grid grid-cols-2 gap-4 min-[800px]:gap-[28px]">
        {["night", "light"].map((k) => (
          <li key={k} className="relative aspect-[4/5] overflow-hidden border border-[var(--c-stroke)] shadow-[0_40px_80px_-40px_rgba(6,40,31,.45)]">
            <Image src={`/brand/app_social_${k}_v3.webp`} alt={alt} fill sizes="(min-width: 800px) 34vw, 46vw" className="object-cover" />
          </li>
        ))}
      </ul>
      <p className="eyebrow mt-4 text-[var(--c-sub)]">{sizes}</p>
    </div>
  );
}

export function BusinessCard({ title, name, role, email, phone }: { title: string; name: string; role: string; email: string; phone: string }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[800px]:gap-[28px]">
        <div className="relative flex aspect-[85/55] items-center justify-center overflow-hidden text-off-white shadow-[0_40px_80px_-40px_rgba(6,40,31,.55)]" style={{ background: CARD_BG }}>
          <Logo className="text-[clamp(22px,2.4vw,34px)]" />
        </div>
        <div className="relative flex aspect-[85/55] flex-col justify-between bg-[#fbfdf9] p-[7%] text-ink shadow-[0_40px_80px_-40px_rgba(6,40,31,.35)]">
          <div>
            <p className="text-[clamp(16px,1.6vw,22px)] font-semibold tracking-[-0.01em]">{name}</p>
            <p className="eyebrow mt-1 text-[#15803d]">{role}</p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-[clamp(11px,1vw,14px)] font-medium leading-[1.5] text-[var(--black-subtle)]">
              {email}
              <br />
              {phone}
              <br />
              linsetech.com
            </p>
            <LogoMark className="h-[clamp(18px,2vw,28px)] w-auto text-[#22c55e]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmailSignature({ title, name, role, line, email, phone }: { title: string; name: string; role: string; line: string; email: string; phone: string }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <div className="max-w-[560px] border border-[var(--c-stroke)] bg-white p-6 text-ink">
        <div className="flex items-start gap-4">
          <LogoMark className="mt-1 h-7 w-auto text-ink" />
          <div className="border-l border-dashed border-black/20 pl-4">
            <p className="text-[15px] font-semibold">{name}</p>
            <p className="text-[13px] font-medium text-[#15803d]">{role} · Linse</p>
            <p className="mt-2 text-[13px] font-medium text-[var(--black-subtle)]">{line}</p>
            <p className="mt-2 text-[13px] font-medium text-[var(--black-subtle)]">
              {email} · {phone} · linsetech.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeviceShot({ title }: { title: string }) {
  return (
    <div className="mt-[56px]">
      <p className="eyebrow mb-4 text-[var(--c-sub)]">{title}</p>
      <div className="relative aspect-[8/7] w-full overflow-hidden" style={{ background: CARD_BG }}>
        <Image src="/brand/app_pos_v2.webp" alt={title} fill sizes="(min-width: 800px) 70vw, 100vw" className="object-contain p-[4%]" />
      </div>
    </div>
  );
}
