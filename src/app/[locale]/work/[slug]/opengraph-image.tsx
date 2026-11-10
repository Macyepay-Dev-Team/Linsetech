import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { projects as localProjects } from "@/content/work";
import { getProject } from "@/sanity/data";
import { localizeProject } from "@/components/sections/work/localize";
import { site } from "@/content/site";
import { OG_SIZE, OG_TYPE, ogCard, ogTitleSize } from "@/lib/og";
import { toLocale } from "@/lib/seo";

export const alt = site.name;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => localProjects.map((p) => ({ locale, slug: p.slug })));
}

/** A case study's share card: the project's title, its tag above it. */
export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const loc = toLocale(locale);
  const t = await getTranslations({ locale: loc, namespace: "workPage" });
  const over = t.has("content") ? (t.raw("content") as Record<string, unknown>) : null;
  const p = await getProject(loc, slug);
  const project = p ? localizeProject(p, over) : undefined;
  const title = project?.title ?? site.name;
  return ogCard({ title, eyebrow: project?.tag, size: ogTitleSize(title) });
}
