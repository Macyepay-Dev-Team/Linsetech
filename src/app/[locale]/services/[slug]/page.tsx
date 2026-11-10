import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import PageHero from "@/components/sections/PageHero";
import FAQ from "@/components/sections/FAQ";
import { ContactButton } from "@/components/sections/ContactButton";
import { ButtonLink } from "@/components/ui/Button";
import Statement from "@/components/sections/services/Statement";
import Transformation from "@/components/sections/services/Transformation";
import RelatedWork from "@/components/sections/services/RelatedWork";
import ServicePager from "@/components/sections/services/ServicePager";
import HeroFramedClip from "@/components/sections/services/HeroFramedClip";
import { serviceCopy } from "@/components/sections/services/copy";
import { services as localServices, ART_FOR, type Service } from "@/content/services";
import { clips, slClip, type Clip } from "@/content/clips";
import { getServices, getProjects } from "@/sanity/data";
import { localizeProjects } from "@/components/sections/work/localize";
import type { Locale } from "@/i18n/routing";
import { breadcrumbJsonLd, faqPageJsonLd, JsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * Each service's hero clip. The two full-frame machine clips fill the window like Sharplink's hero clips; the section-
 * sized clips (sphere, coins, watch, the machine assembly) are framed on the right instead of being stretched to cover.
 */
const HERO_CLIP: Partial<Record<Service["key"], Clip>> = { web: slClip("services_hero"), systems: slClip("sl_press") };
const HERO_FRAMED: Partial<Record<Service["key"], Clip & { loop?: boolean }>> = {
  design: slClip("sl_sphere"),
  software: { ...slClip("sl_coins"), loop: false },
  hardware: { webm: clips.stack.webm, mp4: clips.stack.mp4, poster: clips.stack.poster, loop: false },
  it: slClip("sl_watch"),
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => localServices.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale, slug } = await params;
  const [services, t] = await Promise.all([getServices(locale as Locale), getTranslations({ locale, namespace: "servicesPage" })]);
  const s = services.find((x) => x.slug === slug);
  if (!s) return {};
  const c = serviceCopy(t, s);
  // search titles and descriptions per service (docs/content/research/keywords.md), else the page's own title and intro
  const meta = t.has(`services.${s.key}.meta.title`) ? { title: t(`services.${s.key}.meta.title`), description: t(`services.${s.key}.meta.description`) } : { title: c.title, description: c.intro };
  return pageMetadata({ locale, path: `/services/${s.slug}`, ...meta }, parent);
}

/**
 * /services/<slug>: the /services language at page scale — hero (PageHero "opportunity", the service's clip, about
 * overlay, 130 % gradient) → scrolling-text intro (light) → what's included as numbered rows on black, entered through
 * the head's bottom gradient, with the service's figures as stat cards, left through a top gradient → related work and
 * the service FAQ on the light page → previous / next → footer. No CTA banner at the end.
 */
export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [services, all, t, tw] = await Promise.all([getServices(locale as Locale), getProjects(locale as Locale), getTranslations("servicesPage"), getTranslations("workPage")]);
  const projects = localizeProjects(all, tw.has("content") ? (tw.raw("content") as Record<string, unknown>) : null);
  const index = services.findIndex((x) => x.slug === slug);
  if (index < 0) notFound();
  const s = services[index];
  const c = serviceCopy(t, s);
  const total = services.length;
  const at = (i: number) => {
    const o = services[(i + total) % total];
    const oc = serviceCopy(t, o);
    return { slug: o.slug, title: oc.title, headline: oc.headline, index: (i + total) % total };
  };
  const art = ART_FOR[s.key];
  const related = projects
    .filter((p) => s.related.includes(p.slug))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      year: p.year,
      cover: p.cover,
      tag: t.has(`projects.${p.slug}.tag`) ? t(`projects.${p.slug}.tag`) : p.tag,
      blurb: t.has(`projects.${p.slug}.blurb`) ? t(`projects.${p.slug}.blurb`) : p.blurb,
    }));

  const tn = await getTranslations("nav");
  const path = `/services/${s.slug}`;

  return (
    <>
      <JsonLd data={serviceJsonLd({ locale, path, name: c.title, description: c.intro, type: c.title })} />
      <JsonLd data={breadcrumbJsonLd(locale, [{ name: tn("home"), path: "/" }, { name: tn("services"), path: "/services" }, { name: c.title, path }])} />
      {c.faqs.length > 0 && <JsonLd data={faqPageJsonLd(c.faqs)} />}
      <PageHero
        variant="opportunity"
        clip={HERO_CLIP[s.key]}
        visual={HERO_FRAMED[s.key] ? <HeroFramedClip clip={HERO_FRAMED[s.key]!} /> : undefined}
        overlay="about"
        gradientHeight="130%"
        eyebrow={t("sub.eyebrow", { n: String(index + 1).padStart(2, "0"), total: String(total).padStart(2, "0") })}
        title={c.title}
        sub={c.headline}
      >
        <ContactButton>{t("sub.talk")}</ContactButton>
        <ButtonLink href="/services" variant="secondary">
          {t("sub.allServices")}
        </ButtonLink>
      </PageHero>
      <Statement paragraphs={[c.intro, c.more].filter(Boolean)} z={3} />
      <Transformation
        title={t("sub.included")}
        blurb={t("sub.includedBlurb", { service: c.title })}
        body={[t("sub.includedBody")]}
        rows={c.bullets.map((b, i) => ({ title: b.title, text: [b.text], art: art[i] ?? "system" }))}
        stats={c.stats.map((x) => ({ eyebrow: x.label, headline: x.value, body: x.note }))}
        exit
      />
      <RelatedWork title={t("sub.related")} blurb={t("sub.relatedBlurb")} items={related} viewLabel={t("sub.viewCase")} />
      <FAQ eyebrow={t("faq.eyebrow")} title={t("faq.serviceTitle", { service: c.title })} items={c.faqs} />
      <ServicePager prev={at(index - 1)} next={at(index + 1)} total={total} labels={{ previous: t("sub.previous"), next: t("sub.next"), nav: t("sub.allServices") }} />
    </>
  );
}
