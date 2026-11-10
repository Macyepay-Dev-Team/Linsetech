import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPosts, getProjects, getServices } from "@/sanity/data";
import { absoluteUrl, languageAlternates, localizedPath } from "@/lib/seo";

/** Every route of the [locale] tree (dynamic ones expanded below). */
const PAGES = ["/", "/about", "/services", "/work", "/news", "/careers", "/support", "/contact", "/brand", "/privacy", "/terms"];

/**
 * All routes in all three locales, each entry listing its language alternates (+ x-default). Slugs come from the
 * same data helpers as the pages (Sanity when configured, else src/content); they are shared by every locale.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects, posts] = await Promise.all([
    getServices(routing.defaultLocale),
    getProjects(routing.defaultLocale),
    getPosts(routing.defaultLocale),
  ]);
  const routes: { path: string; lastModified?: string }[] = [
    ...PAGES.map((path) => ({ path, lastModified: path === "/news" ? posts[0]?.date : undefined })),
    ...services.map((s) => ({ path: `/services/${s.slug}` })),
    ...projects.map((p) => ({ path: `/work/${p.slug}` })),
    ...posts.map((p) => ({ path: `/news/${p.slug}`, lastModified: p.date })),
  ];
  return routes.flatMap(({ path, lastModified }) => {
    const languages = languageAlternates(path);
    return routing.locales.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
