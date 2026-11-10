"""
pos.py — the Linse POS terminal (docs/content/04-pos-terminal.md), modelled from scratch. TRANSPARENT background.

    Blender -b -P pos.py -- --preview        # 25 % still
    Blender -b -P pos.py                     # full still -> out/pos/pos_0001.png

The terminal:
- operator screen: a 15.6" slab, edge-to-edge black glass front showing tools/pos/screens.html?screen=operator, a smoked
  frosted-glass back with the LS mark glowing faintly green;
- stand: one ribbon of polished chrome folded in a soft Z (foot on the base → back and up → forward to the screen);
- customer display: 10.1", on the back of the stand, lower than the operator screen, facing the customer;
- base: a low night-black anodised block with a frosted glass top, a receipt printer module (paper slot at the front,
  a receipt coming out) and a tap-to-pay zone ringed in green light.
Units: 1 ≈ 10 cm (the operator screen is 3.6 wide).
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
from common import _new_mat

ARGS = parse_args()
W, H = int(os.environ.get("W", "1600")), int(os.environ.get("H", "1400"))
OUT_DIR = os.path.join(OUT, "pos")
os.makedirs(OUT_DIR, exist_ok=True)
SCREENS = OUT  # pos_operator.png / pos_customer.png, rendered from tools/pos/screens.html

scene = reset_scene()
setup_render(scene, W, H, 30, 1, ARGS, samples=int(os.environ.get("SAMPLES", "96")), transparent=True, view="Standard", look=None)
setup_world(scene, strength=float(os.environ.get("HDR_STR", "0.55")), gradient=None, rotation=math.radians(float(os.environ.get("HDR_ROT", "35"))))
add_light(scene, "Key", (-8, -9, 10), (0, 0, 1.2), float(os.environ.get("KEY", "900")), 6, color=(0.94, 1.0, 0.96))
add_light(scene, "Rim", (8, 8, 6), (0, 0, 1.2), float(os.environ.get("RIM", "700")), 5, color=(0.45, 1.0, 0.62))
add_light(scene, "Back", (-2, 9, 1), (0, 0, 1.2), float(os.environ.get("BACK", "450")), 4, color=(0.35, 1.0, 0.55))
add_light(scene, "Fill", (9, -10, 2), (0, 0, 1.2), 320, 8, color=(0.9, 1.0, 0.95)).data.use_shadow = False
add_light(scene, "Top", (-1, -4, 16), (0, 0, 1.2), float(os.environ.get("TOP", "500")), 12, color=(0.88, 1.0, 0.92)).data.use_shadow = False


# ---------------------------------------------------------------- materials
def mat_anodised(name="anodised", color=(0.035, 0.05, 0.045), rough=0.34):
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", color)
    setin(pb, "Metallic", 1.0)
    setin(pb, "Roughness", rough)
    setin(pb, "Coat Weight", 0.4)
    setin(pb, "Coat Roughness", 0.2)
    return m


def mat_screen(name, image_path, strength=1.6):
    """Black glass with the UI as emission (the glass coat catches the studio)."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", (0.0, 0.0, 0.0))
    setin(pb, "Roughness", 0.06)
    setin(pb, "Coat Weight", 1.0)
    setin(pb, "Coat Roughness", 0.02)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image_path, check_existing=True)
    tex.interpolation = "Cubic"
    nt.links.new(tex.outputs["Color"], pb.inputs["Emission Color"])
    setin(pb, "Emission Strength", strength)
    return m


def mat_paper(name="paper"):
    """Receipt paper: off-white with printed rows (a small generated texture)."""
    m, nt, pb, out = _new_mat(name)
    w, h = 128, 512
    img = np.ones((h, w, 4), dtype=np.float32)
    img[..., :3] = 0.93
    for r in range(28, h - 120, 22):  # text rows of varying length
        L = int(w * (0.45 + 0.4 * ((r * 37) % 11) / 11))
        img[r:r + 6, 12:12 + L, :3] = 0.25
    img[h - 104:h - 24, 24:104, :3] = 0.18  # the QR block of an EBM receipt
    for y in range(h - 100, h - 28, 8):
        for x in range(28, 100, 8):
            if (x * 3 + y * 5) % 7 < 3:
                img[y:y + 6, x:x + 6, :3] = 0.93
    im = bpy.data.images.new("receipt", w, h, alpha=True)
    im.pixels = img[::-1].ravel()
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = im
    nt.links.new(tex.outputs["Color"], pb.inputs["Base Color"])
    setin(pb, "Roughness", 0.55)
    return m


chrome = mat_chrome("chrome", color=(0.9, 0.93, 0.91), rough=float(os.environ.get("CHROME_ROUGH", "0.08")), coat=0.8)
body = mat_anodised()
smoked = mat_frosted("smoked", tint=os.environ.get("SMOKED", "#22382F"), rough=0.3, thickness=0.1, milk=0.02)
topglass = mat_frosted("topglass", tint="#2C4A3D", rough=0.38, thickness=0.06, milk=0.03)
slot = mat_anodised("slot", color=(0.005, 0.007, 0.006), rough=0.6)
green = mat_emit("green", "#22C55E", float(os.environ.get("RING", "6.0")))
markglow = mat_emit("markglow", "#4ADE80", float(os.environ.get("MARK_GLOW", "1.4")), alpha=0.9)
op_screen = mat_screen("opScreen", os.path.join(SCREENS, "pos_operator.png"), float(os.environ.get("SCREEN", "1.5")))
cu_screen = mat_screen("cuScreen", os.path.join(SCREENS, "pos_customer.png"), float(os.environ.get("SCREEN", "1.5")))
paper = mat_paper()


# ---------------------------------------------------------------- geometry helpers
def plane_uv(w, h):
    """A w x h plane in the XZ plane facing -Y, UVs 0..1 (for screen images)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    f = bm.faces.new(vs)
    for loop, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv].uv = (u, v)
    f.normal_update()
    if f.normal.y > 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    return bm


def ribbon(points, width, thick, bevel=0.012):
    """A flat ribbon of `width` (along X) and `thick` following a polyline in the YZ plane (rounded by sampling)."""
    bm = bmesh.new()
    pts = [Vector((0, y, z)) for y, z in points]
    rows = []
    for i, p in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, len(pts) - 1)]
        t = (b - a).normalized()
        n = Vector((0, -t.z, t.y))  # normal in the YZ plane
        rows.append([bm.verts.new((sx * width / 2, (p + n * off).y, (p + n * off).z)) for sx, off in ((-1, 0), (1, 0), (1, thick), (-1, thick))])
    for i in range(len(rows) - 1):
        r0, r1 = rows[i], rows[i + 1]
        for k in range(4):
            bm.faces.new((r0[k], r0[(k + 1) % 4], r1[(k + 1) % 4], r1[k]))
    bm.faces.new(rows[0][::-1])
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def rounded_path(corners, radius=0.25, steps=10):
    """Polyline through `corners` with each inner corner rounded by a quadratic Bézier."""
    out = [corners[0]]
    for i in range(1, len(corners) - 1):
        p0, p1, p2 = Vector(corners[i - 1]), Vector(corners[i]), Vector(corners[i + 1])
        a = p1 + (p0 - p1).normalized() * min(radius, (p0 - p1).length / 2)
        b = p1 + (p2 - p1).normalized() * min(radius, (p2 - p1).length / 2)
        for s in range(steps + 1):
            u = s / steps
            q = a * (1 - u) ** 2 + p1 * 2 * u * (1 - u) + b * u ** 2
            out.append((q.x, q.y))
    out.append(corners[-1])
    return out


rig = add_empty(scene, "Terminal")

# base
BW, BD, BH = 3.2, 2.4, 0.42
mesh_object(scene, "Base", bm_box(BW, BD, BH, bevel=0.07, seg=4), body, parent=rig).location = (0, 0.15, BH / 2)
mesh_object(scene, "BaseTop", bm_box(BW - 0.16, BD - 0.16, 0.03, bevel=0.01), topglass, parent=rig).location = (0, 0.15, BH + 0.005)
# printer module, front left, with its paper slot and the receipt
PX, PY = -0.92, -0.42
mesh_object(scene, "Printer", bm_box(1.25, 1.15, 0.36, bevel=0.06, seg=4), body, parent=rig).location = (PX, PY, BH + 0.18)
mesh_object(scene, "PrinterLid", bm_box(1.13, 0.9, 0.02, bevel=0.008), smoked, parent=rig).location = (PX, PY + 0.06, BH + 0.365)
mesh_object(scene, "Slot", bm_box(0.98, 0.03, 0.035), slot, parent=rig).location = (PX, PY - 0.575, BH + 0.25)
rc = [(PY - 0.58, BH + 0.25)]
for k in range(1, 13):  # the receipt curls out of the slot and down towards the counter
    a = k / 12
    rc.append((PY - 0.58 - 0.55 * math.sin(a * math.pi / 2) - 0.08 * a, BH + 0.25 + 0.1 * math.sin(a * math.pi) - 0.42 * a ** 2))
rec = mesh_object(scene, "Receipt", ribbon(rc, 0.9, 0.004), paper, parent=rig)
rec.location = (PX, 0, 0)
# UVs for the receipt texture: project along X onto the path length
me = rec.data
uvl = me.uv_layers.new(name="UV")
for poly in me.polygons:
    for li in poly.loop_indices:
        v = me.vertices[me.loops[li].vertex_index].co
        uvl.data[li].uv = ((v.x / 0.9) + 0.5, 1 - min(1, max(0, (PY - 0.58 - v.y) / 0.75)))
# tap-to-pay zone, front right: a green light ring and a status dot
ring = mesh_object(scene, "TapRing", bm_torus(0.3, 0.018, segs=96, rings=12), green, parent=rig)
ring.location = (0.95, -0.42, BH + 0.03)
dot = mesh_object(scene, "Status", bm_cyl(0.035, 0.02, segs=24), green, parent=rig)
dot.location = (1.35, 0.95, BH + 0.03)

# stand: foot on the base (behind the printer and tap zone), back and up, then forward to the screen
S_PATH = rounded_path([(0.55, BH), (0.95, BH), (1.35, 1.25), (0.62, 2.05)], radius=float(os.environ.get("BEND", "0.32")))
mesh_object(scene, "Stand", ribbon(S_PATH, 0.95, 0.07), chrome, parent=rig)

# operator screen, tilted back, its back resting on the stand's end
SW, SH, ST = 3.6, 2.05, 0.11
scr = add_empty(scene, "OpScreen")
scr.parent = rig
scr.location = (0, 0.5, 2.18)
scr.rotation_euler = (math.radians(-14), 0, 0)
mesh_object(scene, "OpBody", bm_box(SW, ST, SH, bevel=0.03, seg=4), chrome, parent=scr)
mesh_object(scene, "OpBack", bm_box(SW - 0.08, 0.02, SH - 0.08, bevel=0.006), smoked, parent=scr).location = (0, ST / 2 + 0.005, 0)
mesh_object(scene, "OpGlass", bm_box(SW - 0.04, 0.02, SH - 0.04, bevel=0.006), slot, parent=scr).location = (0, -ST / 2 - 0.004, 0)
op = mesh_object(scene, "OpDisplay", plane_uv(SW - 0.16, (SW - 0.16) * 9 / 16), op_screen, smooth=False, parent=scr)
op.location = (0, -ST / 2 - 0.016, 0)
lm = mesh_object(scene, "OpBackMark", bm_logo_mark(scale=LOGO_SCALE * 0.3, depth=6, bevel=1, segs=1), markglow, parent=scr)
lm.location = (0, ST / 2 + 0.02, 0.1)
lm.rotation_euler = (0, 0, math.pi)

# customer display, lower, on the back of the stand, facing the customer (+Y)
CW, CH = 2.3, 1.44
cus = add_empty(scene, "CuScreen")
cus.parent = rig
cus.location = (0, 1.62, 1.25)
cus.rotation_euler = (math.radians(-18), 0, math.pi)
mesh_object(scene, "CuBody", bm_box(CW, 0.09, CH, bevel=0.025, seg=4), chrome, parent=cus)
mesh_object(scene, "CuBack", bm_box(CW - 0.07, 0.02, CH - 0.07, bevel=0.006), smoked, parent=cus).location = (0, 0.05, 0)
mesh_object(scene, "CuGlass", bm_box(CW - 0.04, 0.02, CH - 0.04, bevel=0.006), slot, parent=cus).location = (0, -0.05, 0)
cu = mesh_object(scene, "CuDisplay", plane_uv(CW - 0.14, (CW - 0.14) * 10 / 16), cu_screen, smooth=False, parent=cus)
cu.location = (0, -0.062, 0)
cm = mesh_object(scene, "CuBackMark", bm_logo_mark(scale=LOGO_SCALE * 0.22, depth=6, bevel=1, segs=1), markglow, parent=cus)
cm.location = (0, 0.065, 0)
cm.rotation_euler = (0, 0, math.pi)
# arm from the stand to the customer display
mesh_object(scene, "CuArm", bm_box(0.5, 0.42, 0.12, bevel=0.03), chrome, parent=rig).location = (0, 1.38, 1.22)

# camera: three-quarter front, slightly above, the whole terminal in frame
yaw = math.radians(float(os.environ.get("YAW", "-42")))
dist = float(os.environ.get("D", "8.4"))
target = (0, 0.55, 1.15)
add_camera(scene, (target[0] + dist * math.sin(yaw), target[1] - dist * math.cos(yaw), float(os.environ.get("CAM_Z", "3.9"))), target, lens=50)

render_frames(scene, "pos", [1], OUT_DIR, skip_existing=False)
log("done pos")
