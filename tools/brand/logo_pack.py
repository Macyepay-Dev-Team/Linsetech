"""Build the Linse logo pack: the LS mark and the mark + "Linse" lockups (wordmark outlined from Archivo SemiBold)."""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = "/Users/hugues/Documents/WORK/linsetech/web/src/app/fonts/Archivo-SemiBold.ttf"
OUT = sys.argv[1]
MARK = ["M320 0 L365.5 78.9 L140.8 468 L288.8 468 L241.5 550 L2.4 550 Z",
        "M393.3 127.8 L439.4 207.7 L363.9 338 L515.2 338 L637.6 550 L299.5 550 L346.8 468 L498.2 468 L470.5 420 L224.5 420 Z"]
COLORS = {"offwhite": "#F3F3F3", "ink": "#0B1411", "green": "#22C55E", "night": "#020A07"}

font = TTFont(FONT)
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font["head"].unitsPerEm
hmtx = font["hmtx"]

def word_path(text, size, tracking_em):
    """Outlined text: one SVG path, baseline at y=0, y down, starting at x=0. Returns (d, width)."""
    pen = SVGPathPen(gs)
    x = 0.0; s = size / upm
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (s, 0, 0, -s, x, 0))
        gs[g].draw(tp)
        x += hmtx[g][0] * s + (tracking_em * size if i < len(text) - 1 else 0)
    return pen.getCommands(), x

def mark_group(h, x, y):
    k = h / 552
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({k:.5f})">' + "".join(f'<path d="{d}"/>' for d in MARK) + "</g>"

def svg(w, h, body, fill):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" width="{w:.0f}" height="{h:.0f}"><g fill="{fill}">{body}</g></svg>\n'

os.makedirs(OUT, exist_ok=True)
# the site's lockup (ui/Logo.tsx): mark 1.35em tall, word 1.15em semibold, tracking -0.03em, gap 0.625em
EM = 100.0
mh = 1.35 * EM; mw = mh * 640 / 552
size = 1.15 * EM
d, ww = word_path("Linse", size, -0.03)
cap = font["OS/2"].sCapHeight * size / upm
pad = 0.25 * mh  # clear space: the L stem width ≈ a quarter of the mark height
for name, fill in COLORS.items():
    # mark alone
    open(f"{OUT}/linse-mark-{name}.svg", "w").write(svg(640 + 2 * 80, 552 + 2 * 80, mark_group(552, 80, 80), fill))
    # horizontal: mark, gap, word vertically centred on the mark
    gap = 0.625 * EM
    W = pad + mw + gap + ww + pad; H = pad + mh + pad
    base = pad + mh / 2 + cap / 2
    body = mark_group(mh, pad, pad) + f'<g transform="translate({pad + mw + gap:.2f} {base:.2f})"><path d="{d}"/></g>'
    open(f"{OUT}/linse-lockup-horizontal-{name}.svg", "w").write(svg(W, H, body, fill))
    # stacked: mark above the word, centred
    sm = 2.2 * EM; smw = sm * 640 / 552
    W2 = max(smw, ww) + 2 * pad; H2 = pad + sm + 0.45 * EM + cap + pad
    body2 = mark_group(sm, (W2 - smw) / 2, pad) + f'<g transform="translate({(W2 - ww) / 2:.2f} {pad + sm + 0.45 * EM + cap:.2f})"><path d="{d}"/></g>'
    open(f"{OUT}/linse-lockup-stacked-{name}.svg", "w").write(svg(W2, H2, body2, fill))
print("svgs written", OUT)
