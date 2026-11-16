import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produce the minimal self-contained server copied into the production image.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  transpilePackages: ["three"],
  // static media (clips, gradients, covers, HDRI) are not content-hashed: a week of caching, revalidated in the background.
  // The covers live under /work/<slug>/, next to the /work routes: only files with an image extension match there (the
  // pages and their RSC payloads got the week too, so visitors kept an old build's /work after a deploy)
  async headers() {
    const media = "public, max-age=604800, stale-while-revalidate=86400";
    return ["/clips/:path*", "/bg/:path*", "/work/:slug/:file(.+\\.(?:jpg|jpeg|png|webp|avif|svg))", "/hdr/:path*", "/brand/:path*"].map((source) => ({ source, headers: [{ key: "Cache-Control", value: media }] }));
  },
  // app/global-not-found.tsx: branded 404 for URLs outside the [locale] tree
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      // Tailwind only on plain stylesheets: CSS modules must stay modules (Turbopack handles them natively)
      "*.css": {
        condition: { all: [{ not: "foreign" }, { not: { path: /\.module\.css$/ } }] },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
