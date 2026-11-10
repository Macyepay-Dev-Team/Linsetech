import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { services as localServices } from "@/content/services";
import { getService } from "@/sanity/data";
import { serviceCopy } from "@/components/sections/services/copy";
import { site } from "@/content/site";
import { OG_SIZE, OG_TYPE, ogCard, ogTitleSize } from "@/lib/og";
import { toLocale } from "@/lib/seo";

export const alt = site.name;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => localServices.map((s) => ({ locale, slug: s.slug })));
}

/** A service's share card: its headline, the service name above it. */
export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const loc = toLocale(locale);
  const [s, t] = await Promise.all([getService(loc, slug), getTranslations({ locale: loc, namespace: "servicesPage" })]);
  if (!s) return ogCard({ title: site.name });
  const c = serviceCopy(t, s);
  return ogCard({ title: c.headline, eyebrow: c.title, size: ogTitleSize(c.headline) });
}
