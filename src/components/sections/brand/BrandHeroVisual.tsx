import Image from "next/image";

/** The glass + chrome LS mark (tools/blender/brand.py) in PageHero's fixed visual layer, framed like HeroFramedClip. */
export default function BrandHeroVisual({ alt }: { alt: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[58lvh] min-[800px]:inset-y-0 min-[800px]:left-auto min-[800px]:right-[4%] min-[800px]:h-full min-[800px]:w-[min(46vw,900px)]">
      <Image src="/brand/brand_hero.webp" alt={alt} fill priority sizes="(min-width: 800px) 46vw, 100vw" className="object-contain p-[6%]" />
    </div>
  );
}
