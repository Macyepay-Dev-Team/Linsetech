"use client";
import { useRef, useState } from "react";
import ClipVideo from "@/components/media/ClipVideo";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { Clip } from "@/content/clips";
import { cn } from "@/lib/cn";

type Beat = { title: string; text: string };

/**
 * A case study's device in 3D (e.g. the Linse POS terminal, tools/blender/pos.py ANIM=1): the section is 4 screens
 * tall, its frame sticks to the window and the pre-rendered clip follows the scroll (ClipVideo scrub); the beats
 * underneath light up in turn, each from its mark (the clip progress where its moment starts; evenly spread if none).
 */
export default function DeviceScrub({ clip, label, title, text, beats, marks }: { clip: Clip; label: string; title: string; text: string; beats: Beat[]; marks?: number[] }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const last = useRef(0);

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progress.current = self.progress;
          const starts = marks ?? beats.map((_, k) => k / beats.length);
          let i = 0;
          while (i < starts.length - 1 && self.progress >= starts[i + 1]) i++;
          if (i !== last.current) {
            last.current = i;
            setActive(i);
          }
        },
      });
      return () => st.kill();
    },
    { scope: root, dependencies: [beats.length, marks?.join()] },
  );

  return (
    <section ref={root} data-theme="dark" className="relative h-[400svh]" aria-label={title}>
      <div className="sticky top-0 h-svh overflow-hidden [clip-path:inset(0)]">
        <div className="absolute inset-x-0 bottom-[26svh] top-[10svh] min-[900px]:bottom-0 min-[900px]:left-[30%] min-[900px]:top-0">
          <ClipVideo mode="scrub" progressRef={progress} webm={clip.webm} mp4={clip.mp4} poster={clip.poster} fit="contain" near="150% 0px" className="absolute inset-0" />
        </div>
        <div className="relative z-[1] grid h-full grid-rows-[auto_1fr_auto] px-[clamp(16px,2.5vw,40px)] pb-[clamp(24px,5vh,56px)] pt-[clamp(88px,14vh,140px)] min-[900px]:max-w-[36%]">
          <div>
            <p className="font-narrow text-[12px] font-medium uppercase tracking-[0.08em] text-green-400">{label}</p>
            <h2 className="mt-4 text-[clamp(32px,3.6vw,56px)] font-normal leading-[1.02] tracking-[-0.03em]">{title}</h2>
            <p className="mt-4 max-w-[30em] text-[16px] leading-[1.45] text-off-white/75 max-[900px]:hidden">{text}</p>
          </div>
          <div />
          <ol className="m-0 grid list-none gap-0 p-0">
            {beats.map((b, i) => (
              <li key={b.title} className={cn("grid grid-cols-[34px_minmax(0,1fr)] border-t py-3 transition-[opacity,border-color] duration-500", i === active ? "border-green-400 opacity-100" : "border-white/15 opacity-40")}>
                <span className="font-narrow text-[12px] tracking-[0.08em] text-off-white/60">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-[17px] leading-[1.3]">{b.title}</span>
                  <span className={cn("block overflow-hidden text-[14px] leading-[1.4] text-off-white/70 transition-[max-height] duration-500", i === active ? "max-h-[4em]" : "max-h-0")}>{b.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
