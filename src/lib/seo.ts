import { createElement } from "react";
import type { Metadata, ResolvingMetadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { site } from "@/content/site";

/**
 * SEO helpers shared by the [locale] layout, the pages and the metadata routes (sitemap, robots, manifest, OG image).
 * Server-only: it reads translations and next-intl's server navigation.
 */

/** The e-mail domain in src/content/site.ts. The client still has to confirm the production domain. */
const DEFAULT_SITE_URL = "https://linsetech.com";

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).origin;
    } catch {
      // not a URL: use the default below
    }
  }
  return DEFAULT_SITE_URL;
}

/** Site origin without a trailing slash (`NEXT_PUBLIC_SITE_URL`, else linsetech.com). Feeds `metadataBase`. */
export const SITE_URL = siteOrigin();

/** Browser chrome / manifest colour: the top of the dark hero. */
export const THEME_COLOR = "#020a07";

export const TITLE_TEMPLATE = `%s — ${site.name}`;
export const brandTitle = (title: string) => TITLE_TEMPLATE.replace("%s", title);

/** og:locale per site locale (the English copy is British English). */
export const OG_LOCALE: Record<Locale, string> = { en: "en_GB", fr: "fr_FR", rw: "rw_RW" };

export const toLocale = (value: string): Locale => (hasLocale(routing.locales, value) ? value : routing.defaultLocale);

/** `path` as served in `locale`: routing uses `localePrefix: "as-needed"`, so the default locale has no prefix. */
export const localizedPath = (locale: Locale, path: string) => getPathname({ locale, href: path });

/** Absolute URL for a site path, written the way Next writes canonical links (the root has no trailing slash). */
export function absoluteUrl(path: string): string {
  const url = new URL(path, SITE_URL);
  return url.pathname === "/" && !url.search ? url.origin : url.href;
}

/**
 * hreflang map for a route: one URL per locale plus x-default, the unprefixed URL (where the proxy picks a language
 * for visitors without a preference, and serves English to crawlers).
 */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = absoluteUrl(localizedPath(locale, path));
  languages["x-default"] = absoluteUrl(localizedPath(routing.defaultLocale, path));
  return languages;
}

type PageSeo = {
  locale: string;
  /** route path without the locale prefix, e.g. "/services/design" */
  path: string;
  /** page title; the layout's template appends " — Linse" (except on the home page, which shares the layout's segment) */
  title: string;
  description?: string;
  /** news posts: og:type "article" with these properties */
  article?: { publishedTime: string; modifiedTime?: string; authors?: string[]; section?: string };
};

/**
 * Metadata for one page: title and description, canonical URL, hreflang alternates and the Open Graph fields.
 * A page-level `openGraph` replaces the layout's object as a whole (metadata merges shallowly), so the
 * [locale]/opengraph-image resolved by the parent is carried over here, with a localized alt text. Twitter inherits
 * the layout's summary_large_image card and Next fills its title, description and image from these Open Graph fields.
 */
export async function pageMetadata(page: PageSeo, parent: ResolvingMetadata): Promise<Metadata> {
  const locale = toLocale(page.locale);
  const url = absoluteUrl(localizedPath(locale, page.path));
  const [inherited, t] = await Promise.all([parent, getTranslations({ locale, namespace: "seo" })]);
  const alt = `${site.name} — ${t("ogTitle")}`;
  const images = (inherited.openGraph?.images ?? []).map((image) =>
    typeof image === "string" || image instanceof URL ? { url: image, alt } : { ...image, alt },
  );
  const openGraph = {
    url,
    siteName: site.name,
    locale: OG_LOCALE[locale],
    alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    title: page.title,
    ...(page.description ? { description: page.description } : {}),
    ...(images.length ? { images } : {}),
  };
  return {
    title: page.title,
    ...(page.description ? { description: page.description } : {}),
    alternates: { canonical: url, languages: languageAlternates(page.path) },
    openGraph: page.article ? { ...openGraph, type: "article", ...page.article } : { ...openGraph, type: "website" },
  };
}

/* ── JSON-LD ─────────────────────────────────────────────────────────────── */

/** JSON for a `<script type="application/ld+json">`, with `<` escaped as recommended by the Next JSON-LD guide. */
export const serializeJsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Renders structured data as a native script tag (JSON-LD is data, not code, so not next/script). */
export function JsonLd({ data }: { data: object }) {
  return createElement("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: serializeJsonLd(data) } });
}

const ORG_ID = `${SITE_URL}/#organization`;
const LOGO_URL = absoluteUrl("/apple-icon.png");

/** The company, from src/content/site.ts. */
export function organizationJsonLd(description?: string) {
  const [streetAddress, cityLine = ""] = site.address;
  const [addressLocality, addressCountry] = cityLine.split(",").map((s) => s.trim());
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: site.name,
    legalName: site.legalName,
    url: absoluteUrl("/"),
    logo: LOGO_URL,
    ...(description ? { description } : {}),
    email: site.email,
    telephone: site.phone,
    address: { "@type": "PostalAddress", streetAddress, addressLocality, addressCountry },
    contactPoint: [
      { "@type": "ContactPoint", contactType: "customer service", email: site.email, telephone: site.phone, availableLanguage: [...routing.locales] },
      { "@type": "ContactPoint", contactType: "technical support", email: site.supportEmail, telephone: site.phone, availableLanguage: [...routing.locales] },
    ],
    areaServed: { "@type": "Country", name: "Rwanda" },
    knowsLanguage: [...routing.locales],
    sameAs: site.social.map((s) => s.href),
  };
}

export function newsArticleJsonLd(post: {
  locale: string;
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  author: string;
  section?: string;
}) {
  const url = absoluteUrl(localizedPath(toLocale(post.locale), post.path));
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: post.headline,
    description: post.description,
    inLanguage: post.locale,
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    ...(post.section ? { articleSection: post.section } : {}),
    author: post.author === site.name ? { "@type": "Organization", "@id": ORG_ID, name: site.name, url: absoluteUrl("/") } : { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", "@id": ORG_ID, name: site.name, logo: { "@type": "ImageObject", url: LOGO_URL } },
  };
}

/** The site itself (one per locale), tied to the organization. */
export function websiteJsonLd(locale: string, description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: absoluteUrl(localizedPath(toLocale(locale), "/")),
    name: site.name,
    ...(description ? { description } : {}),
    inLanguage: locale,
    publisher: { "@id": ORG_ID },
  };
}

/** Breadcrumbs for an inner page: Home → … → the page (each item a localized absolute URL). */
export function breadcrumbJsonLd(locale: string, items: { name: string; path: string }[]) {
  const loc = toLocale(locale);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(localizedPath(loc, it.path)) })),
  };
}

/** One of our services, offered across Rwanda by the organization. */
export function serviceJsonLd(service: { locale: string; path: string; name: string; description: string; type?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    ...(service.type ? { serviceType: service.type } : {}),
    url: absoluteUrl(localizedPath(toLocale(service.locale), service.path)),
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "Rwanda" },
    availableLanguage: [...routing.locales],
  };
}

export function faqPageJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}
