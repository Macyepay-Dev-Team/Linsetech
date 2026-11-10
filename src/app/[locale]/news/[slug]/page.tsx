import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import DashedLine from "@/components/ui/DashedLine";
import NewsletterStrip from "@/components/sections/pages/NewsletterStrip";
import ShareRail, { BackLink } from "@/components/sections/pages/ShareRail";
import ArticleBody from "@/components/sections/news/ArticleBody";
import DateBadge from "@/components/sections/news/DateBadge";
import { ArrowLeft } from "@/components/sections/news/Icons";
import NewsCover from "@/components/sections/news/NewsCover";
import ReadMore from "@/components/sections/news/ReadMore";
import RelatedArticles from "@/components/sections/news/RelatedArticles";
import { badgeDate, loadPost, loadPosts } from "@/components/sections/news/data";
import s from "@/components/sections/news/news-classes";
import { posts as localPosts } from "@/content/news";
import { cn } from "@/lib/cn";
import { JsonLd, breadcrumbJsonLd, newsArticleJsonLd, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => localPosts.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale, slug } = await params;
  const [p, t] = await Promise.all([loadPost(locale as Locale, slug), getTranslations({ locale, namespace: "newsPage" })]);
  if (!p) return {};
  return pageMetadata(
    {
      locale,
      path: `/news/${p.slug}`,
      title: p.title,
      description: p.excerpt,
      article: { publishedTime: p.date, authors: [p.author], section: t(`categories.${p.category}`) },
    },
    parent,
  );
}

/** Sharplink article grid: 1fr (date) · 3fr (title, body) · 1fr, inside the main column. */
const GRID = "grid gap-x-7 lg:grid-cols-[minmax(100px,1fr)_minmax(0,3fr)_minmax(0,1fr)]";

/**
 * /news/[slug], after sharplink.com/news/Announcement: light page; a sticky left rail ("← All articles" at the top,
 * Share / Download panels at the bottom of the viewport) behind a vertical dashed rule; date badge beside a 32px
 * title, the full-width cover, then the body in the centre column under a category eyebrow (nothing fades in).
 * Then previous / next, their related articles (three cards; a swipe carousel on phones) and the newsletter box.
 */
export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [p, all] = await Promise.all([loadPost(locale as Locale, slug), loadPosts(locale as Locale)]);
  if (!p) notFound();
  const [t, tn] = await Promise.all([getTranslations("newsPage"), getTranslations("nav")]);
  const tag = (c: string) => t(`cover.${c}`);

  const idx = all.findIndex((x) => x.slug === p.slug);
  const older = idx >= 0 ? all[idx + 1] : undefined;
  const newer = idx > 0 ? all[idx - 1] : undefined;
  const related = [...all.filter((x) => x.slug !== p.slug && x.category === p.category), ...all.filter((x) => x.slug !== p.slug && x.category !== p.category)].slice(0, 3);

  return (
    <div data-theme="light" className="relative z-[2] overflow-x-clip text-ink">
      <JsonLd
        data={breadcrumbJsonLd(locale, [{ name: tn("home"), path: "/" }, { name: tn("news"), path: "/news" }, { name: p.title, path: `/news/${p.slug}` }])}
      />
      <JsonLd
        data={newsArticleJsonLd({
          locale,
          path: `/news/${p.slug}`,
          headline: p.title,
          description: p.excerpt,
          datePublished: p.date,
          author: p.author,
          section: t(`categories.${p.category}`),
        })}
      />
      <style>{"@media print{header,footer,[data-print-hide]{display:none!important}main{padding:0!important}}"}</style>
      <div className="relative flex px-[clamp(16px,2.5vw,40px)]">
        {/* rail */}
        <aside className="relative hidden w-[clamp(170px,11.5vw,207px)] shrink-0 lg:block" data-print-hide>
          <div className="sticky top-0 flex h-[100lvh] flex-col pb-7 pt-[130px]">
            <BackLink />
            <ShareRail title={p.title} pdf={p.pdf} className="mt-auto" />
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 pt-[clamp(118px,9vw,150px)] lg:ml-7 lg:pl-7">
          <DashedLine direction="vertical" className="left-0 hidden lg:block" />
          <BackLink className="mb-8 lg:hidden" />

          <header className={GRID}>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
              <DateBadge theme="light">{badgeDate(locale, p.date)}</DateBadge>
              <DateBadge theme="light">{t("article.minRead", { min: p.readTime })}</DateBadge>
            </div>
            <div className="mt-5 lg:mt-0">
              <h1 className="text-[clamp(26px,2.2vw,32px)] font-medium leading-[1.16] tracking-[-0.01em] [text-wrap:balance]">{p.title}</h1>
            </div>
            <div className="mt-8 lg:col-span-3 lg:mt-14">
              <NewsCover title={p.title} category={p.category} tag={tag(p.category)} ratio="1121 / 630" />
            </div>
          </header>

          <div className={cn(GRID, "pt-14 lg:pt-[84px]")}>
            <article className="lg:col-start-2">
              <p className="flex items-center gap-3 font-narrow text-[13px] font-medium uppercase leading-[1.4] tracking-[0.08em] text-ink/55">
                <span className="block h-1 w-1 bg-green-400" aria-hidden />
                {t(`categories.${p.category}`)}
                <span className="text-ink/30">·</span>
                {t("article.by", { author: p.author })}
              </p>
              <div className="mt-6">
                <ArticleBody blocks={p.body} />
              </div>
              <ShareRail title={p.title} pdf={p.pdf} layout="inline" className="mt-14 lg:hidden" />
            </article>
          </div>

          {/* previous / next (card-featured-press language: 28px padding, tint on hover, dashed rules) */}
          {(older || newer) && (
            <nav className="relative mt-[clamp(72px,8vw,120px)] grid md:grid-cols-2" aria-label={`${t("article.prev")} / ${t("article.next")}`} data-print-hide>
              <DashedLine className="top-0" />
              <DashedLine className="bottom-0" />
              {[
                { p: older, label: t("article.prev"), dir: "prev" as const },
                { p: newer, label: t("article.next"), dir: "next" as const },
              ].map(({ p: x, label, dir }) =>
                x ? (
                  <Link key={dir} href={`/news/${x.slug}` as never} className={cn(s.row, "group relative flex flex-col p-7", dir === "next" && "md:items-end md:text-right")}>
                    {dir === "next" && <DashedLine direction="vertical" className="left-0 hidden md:block" />}
                    <span className="font-narrow text-[13px] font-medium uppercase tracking-[0.08em] text-ink/55">{label}</span>
                    <span className="mt-4 line-clamp-2 max-w-[34ch] text-[clamp(17px,1.25vw,19px)] font-medium leading-[1.35]">{x.title}</span>
                    <ReadMore label={t("readMore")} className="mt-5" icon={dir === "prev" ? <ArrowLeft className="h-[14px] w-[14px]" /> : undefined} />
                  </Link>
                ) : (
                  <span key={dir} className="hidden md:block" />
                ),
              )}
            </nav>
          )}

          {/* related (Sharplink BlogLatestArticles: three cards, a swipe carousel on phones) */}
          <RelatedArticles
            items={related.map((r) => ({ slug: r.slug, title: r.title, date: badgeDate(locale, r.date), category: r.category, tag: tag(r.category) }))}
            labels={{ title: t("article.related"), readMore: t("readMore"), prev: t("article.prevSlide"), next: t("article.nextSlide") }}
          />

          <div className="mt-[clamp(72px,8vw,120px)]" data-print-hide>
            <NewsletterStrip theme="light" />
          </div>
          <div className="h-[clamp(96px,10vw,150px)]" />
        </div>
      </div>
    </div>
  );
}
