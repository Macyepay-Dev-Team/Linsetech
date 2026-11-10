import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHero from "@/components/sections/PageHero";
import HeroWrapper from "@/components/sections/company/HeroWrapper";
import RailLayout from "@/components/sections/company/RailLayout";
import RailSection from "@/components/sections/company/RailSection";
import DocList from "@/components/sections/company/DocList";
import { ActButton } from "@/components/sections/company/actions";
import { ArrowDown } from "@/components/sections/company/icons";
import BrandHeroVisual from "@/components/sections/brand/BrandHeroVisual";
import {
  BusinessCard,
  Cells,
  DeviceShot,
  Donts,
  EmailSignature,
  Gradients,
  GreenScale,
  Lead,
  LogoTiles,
  MotionDemo,
  Plate,
  Ratio,
  SocialMocks,
  SquareUnits,
  Swatches,
  TypeSpecimen,
  VoicePairs,
} from "@/components/sections/brand/BrandBlocks";
import { brandDownloads, materials, voice } from "@/content/brand";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brandPage.meta" });
  return pageMetadata({ locale, path: "/brand", title: t("title"), description: t("description") }, parent);
}

/**
 * /brand — the brand guidelines (docs/content/02-brand-identity.md, approved 10 Nov 2026), on the company pages' rail:
 * idea → logo → colour → materials (dark) → type → graphic language → motion → voice → applications → downloads (light).
 */
export default async function BrandPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brandPage");

  const ids = ["idea", "logo", "colour", "materials", "type", "graphic", "motion", "voice", "applications", "downloads"] as const;
  const rail = ids.map((id) => ({ id, label: t(`rail.${id}`) }));

  return (
    <>
      <HeroWrapper>
        <PageHero title={t("hero.title")} sub={t("hero.lead")} visual={<BrandHeroVisual alt={t("materials.combined")} />} overlay="none" gradientHeight="120%">
          <ActButton action={{ kind: "href", href: "/brand/linse-logo-pack.zip" }} icon={<ArrowDown />}>
            {t("hero.cta")}
          </ActButton>
        </PageHero>
      </HeroWrapper>

      <RailLayout items={rail} label={t("rail.label")}>
        <RailSection id="idea" kind="press" title={t("idea.title")}>
          <Lead>{t("idea.lead")}</Lead>
          <Cells
            items={(["night", "metal", "glass"] as const).map((k) => ({
              id: k,
              title: t(`idea.items.${k}.title`),
              text: t(`idea.items.${k}.text`),
              visual:
                k === "night" ? (
                  <span className="mb-6 block aspect-square w-full bg-[linear-gradient(180deg,#020a07_0%,#04150f_28%,#0b3d2e_58%,#1f8f5a_82%,#cdefd9_100%)]" aria-hidden />
                ) : (
                  <Plate src={k === "metal" ? materials[0].image : materials[1].image} alt="" />
                ),
            }))}
          />
          <p className="mt-[56px] max-w-[680px] text-[19px] font-medium leading-[1.35] min-[800px]:text-[24px] min-[800px]:leading-[1.3]">{t("idea.together")}</p>
        </RailSection>

        <RailSection id="logo" kind="black" title={t("logo.title")}>
          <Lead>{t("logo.lead")}</Lead>
          <LogoTiles labels={{ night: t("logo.tiles.night"), light: t("logo.tiles.light"), green: t("logo.tiles.green"), mark: t("logo.tiles.mark") }} />
          <div className="mt-[56px]">
            <Cells items={(["space", "size", "legal"] as const).map((k) => ({ id: k, title: t(`logo.rules.${k}.title`), text: t(`logo.rules.${k}.text`) }))} />
          </div>
          <Donts title={t("logo.dontsTitle")} items={t.raw("logo.donts") as string[]} />
        </RailSection>

        <RailSection id="colour" kind="black" title={t("colour.title")}>
          <Lead>{t("colour.lead")}</Lead>
          <Swatches names={t.raw("colour.swatches") as Record<string, { name: string; role: string }>} copy={t("colour.copy")} copied={t("colour.copied")} />
          <GreenScale title={t("colour.scale")} />
          <Gradients title={t("colour.gradientsTitle")} labels={t.raw("colour.gradients") as Record<string, string>} />
          <Ratio title={t("colour.ratioTitle")} labels={t.raw("colour.ratio") as Record<string, string>} note={t("colour.a11y")} />
        </RailSection>

        <RailSection id="materials" kind="documents" title={t("materials.title")}>
          <Lead>{t("materials.lead")}</Lead>
          <Cells
            cols={2}
            items={materials.map((m) => ({ id: m.id, title: t(`materials.items.${m.id}.title`), text: t(`materials.items.${m.id}.text`), visual: <Plate src={m.image} alt={t(`materials.items.${m.id}.title`)} /> }))}
          />
          <p className="mt-[56px] max-w-[680px] text-[19px] font-medium leading-[1.35] min-[800px]:text-[24px] min-[800px]:leading-[1.3]">{t("materials.combined")}</p>
          <p className="eyebrow mt-5 text-[var(--c-sub)]">{t("materials.grain")}</p>
        </RailSection>

        <RailSection id="type" kind="light" title={t("type.title")}>
          <Lead>{t("type.lead")}</Lead>
          <TypeSpecimen sample={t("type.sample")} narrow={t("type.narrowSample")} weights={t("type.weights")} scaleTitle={t("type.scaleTitle")} scale={t.raw("type.scale") as Record<string, string>} note={t("type.note")} />
        </RailSection>

        <RailSection id="graphic" kind="light" title={t("graphic.title")}>
          <Lead>{t("graphic.lead")}</Lead>
          <SquareUnits labels={t.raw("graphic.units") as Record<string, string>} />
          <Cells cols={4} items={(["dashed", "marker", "index", "icons"] as const).map((k) => ({ id: k, title: t(`graphic.elements.${k}.title`), text: t(`graphic.elements.${k}.text`) }))} />
        </RailSection>

        <RailSection id="motion" kind="light" title={t("motion.title")}>
          <Lead>{t("motion.lead")}</Lead>
          <MotionDemo labels={t.raw("motion.items") as Record<string, string>} replay={t("motion.replay")} />
        </RailSection>

        <RailSection id="voice" kind="light" title={t("voice.title")}>
          <Lead>{t("voice.lead")}</Lead>
          <Cells cols={4} items={voice.map((k) => ({ id: k, title: t(`voice.items.${k}.title`), text: t(`voice.items.${k}.text`) }))} />
          <VoicePairs doTitle={t("voice.doTitle")} dontTitle={t("voice.dontTitle")} pairs={t.raw("voice.pairs") as { do: string; dont: string }[]} />
        </RailSection>

        <RailSection id="applications" kind="light" title={t("applications.title")}>
          <Lead>{t("applications.lead")}</Lead>
          <SocialMocks title={t("applications.social")} sizes={t("applications.sizes")} alt={t("applications.social")} />
          <DeviceShot title={t("applications.device")} />
          <BusinessCard title={t("applications.card")} name={t("applications.name")} role={t("applications.role")} email={site.email} phone={site.phone} />
          <EmailSignature title={t("applications.signature")} name={t("applications.name")} role={t("applications.role")} line={t("applications.signatureLine")} email={site.email} phone={site.phone} />
        </RailSection>

        <RailSection id="downloads" kind="last" heading="small" title={t("downloads.title")}>
          <DocList items={brandDownloads.map((d) => ({ id: d.id, chip: d.type, title: t(`downloads.items.${d.id}`), file: { href: d.href ?? undefined, label: t("downloads.download"), soon: t("downloads.soon") } }))} />
          <p className="eyebrow mt-7 text-[var(--c-sub)]">{t("downloads.contact")}</p>
        </RailSection>
      </RailLayout>
    </>
  );
}
