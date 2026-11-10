"""
brand.py — stills for the /brand page: the brand's two materials, chrome (hardware) and glass (software), together.
TRANSPARENT background, so they sit on the page's own gradients.

    Blender -b -P brand.py -- --preview            # hero at 25 %
    SHOT=chrome Blender -b -P brand.py             # one shot at full size -> out/brand/<shot>_0001.png

Shots:
- hero   (1600 x 1600): the LS mark in thick clear glass, standing in front of a frosted glass panel held by a chrome
         frame, a green glow behind the panel — "a metal body with a glass screen";
- chrome (900 x 900): the square unit in polished chrome;
- glass  (900 x 900): the square unit in frosted glass with the green glow inside.
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa

ARGS = parse_args()
SHOT = os.environ.get("SHOT", "hero")
W = H = 1600 if SHOT == "hero" else 900
OUT_DIR = os.path.join(OUT, "brand")
os.makedirs(OUT_DIR, exist_ok=True)

scene = reset_scene()
setup_render(scene, W, H, 30, 1, ARGS, samples=int(os.environ.get("SAMPLES", "96")), transparent=True, view="Standard", look=None)
setup_world(scene, strength=float(os.environ.get("HDR_STR", "0.55")), gradient=None, rotation=math.radians(float(os.environ.get("HDR_ROT", "35"))))
add_light(scene, "Key", (-7, -8, 9), (0, 0, 0), float(os.environ.get("KEY", "650")), 5, color=(0.92, 1.0, 0.95))
add_light(scene, "Rim", (8, 7, 6), (0, 0, 0), float(os.environ.get("RIM", "520")), 4, color=(0.45, 1.0, 0.62))
add_light(scene, "Back", (0.5, 7, -2.5), (0, 0, 0), float(os.environ.get("BACK", "380")), 3, color=(0.35, 1.0, 0.55))
add_light(scene, "Fill", (7, -10, -3), (0, 0, 0), 260, 7, color=(0.9, 1.0, 0.95)).data.use_shadow = False
add_light(scene, "Top", (-2, -6, 14), (0, 0, 0), float(os.environ.get("TOP", "380")), 10, color=(0.85, 1.0, 0.9)).data.use_shadow = False

chrome = mat_chrome("chrome", color=(0.88, 0.92, 0.90), rough=float(os.environ.get("CHROME_ROUGH", "0.10")), coat=0.7)
# clear glass, not frosted (owner, 10 Nov 2026): the panel almost invisible face-on, the mark a little denser at its edges
panel = mat_clear("panel", tint="#E8FFF2", alpha_min=float(os.environ.get("PANEL_A0", "0.03")), alpha_max=float(os.environ.get("PANEL_A1", "0.7")), rim_strength=0.35)
clear = mat_clear("clear", tint="#F2FFF8", alpha_min=float(os.environ.get("MARK_A0", "0.08")), alpha_max=float(os.environ.get("MARK_A1", "0.95")), rim_strength=float(os.environ.get("RIM_GLOW", "0.9")))
glow = mat_soft_glow("glow", "#22C55E", float(os.environ.get("GLOW", "2.2")))


def glow_plane(r):
    """A plane facing the camera (XZ plane) carrying the soft glow, which fades out at radius 1 in object space."""
    o = mesh_object(scene, "Glow", bm_box(2.0, 0.002, 2.0), glow, smooth=False, parent=rig)
    o.scale = (r, 1, r)
    o.visible_shadow = False
    return o


rig = add_empty(scene, "Rig")
if SHOT == "hero":
    D = float(os.environ.get("D", "7.6"))
    add_camera(scene, (0, -D, 0.55), (0, 0, 0.05), lens=50)
    rig.rotation_euler = (math.radians(8), 0, math.radians(float(os.environ.get("YAW", "-24"))))
    F, T = 3.3, 0.2
    mesh_object(scene, "Frame", bm_frame(F, F, T, 0.34, bevel=0.035), chrome, parent=rig)
    mesh_object(scene, "Panel", bm_box(F - 2 * T + 0.02, 0.1, F - 2 * T + 0.02, bevel=0.012), panel, parent=rig)
    g = glow_plane(float(os.environ.get("GLOW_R", "1.6")))
    g.location = (float(os.environ.get("GX", "0.05")), 0.25, float(os.environ.get("GZ", "-0.15")))
    s = LOGO_SCALE * float(os.environ.get("MARK_S", "0.84"))
    m = mesh_object(scene, "Mark", bm_logo_mark(scale=s, depth=150, bevel=24, segs=3), clear, parent=rig)
    m.location = (0, -0.32, 0.02)
else:
    D = float(os.environ.get("D", "6.4"))
    add_camera(scene, (0, -D, 1.1), (0, 0, 0), lens=50)
    rig.rotation_euler = (math.radians(24), 0, math.radians(-32))
    tile = mesh_object(scene, "Tile", bm_box(2.1, 0.7, 2.1, bevel=0.14, seg=4), chrome if SHOT == "chrome" else clear, parent=rig)
    if SHOT == "glass":
        # glass + metal: a chrome LS mark held inside the clear block, a soft green glow behind it
        inner = mesh_object(scene, "Inner", bm_logo_mark(scale=LOGO_SCALE * 0.5, depth=40, bevel=6, segs=2), chrome, parent=rig)
        g = glow_plane(1.1)
        g.location = (0, 0.5, 0)

frames = [1]
render_frames(scene, SHOT, frames, OUT_DIR, skip_existing=False)
log("done", SHOT)
