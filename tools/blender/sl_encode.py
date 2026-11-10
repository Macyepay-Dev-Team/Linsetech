"""
sl_encode.py — encode the Sharplink-recreation clips (sl_<clip>.py) into web deliverables in web/public/clips/.
A copy of about_encode.py's approach (Blender's own FFmpeg through the video sequencer; the system ffmpeg is broken).
Shared by the clip agents: add your clip to SPEC (read this file fresh before editing).

    Blender -b -P sl_encode.py -- <name>     # <name>_chrome.webm (VP9 + alpha), <name>_4444.mov, <name>_poster.png, <name>_sheet.jpg
    then: hevc_alpha/hevc_alpha ../../public/clips/<name>_4444.mov ../../public/clips/<name>_safari.mp4 <gop> 0.8   (HEVC + alpha)
          rm ../../public/clips/<name>_4444.mov

Frames are read from out/<name>/frames/<name>_####.png (straight-alpha RGBA, display-referred sRGB).
"""
import os, sys, glob, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NAME = argv[0] if argv else "sl_press"
# crf: Blender FFmpeg quality preset (LOSSLESS, PERC_LOSSLESS, HIGH, MEDIUM, LOW, VERYLOW, LOWEST); gop <= 15
SPEC = {
    "sl_press": dict(w=1600, h=1200, fps=30, n=150, gop=15, crf="MEDIUM", poster_frame=1),  # 5 s seamless loop
    "sl_coins": dict(w=1350, h=720, fps=30, n=90, gop=15, crf="MEDIUM", poster_frame=1),    # 3 s, plays once, holds the last frame
    "sl_coin_careers": dict(w=1600, h=1200, fps=30, n=201, gop=15, crf="MEDIUM", poster_frame=1),  # 6.7 s seamless loop (Careers hero)
    "sl_coin_support": dict(w=1600, h=1200, fps=30, n=201, gop=15, crf="MEDIUM", poster_frame=1),  # 6.7 s seamless loop (Support hero)
    "sl_chain": dict(w=1600, h=1200, fps=30, n=202, gop=15, crf="MEDIUM", poster_frame=1),         # 6.73 s seamless loop (About hero)
    "sl_sphere": dict(w=800, h=800, fps=30, n=300, gop=15, crf="MEDIUM", poster_frame=1),        # 10 s seamless loop (breakthrough sphere)
    "sl_watch": dict(w=800, h=800, fps=30, n=150, gop=15, crf="MEDIUM", poster_frame=1),         # 5 s seamless loop (supercycle watch)
    "opportunity": dict(w=1200, h=1600, fps=30, n=261, gop=15, crf="MEDIUM", poster_frame=1),    # 8.7 s seamless loop (home services, opportunity.py)
    "pos_till": dict(w=1440, h=1260, fps=30, n=300, gop=15, crf="MEDIUM", poster_frame=300),    # 10 s, scroll-scrubbed (the Linse POS terminal, pos.py ANIM=1)
}[NAME]
FRAMES = sorted(glob.glob(os.path.join(OUT, NAME, "frames", f"{NAME}_*.png")))
assert len(FRAMES) == SPEC["n"], f"expected {SPEC['n']} frames, found {len(FRAMES)}"
CRF = os.environ.get("CRF", SPEC["crf"])
os.makedirs(CLIPS, exist_ok=True)

scene = reset_scene()
r = scene.render
r.resolution_x, r.resolution_y, r.resolution_percentage = SPEC["w"], SPEC["h"], 100
r.fps, r.fps_base = SPEC["fps"], 1.0
scene.frame_start, scene.frame_end = 1, SPEC["n"]
r.film_transparent = True
scene.view_settings.view_transform = "Standard"  # frames are display-referred sRGB already: pass them through
scene.sequencer_colorspace_settings.name = "sRGB"
se = scene.sequence_editor_create()
strip = se.strips.new_image(NAME, FRAMES[0], 1, 1)
for p in FRAMES[1:]:
    strip.elements.append(os.path.basename(p))
strip.frame_final_duration = SPEC["n"]
strip.alpha_mode = "STRAIGHT"
strip.blend_type = "ALPHA_OVER"


def encode(filename, fmt, codec, color_mode, crf="MEDIUM", gop=None, prores=None):
    ims = r.image_settings
    ims.media_type = "VIDEO"
    ims.file_format = "FFMPEG"
    ff = r.ffmpeg
    ff.format, ff.codec = fmt, codec
    if prores:
        ff.ffmpeg_prores_profile = prores  # the RGBA option only exists once the profile supports alpha
    else:
        ff.constant_rate_factor = crf
        ff.ffmpeg_preset = "GOOD"
    ims.color_mode = color_mode
    if gop is not None:
        ff.gopsize = gop
        ff.max_b_frames = 0
        ff.use_max_b_frames = True
    ff.audio_codec = "NONE"
    out = os.path.join(CLIPS, filename)
    stem = os.path.join(CLIPS, "_tmp_" + os.path.splitext(filename)[0])  # Blender appends the frame range
    r.filepath = stem
    t0 = time.time()
    bpy.ops.render.render(animation=True)
    produced = glob.glob(stem + "*")
    assert produced, "no movie produced"
    if os.path.exists(out):
        os.remove(out)
    os.rename(produced[0], out)
    log(f"{filename}: {os.path.getsize(out) / 1e6:.2f} MB in {time.time() - t0:.0f}s")
    return out


encode(f"{NAME}_chrome.webm", "WEBM", "WEBM", "RGBA", crf=CRF, gop=SPEC["gop"])  # VP9 with alpha
encode(f"{NAME}_4444.mov", "QUICKTIME", "PRORES", "RGBA", prores="4444")         # master for HEVC + alpha

# poster (first frame, full size, straight alpha) + 12-frame review sheet over a neutral grey
px = load_pixels(os.path.join(OUT, NAME, "frames", f"{NAME}_{SPEC['poster_frame']:04d}.png"))
save_pixels(os.path.join(CLIPS, f"{NAME}_poster.png"), px, alpha=True)
contact_sheet([FRAMES[i - 1] for i in preview_frames(SPEC["n"])], os.path.join(CLIPS, f"{NAME}_sheet.jpg"), cols=4,
              cell_w=400, checker=("#2a2f36",))
log("done", NAME)
