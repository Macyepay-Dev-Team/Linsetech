import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { posts } from "@/content/news";
import { getPost } from "@/sanity/data";
import { site } from "@/content/site";
import { OG_SIZE, OG_TYPE, ogCard, ogTitleSize } from "@/lib/og";
import { toLocale } from "@/lib/seo";

export const alt = site.name;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => posts.map((p) => ({ locale, slug: p.slug })));
}

/** An article's share card: its title on the brand card, the category above it. */
export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const loc = toLocale(locale);
  const [post, t] = await Promise.all([getPost(loc, slug), getTranslations({ locale: loc, namespace: "newsPage" })]);
  const title = post?.title ?? site.name;
  const category = post && t.has(`categories.${post.category}`) ? t(`categories.${post.category}`) : undefined;
  return ogCard({ title, eyebrow: category, size: ogTitleSize(title) });
}
