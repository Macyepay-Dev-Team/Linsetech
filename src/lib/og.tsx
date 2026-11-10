import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOGO_PATHS } from "@/components/ui/Logo";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/seo";

/** Share-card size and type, used by every opengraph-image route. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

/**
 * Archivo (the site's typeface; this local file is the SemiBold cut, with every glyph the three locales need). If it
 * cannot be read — e.g. a deployment that does not ship it — the card falls back to next/og's built-in sans.
 */
const archivo = readFile(join(process.cwd(), "src/app/fonts/Archivo-SemiBold.ttf")).catch(() => null);

const OFF_WHITE = "#f3f3f3";

function Mark({ width, color }: { width: number; color: string }) {
  return (
    <svg viewBox="0 0 640 552" width={width} height={Math.round((width * 552) / 640)} fill={color}>
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The brand's share card: night-green field with the green glow, the LS mark and "Linse", an optional eyebrow (the
 * page's section, e.g. a case study's tag) above the title, and the site's host under it.
 */
export async function ogCard({ title, eyebrow, size = 74 }: { title: string; eyebrow?: string; size?: number }) {
  const font = await archivo;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          padding: "72px 80px",
          backgroundColor: "#020a07",
          backgroundImage: "radial-gradient(ellipse 80% 70% at 85% 120%, rgba(34,197,94,0.42), rgba(34,197,94,0) 70%), linear-gradient(135deg, #020a07 0%, #04150f 45%, #0b3d24 100%)",
          color: OFF_WHITE,
          ...(font ? { fontFamily: "Archivo" } : {}),
        }}
      >
        <div style={{ position: "absolute", right: -130, bottom: -150, display: "flex" }}>
          <Mark width={720} color="rgba(243, 243, 243, 0.06)" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Mark width={72} color={OFF_WHITE} />
          <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: -1.6 }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {eyebrow && <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: "#22c55e" }}>{eyebrow}</div>}
          <div style={{ maxWidth: 980, fontSize: size, fontWeight: 600, lineHeight: 1.06, letterSpacing: -2.4, textWrap: "balance" }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, letterSpacing: 1.8, textTransform: "uppercase", color: "rgba(243, 243, 243, 0.62)" }}>
            <div style={{ width: 10, height: 10, backgroundColor: "#22c55e" }} />
            {new URL(SITE_URL).host}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(font ? { fonts: [{ name: "Archivo", data: font, weight: 600, style: "normal" }] } : {}) },
  );
}

/** Long titles get a smaller size so they stay on three lines. */
export const ogTitleSize = (title: string) => (title.length > 70 ? 54 : title.length > 44 ? 62 : 74);
