import { getTranslations } from "next-intl/server";
import { site } from "@/content/site";
import { OG_SIZE, OG_TYPE, ogCard } from "@/lib/og";
import { toLocale } from "@/lib/seo";

/** Pages swap in a localized, descriptive alt (src/lib/seo.ts → pageMetadata). */
export const alt = site.name;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

/** Default share card for every page of a locale: the site title on the brand card (src/lib/og.tsx). */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "seo" });
  return ogCard({ title: t("ogTitle") });
}
