import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import SmoothScroll from "@/components/layout/SmoothScroll";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import ContactDialog from "@/components/layout/ContactDialog";
import PageTransition from "@/components/layout/PageTransition";
import Preloader from "@/components/layout/Preloader";
import CookieBanner from "@/components/layout/CookieBanner";
import { ContactProvider } from "@/components/layout/ContactContext";
import LightBackdrop from "@/components/backdrop/LightBackdrop";
import { site } from "@/content/site";
import { JsonLd, OG_LOCALE, SITE_URL, THEME_COLOR, TITLE_TEMPLATE, organizationJsonLd, toLocale, websiteJsonLd } from "@/lib/seo";
import "../globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const archivoNarrow = Archivo_Narrow({ subsets: ["latin"], variable: "--font-archivo-narrow", display: "swap" });

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

/** Runs as the body is parsed, before anything paints: is this the visit's first full load (Preloader.tsx)? */
const PRELOAD_STATE = `(function(){var h=document.documentElement,s="fresh";try{if(sessionStorage.getItem("linse-pre"))s="seen"}catch(e){}h.setAttribute("data-pre",s)})()`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: THEME_COLOR };

/**
 * Site-wide defaults. Pages add their canonical URL, hreflang alternates and Open Graph fields (src/lib/seo.ts).
 * Icons come from the file conventions in src/app (icon.svg, apple-icon.png, favicon.ico), the share image from
 * ./opengraph-image.tsx; Twitter gets the large card and Next fills it from each page's Open Graph fields.
 */
export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  // any first path segment reaches this segment (/foo.txt → "foo.txt"); the layout 404s those, but metadata runs
  // alongside it and Intl throws on a non-locale, so resolve to a supported one first
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: TITLE_TEMPLATE },
    description: t("description"),
    applicationName: site.name,
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: OG_LOCALE[locale],
      title: { default: t("title"), template: TITLE_TEMPLATE },
      description: t("description"),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [tSeo, tMeta] = await Promise.all([getTranslations({ locale, namespace: "seo" }), getTranslations({ locale, namespace: "meta" })]);

  return (
    <html lang={locale} data-nav="dark" suppressHydrationWarning className={`${archivo.variable} ${archivoNarrow.variable} h-full overflow-x-clip antialiased`}>
      <body className="min-h-full flex flex-col">
        <script id="pre-state" dangerouslySetInnerHTML={{ __html: PRELOAD_STATE }} />
        <JsonLd data={organizationJsonLd(tMeta("description"))} />
        <JsonLd data={websiteJsonLd(locale, tMeta("description"))} />
        <NextIntlClientProvider>
          <ContactProvider>
            <SmoothScroll />
            <Preloader />
            {/* skip link: off-screen until it takes focus (first Tab), then jumps past the header to <main> */}
            <a
              href="#main"
              className="eyebrow fixed left-[clamp(16px,2.5vw,40px)] top-3 z-[200] -translate-y-[200%] bg-green-400 px-4 py-3 text-green-950 transition-transform duration-200 focus:translate-y-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-green-400 motion-reduce:transition-none"
            >
              {tSeo("skipToContent")}
            </a>
            <Nav />
            <LightBackdrop />
            <main id="main" className="relative z-[1] flex-1">{children}</main>
            <Footer />
            <ContactDialog />
            <PageTransition />
            <CookieBanner />
          </ContactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
