"""
common.py — shared helpers for the Linse pre-rendered clips.

Target: Blender 5.2 LTS (EEVEE, engine id BLENDER_EEVEE, Metal backend).
Every script in this folder runs headless:
    Blender -b -P hero.py  -- [--preview] [--frames A-B] [--scale 25] [--samples N]
    Blender -b -P stack.py -- [--preview] ...
--preview renders 12 evenly spaced frames at 25 % resolution and writes a contact
sheet to tools/blender/out/<name>_preview_sheet.png.
"""
import bpy, bmesh, math, os, re, sys, random, time, warnings
import numpy as np
from mathutils import Vector, Euler, Matrix

warnings.filterwarnings("ignore", category=DeprecationWarning)

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
HDRI = os.path.join(WEB, "public", "hdr", "studio.hdr")
CLIPS = os.path.join(WEB, "public", "clips")
OUT = os.path.join(HERE, "out")

# ---------------------------------------------------------------- brand
COL = dict(dark="#04150F", deep="#0B3D2E", green="#22C55E", pale="#CDEFD9", page="#DFF3E7")


def hex2lin(h, a=1.0):
    """'#RRGGBB' (sRGB) -> linear RGBA tuple."""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (a,)


def hex2srgb01(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


# ---------------------------------------------------------------- mark geometry (from web/src/components/ui/Logo.tsx, 640 x 552 box)
LOGO_PATHS = [
    "M320 0 L365.5 78.9 L140.8 468 L288.8 468 L241.5 550 L2.4 550 Z",
    "M393.3 127.8 L439.4 207.7 L363.9 338 L515.2 338 L637.6 550 L299.5 550 L346.8 468 L498.2 468 L470.5 420 L224.5 420 Z",
]
LOGO_PIECES = [
    "M320 0 L365.5 78.9 L140.8 468 L49.8 468 Z",
    "M49.8 468 L288.8 468 L241.5 550 L2.4 550 Z",
    "M393.3 127.8 L439.4 207.7 L363.9 338 L271.9 338 Z",
    "M271.9 338 L515.2 338 L562.5 420 L224.5 420 Z",
    "M470.5 420 L562.5 420 L637.6 550 L299.5 550 L346.8 468 L498.2 468 Z",
]
# outward offsets for the assemble animation, path units (x, y-up, z-toward-camera)
PIECE_OFFSETS = [(-140, 190, 90), (-210, -150, -70), (110, 240, -90), (240, 20, 110), (190, -210, -40)]
LOGO_SCALE = 1 / 240  # path units -> scene units (mark ≈ 2.67 wide, 2.3 tall)
CX, CY = 320, 276


# ---------------------------------------------------------------- args
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    a = dict(preview="--preview" in argv, frames=None, scale=None, samples=None, sheet_only="--sheet-only" in argv)
    for i, t in enumerate(argv):
        if t == "--frames":
            lo, hi = argv[i + 1].split("-")
            a["frames"] = (int(lo), int(hi))
        if t == "--scale":
            a["scale"] = int(argv[i + 1])
        if t == "--samples":
            a["samples"] = int(argv[i + 1])
    return a


# ---------------------------------------------------------------- coordinate helpers
def V3(x, y, z):
    """three.js (x right, y up, z toward camera) -> Blender (camera on -Y looking +Y, Z up)."""
    return Vector((x, -z, y))


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- scene / render
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    return sc


def setup_render(scene, w, h, fps, nframes, args, samples=64, transparent=False, motion_blur=False, view="AgX", look="AgX - Medium High Contrast"):
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    r.resolution_x, r.resolution_y = w, h
    r.resolution_percentage = args["scale"] or (25 if args["preview"] else 100)
    r.fps, r.fps_base = fps, 1.0
    scene.frame_start, scene.frame_end = 1, nframes
    r.film_transparent = transparent
    r.use_motion_blur = motion_blur
    r.motion_blur_shutter = 0.5
    r.use_persistent_data = True
    e = scene.eevee
    e.taa_render_samples = args["samples"] or (16 if args["preview"] else samples)
    e.use_raytracing = True
    e.ray_tracing_method = "SCREEN"
    rt = e.ray_tracing_options
    try:
        rt.resolution_scale = "1"
    except Exception:
        pass
    rt.use_denoise = True
    rt.trace_max_roughness = 0.6
    e.use_shadows = True
    e.shadow_ray_count = 1
    e.shadow_step_count = 2
    e.motion_blur_steps = 2 if motion_blur else 1
    try:
        scene.view_settings.view_transform = view
        scene.view_settings.look = look if look else "None"
    except Exception:
        pass
    scene.view_settings.exposure = 0.0
    ims = r.image_settings
    ims.media_type = "IMAGE"
    ims.file_format = "PNG"
    ims.color_mode = "RGBA" if transparent else "RGB"
    ims.color_depth = "8"
    ims.compression = 20
    return r


def preview_frames(nframes, n=12):
    return [int(round(1 + (nframes - 1) * i / (n - 1))) for i in range(n)]


# ---------------------------------------------------------------- materials
def _new_mat(name):
    m = bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    pb = nt.nodes.get("Principled BSDF")
    out = nt.nodes.get("Material Output")
    return m, nt, pb, out


def setin(node, name, value):
    s = node.inputs[name]
    dv = s.default_value
    if hasattr(dv, "__len__") and not isinstance(value, (int, float)):
        v = tuple(value)
        if len(v) == 3:
            v = v + (1.0,)
        s.default_value = v
    else:
        s.default_value = value
    return s


def mat_chrome(name="chrome", color=(0.95, 0.96, 0.955), rough=0.08, coat=1.0):
    """Studio chrome: Principled metallic 1, roughness 0.08, coat 1."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", color)
    setin(pb, "Metallic", 1.0)
    setin(pb, "Roughness", rough)
    setin(pb, "Coat Weight", coat)
    setin(pb, "Coat Roughness", 0.03)
    m.surface_render_method = "DITHERED"
    return m


def mat_chrome_dark(name="chromeDark"):
    return mat_chrome(name, color=(0.60, 0.66, 0.63), rough=0.22, coat=0.6)


def mat_frosted(name="frosted", tint="#EAFBF1", rough=0.35, ior=1.45, thickness=0.37, milk=0.12):
    """Frosted glass: transmission 1, roughness 0.35, IOR 1.45, faint green tint (EEVEE raytraced refraction),
    mixed with a little white diffuse so it reads milky/lit like the reference."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", hex2lin(tint))
    setin(pb, "Metallic", 0.0)
    setin(pb, "Roughness", rough)
    setin(pb, "IOR", ior)
    setin(pb, "Transmission Weight", 1.0)
    setin(pb, "Coat Weight", 1.0)
    setin(pb, "Coat Roughness", 0.04)
    setin(pb, "Specular IOR Level", 1.0)
    setin(pb, "Emission Color", hex2lin("#BFF5D6"))
    setin(pb, "Emission Strength", 0.02)
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
    dif.inputs["Color"].default_value = hex2lin("#F2FFF7")
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs["Fac"].default_value = milk
    nt.links.new(pb.outputs[0], mix.inputs[1])
    nt.links.new(dif.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    val = nt.nodes.new("ShaderNodeValue")
    val.outputs[0].default_value = thickness
    if "Thickness" in out.inputs:
        nt.links.new(val.outputs[0], out.inputs["Thickness"])
    m.use_raytrace_refraction = True
    m.thickness_mode = "SLAB"
    m.surface_render_method = "DITHERED"
    return m


def mat_pcb(name="pcb"):
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", hex2lin("#0F4A38"))
    setin(pb, "Metallic", 0.35)
    setin(pb, "Roughness", 0.55)
    setin(pb, "Coat Weight", 0.4)
    return m


def mat_chip(name="chip"):
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", hex2lin("#1A1F1C"))
    setin(pb, "Metallic", 0.6)
    setin(pb, "Roughness", 0.35)
    return m


def mat_emit(name, color="#CDEFD9", strength=3.0, alpha=1.0):
    """Self-lit blueprint lines (blended so Alpha can be animated for fades)."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", (0, 0, 0))
    setin(pb, "Emission Color", hex2lin(color))
    setin(pb, "Emission Strength", strength)
    setin(pb, "Alpha", alpha)
    setin(pb, "Roughness", 1.0)
    setin(pb, "Specular IOR Level", 0.0)
    m.surface_render_method = "BLENDED"
    m.show_transparent_back = False
    m.use_backface_culling = False
    return m


def mat_clear_glass(name="clearGlass"):
    """Thin clear tube: blended, Fresnel-driven alpha, glossy coat — composites cleanly over transparency."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", (1, 1, 1))
    setin(pb, "Metallic", 0.0)
    setin(pb, "Roughness", 0.04)
    setin(pb, "Coat Weight", 1.0)
    setin(pb, "Coat Roughness", 0.02)
    setin(pb, "Specular IOR Level", 0.7)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.3
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 1.0
    mr.inputs["To Min"].default_value = 0.05
    mr.inputs["To Max"].default_value = 0.6
    nt.links.new(lw.outputs["Fresnel"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], pb.inputs["Alpha"])
    m.surface_render_method = "BLENDED"
    m.show_transparent_back = True
    m.use_backface_culling = False
    return m


def mat_clear(name="clear", tint="#FFFFFF", alpha_min=0.05, alpha_max=0.92, rim="#86EFAC", rim_strength=0.7, blend=0.22):
    """Clear glass for transparent renders (the brand's glass since 10 Nov 2026: clear, not frosted): a glossy coated
    surface whose opacity follows the Fresnel term (almost invisible face-on, bright at the edges), with a faint green
    rim at grazing angles. BLENDED with overlap, so the back faces of thick glass show through; composites cleanly
    over any page background."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Base Color", hex2lin(tint))
    setin(pb, "Metallic", 0.0)
    setin(pb, "Roughness", 0.015)
    setin(pb, "IOR", 1.5)
    setin(pb, "Coat Weight", 1.0)
    setin(pb, "Coat Roughness", 0.01)
    setin(pb, "Specular IOR Level", 1.0)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = blend
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = alpha_min
    mr.inputs["To Max"].default_value = alpha_max
    nt.links.new(lw.outputs["Fresnel"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], pb.inputs["Alpha"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.55
    ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].color = hex2lin(rim)
    nt.links.new(lw.outputs["Facing"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], pb.inputs["Emission Color"])
    setin(pb, "Emission Strength", rim_strength)
    m.surface_render_method = "BLENDED"
    m.use_backface_culling = False
    for attr in ("use_transparency_overlap", "show_transparent_back"):
        if hasattr(m, attr):
            setattr(m, attr, True)
    return m


def mat_soft_glow(name="softGlow", color="#22C55E", strength=2.0):
    """A soft round glow for a plane: emission and alpha fall off from the centre (UV-less, object coordinates)."""
    m, nt, pb, out = _new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    nt.links.new(tc.outputs["Object"], grad.inputs["Vector"])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = hex2lin(color)
    em.inputs["Strength"].default_value = strength
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 1.8
    nt.links.new(grad.outputs["Fac"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    for l in list(out.inputs["Surface"].links):
        nt.links.remove(l)
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    m.surface_render_method = "BLENDED"
    return m


def mat_ribbon(name="ribbon", image=None, levels=16):
    """Terraced field: metallic dark green sheets. The same height map that displaces the plane drives the
    colour: flat sheet tops, a dark gap on the cliff, a pale lip on the top edge; falls to the dark horizon with distance."""
    m, nt, pb, out = _new_mat(name)
    uv = nt.nodes.new("ShaderNodeUVMap")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    tex.extension = "EXTEND"
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = levels
    nt.links.new(tex.outputs["Color"], mul.inputs[0])
    frac = nt.nodes.new("ShaderNodeMath")
    frac.operation = "FRACT"
    nt.links.new(mul.outputs[0], frac.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position, cr.elements[0].color = 0.0, hex2lin("#0D4A36")
    cr.elements[1].position, cr.elements[1].color = 1.0, hex2lin("#DFF3E7")
    for pos, col in ((0.78, "#0B3D2E"), (0.82, "#041A12"), (0.90, "#061F16"), (0.935, "#8FD9B0")):
        e = cr.elements.new(pos)
        e.color = hex2lin(col)
    nt.links.new(frac.outputs[0], ramp.inputs["Fac"])
    cam = nt.nodes.new("ShaderNodeCameraData")
    dist = nt.nodes.new("ShaderNodeMapRange")
    dist.inputs["From Min"].default_value = 17.0
    dist.inputs["From Max"].default_value = 37.0
    dist.inputs["To Min"].default_value = 0.0
    dist.inputs["To Max"].default_value = 1.0
    nt.links.new(cam.outputs["View Distance"], dist.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["B"].default_value = hex2lin("#02100A")
    rise = nt.nodes.new("ShaderNodeValue")
    rise.name = rise.label = "Rise"
    rise.outputs[0].default_value = 0.0
    flat = nt.nodes.new("ShaderNodeMix")
    flat.data_type = "RGBA"
    flat.inputs["A"].default_value = hex2lin("#0B3D2E")
    nt.links.new(ramp.outputs["Color"], flat.inputs["B"])
    nt.links.new(rise.outputs[0], flat.inputs["Factor"])
    nt.links.new(flat.outputs["Result"], mix.inputs["A"])
    nt.links.new(dist.outputs["Result"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], pb.inputs["Base Color"])
    rr = nt.nodes.new("ShaderNodeValToRGB")
    rr.color_ramp.elements[0].position, rr.color_ramp.elements[0].color = 0.0, (0.45, 0.45, 0.45, 1)
    rr.color_ramp.elements[1].position, rr.color_ramp.elements[1].color = 0.95, (0.18, 0.18, 0.18, 1)
    nt.links.new(frac.outputs[0], rr.inputs["Fac"])
    rmix = nt.nodes.new("ShaderNodeMix")
    rmix.data_type = "FLOAT"
    rmix.inputs["A"].default_value = 0.55
    nt.links.new(rr.outputs["Color"], rmix.inputs["B"])
    nt.links.new(rise.outputs[0], rmix.inputs["Factor"])
    nt.links.new(rmix.outputs["Result"], pb.inputs["Roughness"])
    rmix.inputs["A"].default_value = 0.8
    # flat state: dull and dark (a plain gradient); risen: coated metallic sheets
    for sock, lo, hi in (("Coat Weight", 0.1, 1.0), ("Metallic", 0.1, 0.35)):
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = lo, hi
        nt.links.new(rise.outputs[0], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], pb.inputs[sock])
    setin(pb, "Coat Roughness", 0.12)
    setin(pb, "Specular IOR Level", 0.6)
    return m


def key_input(mat, inp, frame, value, node="Principled BSDF"):
    """Keyframe a Principled input (e.g. Alpha, Emission Strength)."""
    s = mat.node_tree.nodes[node].inputs[inp]
    s.default_value = value
    s.keyframe_insert("default_value", frame=frame)


# ---------------------------------------------------------------- world and lights
def setup_world(scene, strength=1.0, gradient=None, rotation=0.0):
    """HDRI lighting; the camera sees either the HDRI (gradient=None) or a vertical dark gradient (top_hex, bottom_hex)."""
    w = scene.world or bpy.data.worlds.new("World")
    scene.world = w
    if w.node_tree is None:
        w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(HDRI, check_existing=True)
    mapping = nt.nodes.new("ShaderNodeMapping")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mapping.inputs["Rotation"].default_value = (0, 0, rotation)
    nt.links.new(tc.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    if gradient is None:
        nt.links.new(bg.outputs[0], out.inputs["Surface"])
        return w
    top, bottom = gradient
    win = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(win.outputs["Window"], sep.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = hex2lin(bottom)
    ramp.color_ramp.elements[1].color = hex2lin(top)
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    bgc = nt.nodes.new("ShaderNodeBackground")
    nt.links.new(ramp.outputs["Color"], bgc.inputs["Color"])
    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg.outputs[0], mix.inputs[1])
    nt.links.new(bgc.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return w


def point_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def add_light(scene, name, loc, target, energy, size, color=(1, 1, 1), size_y=None, spec=1.0):
    L = bpy.data.lights.new(name, "AREA")
    L.energy, L.size, L.color, L.specular_factor = energy, size, color[:3], spec
    L.shape = "RECTANGLE" if size_y else "SQUARE"
    if size_y:
        L.size_y = size_y
    o = bpy.data.objects.new(name, L)
    scene.collection.objects.link(o)
    o.location = loc
    point_at(o, target)
    return o


def add_camera(scene, loc, target, lens=50, shift_x=0.0, shift_y=0.0):
    c = bpy.data.cameras.new("Cam")
    c.lens, c.shift_x, c.shift_y = lens, shift_x, shift_y
    c.sensor_fit = "AUTO"
    c.clip_start, c.clip_end = 0.1, 300
    o = bpy.data.objects.new("Cam", c)
    scene.collection.objects.link(o)
    o.location = loc
    point_at(o, target)
    scene.camera = o
    return o


def add_empty(scene, name, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.location = loc
    return o


# ---------------------------------------------------------------- bmesh geometry
def mark_sharp(bm, angle_deg=35):
    th = math.radians(angle_deg)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > th:
            e.smooth = False


def mesh_object(scene, name, bm, mat=None, smooth=True, sharp_angle=35, parent=None):
    me = bpy.data.meshes.new(name)
    if smooth and sharp_angle is not None:
        mark_sharp(bm, sharp_angle)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    if mat is not None:
        me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    if parent is not None:
        o.parent = parent
    return o


def bm_transform(bm, verts, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    M = Matrix.Translation(Vector(loc)) @ Euler(rot, "XYZ").to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1.0))
    bmesh.ops.transform(bm, matrix=M, verts=verts)


def bm_bevel(bm, width, segments=3, geom=None):
    bmesh.ops.bevel(bm, geom=geom if geom is not None else bm.edges[:], offset=width, offset_type="OFFSET",
                    segments=segments, profile=0.5, affect="EDGES", clamp_overlap=True)


def bm_box(w, h, d, bevel=0.0, seg=3):
    """Centred box (w along X, h along Y, d along Z), optionally bevelled."""
    bm = bmesh.new()
    r = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, d), verts=r["verts"])
    if bevel > 0:
        bm_bevel(bm, min(bevel, min(w, h, d) * 0.45), seg)
    return bm


def bm_merge(dst, src, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Append src (consumed) into dst with a transform."""
    me = bpy.data.meshes.new("tmp_merge")
    src.to_mesh(me)
    src.free()
    tmp = bmesh.new()
    tmp.from_mesh(me)
    bm_transform(tmp, tmp.verts[:], loc, rot, scale)
    tmp.to_mesh(me)
    tmp.free()
    dst.from_mesh(me)
    bpy.data.meshes.remove(me)
    return dst


def bm_cyl(r, h, segs=64, r2=None, cap=True, bevel=0.0, seg=3):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if bevel > 0:
        bm_bevel(bm, min(bevel, h * 0.45), seg, geom=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6])
    return bm


def bm_sphere(r, segs=32, rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    return bm


def bm_torus(R, r, segs=96, rings=16, bm=None):
    """Torus in the XY plane."""
    bm = bm or bmesh.new()
    grid = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        ring = []
        for j in range(rings):
            b = 2 * math.pi * j / rings
            x = (R + r * math.cos(b)) * math.cos(a)
            y = (R + r * math.cos(b)) * math.sin(a)
            z = r * math.sin(b)
            ring.append(bm.verts.new((x, y, z)))
        grid.append(ring)
    for i in range(segs):
        for j in range(rings):
            bm.faces.new((grid[i][j], grid[(i + 1) % segs][j], grid[(i + 1) % segs][(j + 1) % rings], grid[i][(j + 1) % rings]))
    return bm


def bm_pyramid(r, h, sides=4):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=sides, radius1=r, radius2=0.0, depth=h)
    return bm


def bm_frame(w, h, t, d, bevel=0.02):
    """Rectangular ring (hollow frame) lying in the XZ plane, thickness t, depth d along Y."""
    bm = bmesh.new()
    for (cx, cz, bw, bh) in ((0, h / 2 - t / 2, w, t), (0, -h / 2 + t / 2, w, t), (w / 2 - t / 2, 0, t, h - 2 * t), (-w / 2 + t / 2, 0, t, h - 2 * t)):
        r = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(bw, d, bh), verts=r["verts"])
        bmesh.ops.translate(bm, vec=(cx, 0, cz), verts=r["verts"])
    bm_bevel(bm, bevel, 2)
    return bm


def bm_rect_frame(w, h, t=0.008, bm=None, loc=(0, 0, 0)):
    """Thin blueprint rectangle (four thin bars) in the XZ plane, appended to bm."""
    bm = bm or bmesh.new()
    for (cx, cz, bw, bh) in ((0, h / 2, w, t), (0, -h / 2, w, t), (w / 2, 0, t, h), (-w / 2, 0, t, h)):
        r = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(bw, t, bh), verts=r["verts"])
        bmesh.ops.translate(bm, vec=(loc[0] + cx, loc[1], loc[2] + cz), verts=r["verts"])
    return bm


def bm_dots(segments, spacing=0.11, size=0.014, bm=None):
    """Dotted lines: tiny cubes along each (a, b) segment, appended to bm."""
    bm = bm or bmesh.new()
    for a, b in segments:
        a, b = Vector(a), Vector(b)
        n = max(2, int((b - a).length / spacing))
        for i in range(n + 1):
            r = bmesh.ops.create_cube(bm, size=size)
            bmesh.ops.translate(bm, vec=a.lerp(b, i / n), verts=r["verts"])
    return bm


def bm_logo(path, scale=LOGO_SCALE, depth=88, bevel=7, segs=4):
    """Extruded, bevelled solid from one closed polygon of the mark (XZ plane, extruded along Y, centred)."""
    nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", path)]
    d = depth * scale
    bm = bmesh.new()
    verts = [bm.verts.new(((nums[i] - CX) * scale, -d / 2, -(nums[i + 1] - CY) * scale)) for i in range(0, len(nums), 2)]
    f = bm.faces.new(verts)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    vs = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=vs, vec=(0, d, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm_bevel(bm, bevel * scale, segs)
    return bm


def bm_logo_mark(scale=LOGO_SCALE, depth=88, bevel=7, segs=4):
    """Both outlines of the mark in one bmesh."""
    bm = bmesh.new()
    for p in LOGO_PATHS:
        part = bm_logo(p, scale, depth, bevel, segs)
        me = bpy.data.meshes.new("tmp")
        part.to_mesh(me)
        part.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    return bm


def curve_tube(scene, name, points, radius=0.045, mat=None, parent=None, spline="NURBS", resolution=8, cyclic=False):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = resolution
    cu.use_fill_caps = True
    cu.resolution_u = 24
    sp = cu.splines.new(spline)
    sp.points.add(len(points) - 1)
    for p, pt in zip(sp.points, points):
        p.co = (*pt, 1.0)
    if spline == "NURBS":
        sp.order_u = min(4, len(points))
        sp.use_endpoint_u = True
    sp.use_cyclic_u = cyclic
    if mat is not None:
        cu.materials.append(mat)
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    if parent is not None:
        o.parent = parent
    return o


def helix_points(radius, turns, height, n=240):
    return [(math.cos(2 * math.pi * turns * i / n) * radius, math.sin(2 * math.pi * turns * i / n) * radius, height * i / n - height / 2) for i in range(n + 1)]


# ---------------------------------------------------------------- animation helpers
def key(obj, frame, loc=None, rot=None, scale=None):
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert("location", frame=frame)
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert("rotation_euler", frame=frame)
    if scale is not None:
        obj.scale = scale if hasattr(scale, "__len__") else (scale, scale, scale)
        obj.keyframe_insert("scale", frame=frame)


def key_hide(obj, frame, hidden):
    obj.hide_render = hidden
    obj.keyframe_insert("hide_render", frame=frame)


def fcurves_of(idblock):
    """All F-curves animating an ID (objects, node trees...), across legacy and slotted (4.4+) actions."""
    ad = idblock.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            cb = strip.channelbag(ad.action_slot) if ad.action_slot else None
            if cb:
                out.extend(cb.fcurves)
    return out


def set_interpolation(obj, interp="BEZIER", easing="AUTO"):
    for fc in fcurves_of(obj):
        if fc.data_path == "hide_render":
            continue
        for kp in fc.keyframe_points:
            kp.interpolation = interp
            kp.easing = easing
            kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"


def bake(obj, frames, fn):
    """fn(frame) -> dict(loc=, rot=, scale=) keyed on every frame (linear interpolation between frames)."""
    for f in frames:
        d = fn(f)
        key(obj, f, d.get("loc"), d.get("rot"), d.get("scale"))
    set_interpolation(obj, "LINEAR")


# ---------------------------------------------------------------- rendering, post, sheets
def load_pixels(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)  # row 0 = bottom


def save_pixels(path, arr, alpha=True):
    h, w = arr.shape[:2]
    img = bpy.data.images.new("tmp_out", w, h, alpha=alpha)
    img.pixels.foreach_set(np.ascontiguousarray(arr, dtype=np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "JPEG" if path.lower().endswith(".jpg") else "PNG"
    img.save()
    bpy.data.images.remove(img)


def contact_sheet(paths, out_path, cols=4, labels=None, cell_w=400, checker=None):
    """12-frame review sheet; alpha frames are composited alternately over dark/magenta (like the reference)."""
    tiles = []
    for i, p in enumerate(paths):
        a = load_pixels(p)
        h, w = a.shape[:2]
        step = max(1, int(round(w / cell_w)))
        a = a[::step, ::step]
        if checker:
            bg = np.array(hex2srgb01(checker[i % len(checker)]) + [1.0], dtype=np.float32)
            al = a[..., 3:4]
            a = a * al + bg * (1 - al)
            a[..., 3] = 1.0
        tiles.append(a)
    th, tw = tiles[0].shape[:2]
    rows = (len(tiles) + cols - 1) // cols
    gap = 6
    sheet = np.full((rows * (th + gap), cols * (tw + gap), 4), 0.5, dtype=np.float32)
    sheet[..., 3] = 1.0
    for i, t in enumerate(tiles):
        r, c = i // cols, i % cols
        rr = (rows - 1 - r) * (th + gap)
        cc = c * (tw + gap)
        sheet[rr:rr + t.shape[0], cc:cc + t.shape[1]] = t[:th, :tw]
    save_pixels(out_path, sheet, alpha=False)
    return out_path


def render_frames(scene, name, frames, out_dir, post=None, skip_existing=True, samples_for=None):
    """Render the given frames to out_dir/<name>_####.png (one render call per frame), returning the paths.
    samples_for(frame) may override the EEVEE sample count per frame."""
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    t0 = time.time()
    for i, f in enumerate(frames):
        p = os.path.join(out_dir, f"{name}_{f:04d}.png")
        paths.append(p)
        if skip_existing and os.path.exists(p) and os.path.getsize(p) > 0:
            continue
        if samples_for:
            scene.eevee.taa_render_samples = samples_for(f)
        scene.frame_set(f)
        scene.render.filepath = p
        bpy.ops.render.render(write_still=True)
        if post:
            post(p)
        el = time.time() - t0
        print(f"[{name}] frame {f} ({i + 1}/{len(frames)}) {el:.0f}s elapsed, ~{el / (i + 1) * (len(frames) - i - 1):.0f}s left", flush=True)
    return paths


def log(*a):
    print("[linse]", *a, flush=True)


# ---------------------------------------------------------------- v2 helpers (hero rebuild)
def key_ease(obj, frame, interp="BEZIER", easing="AUTO"):
    """Set interpolation/easing on the keyframe points at `frame` only (hide_render untouched)."""
    for fc in fcurves_of(obj):
        if fc.data_path == "hide_render":
            continue
        for kp in fc.keyframe_points:
            if abs(kp.co.x - frame) < 0.5:
                kp.interpolation = interp
                kp.easing = easing


def key_color(obj, frame, alpha, rgb=(1, 1, 1)):
    """Keyframe the object colour (Object Info > Alpha in a material drives per-object fades)."""
    obj.color = (rgb[0], rgb[1], rgb[2], alpha)
    obj.keyframe_insert("color", frame=frame)


def rounded_rect_pts(w, h, r, segs=6):
    """Rounded rectangle outline in the XZ plane (list of (x, z)), counter-clockwise."""
    pts = []
    cx, cz = w / 2 - r, h / 2 - r
    for sx, sz, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for i in range(segs + 1):
            a = math.radians(a0 + 90 * i / segs)
            pts.append((sx * cx + r * math.cos(a), sz * cz + r * math.sin(a)))
    return pts


def inset_pts(pts, d):
    """Offset a convex outline inward by d (vertex-normal approximation, fine for rounded rectangles)."""
    n = len(pts)
    out = []
    for i in range(n):
        x0, z0 = pts[i - 1]
        x1, z1 = pts[i]
        x2, z2 = pts[(i + 1) % n]
        tx, tz = x2 - x0, z2 - z0
        L = math.hypot(tx, tz) or 1.0
        nx, nz = tz / L, -tx / L  # right-hand normal of a CCW outline points outward
        out.append((x1 - nx * d, z1 - nz * d))
    return out


def _ring(bm, pts, y):
    return [bm.verts.new((x, y, z)) for x, z in pts]


def _loft(bm, a, b):
    n = len(a)
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))


def bm_plate(w, h, r, t, bevel=0.0, segs=6):
    """Solid rounded-rectangle plate in the XZ plane, thickness t along Y (centred)."""
    bm = bmesh.new()
    pts = rounded_rect_pts(w, h, r, segs)
    a, b = _ring(bm, pts, -t / 2), _ring(bm, pts, t / 2)
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    _loft(bm, a, b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bevel > 0:
        bm_bevel(bm, min(bevel, t * 0.45), 2)
    return bm


def bm_ring_plate(w, h, r, inset, t, bevel=0.0, segs=6):
    """Rounded-rectangle frame (a plate with a rounded-rectangle hole), thickness t along Y."""
    bm = bmesh.new()
    o = rounded_rect_pts(w, h, r, segs)
    i = inset_pts(o, inset)
    of, ob_ = _ring(bm, o, -t / 2), _ring(bm, o, t / 2)
    if_, ib = _ring(bm, i, -t / 2), _ring(bm, i, t / 2)
    _loft(bm, of, if_)
    _loft(bm, ib, ob_)
    _loft(bm, ob_, of)
    _loft(bm, if_, ib)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bevel > 0:
        bm_bevel(bm, min(bevel, t * 0.45, inset * 0.4), 2)
    return bm


def bm_tray(w, h, r, depth, wall, floor, bevel=0.0, segs=6):
    """Hollow rounded-rectangle shell open toward -Y (the camera), closed at +Y."""
    bm = bmesh.new()
    o = rounded_rect_pts(w, h, r, segs)
    i = inset_pts(o, wall)
    y0, y1, yf = -depth / 2, depth / 2, depth / 2 - floor
    of, ob_ = _ring(bm, o, y0), _ring(bm, o, y1)
    if_, ifl = _ring(bm, i, y0), _ring(bm, i, yf)
    _loft(bm, of, if_)      # front rim
    _loft(bm, ob_, of)      # outer wall
    bm.faces.new(list(reversed(ob_)))  # back
    _loft(bm, if_, ifl)     # inner wall
    bm.faces.new(ifl)       # inner floor
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bevel > 0:
        bm_bevel(bm, min(bevel, wall * 0.4), 2)
    return bm


def apply_boolean(scene, obj, cutters, op="DIFFERENCE"):
    """Boolean (exact) of obj with temporary cutters; each bmesh in `cutters` is applied on its own, because an
    operand with self-intersections (several overlapping cutters merged) gives garbage with the exact solver."""
    if not isinstance(cutters, (list, tuple)):
        cutters = [cutters]
    for i, bm in enumerate(cutters):
        cut = mesh_object(scene, f"{obj.name}_cut{i}", bm, None, smooth=False)
        mod = obj.modifiers.new("bool", "BOOLEAN")
        mod.operation, mod.object, mod.solver = op, cut, "EXACT"
        mod.use_self = True
        with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
            bpy.ops.object.modifier_apply(modifier="bool")
        me = cut.data
        bpy.data.objects.remove(cut)
        bpy.data.meshes.remove(me)
    # drop the empty material slots the cutters leave behind, then re-mark sharp edges on the new hole walls
    for i in reversed(range(len(obj.data.materials))):
        if obj.data.materials[i] is None:
            obj.data.materials.pop(index=i)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    mark_sharp(bm, 35)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    return obj


def add_backdrop(scene, cam, stops, depth=60.0, lens=50.0, aspect=1.6, name="Backdrop"):
    """Camera-parented emissive plane filling the frame at `depth`, with an exact vertical colour ramp
    (stops: [(v 0=bottom..1=top, '#hex'), ...]). Replaces world-space gradients, which EEVEE's world shader
    cannot key to the window."""
    hh = depth * (18.0 / aspect) / lens  # half frame height at that depth (36 mm sensor fit on the width)
    hw = hh * aspect
    bm = bmesh.new()
    vs = [bm.verts.new((x, z, -depth)) for x, z in ((-hw * 1.6, -hh * 1.6), (hw * 1.6, -hh * 1.6), (hw * 1.6, hh * 1.6), (-hw * 1.6, hh * 1.6))]
    bm.faces.new(vs)
    m, nt, pb, out = _new_mat(name + "Mat")
    nt.nodes.remove(pb)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = -hh, hh
    nt.links.new(sep.outputs["Y"], mr.inputs["Value"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.interpolation = "B_SPLINE"
    cr.elements[0].position, cr.elements[0].color = stops[0][0], hex2lin(stops[0][1])
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], hex2lin(stops[-1][1])
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos)
        e.color = hex2lin(col)
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    o = mesh_object(scene, name, bm, m, smooth=False)
    o.parent = cam
    o.visible_shadow = False
    return o


def mat_perforated(name="perf", color=(0.6, 0.66, 0.63), rough=0.22, pitch=0.11, hole=0.4):
    """Dark chrome with a regular grid of round holes (alpha-clipped), like a speaker grille."""
    m = mat_chrome(name, color=color, rough=rough, coat=0.5)
    nt, pb = m.node_tree, m.node_tree.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / pitch, 1 / pitch, 1 / pitch)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    vo = nt.nodes.new("ShaderNodeTexVoronoi")
    vo.feature, vo.distance = "F1", "EUCLIDEAN"
    vo.inputs["Randomness"].default_value = 0.0
    nt.links.new(mp.outputs["Vector"], vo.inputs["Vector"])
    gt = nt.nodes.new("ShaderNodeMath")
    gt.operation = "GREATER_THAN"
    gt.inputs[1].default_value = hole
    nt.links.new(vo.outputs["Distance"], gt.inputs[0])
    nt.links.new(gt.outputs[0], pb.inputs["Alpha"])
    m.surface_render_method = "DITHERED"
    return m


def mat_ribbon_v2(name="ribbon2", near="#2E8C63", mid="#0F4A37", far="#03110B", rough=0.45, metallic=0.5, d0=9.0, d1=27.0, fall=0.7):
    """Satin deep-green walls: colour darkens with view distance (near -> mid -> far), soft coat highlights,
    per-object alpha from Object Info (for the fade-in)."""
    m, nt, pb, out = _new_mat(name)
    setin(pb, "Metallic", metallic)
    setin(pb, "Roughness", rough)
    setin(pb, "Coat Weight", 0.4)
    setin(pb, "Coat Roughness", 0.2)
    setin(pb, "Specular IOR Level", 0.5)
    camd = nt.nodes.new("ShaderNodeCameraData")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = d0, d1
    nt.links.new(camd.outputs["View Distance"], mr.inputs["Value"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position, cr.elements[0].color = 0.0, hex2lin(near)
    cr.elements[1].position, cr.elements[1].color = 1.0, hex2lin(far)
    e = cr.elements.new(0.32)
    e.color = hex2lin(mid)
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], pb.inputs["Base Color"])
    # far bands lose their sheen too, so the top of the frame stays flat and dark
    for sock, hi_, lo_ in (("Specular IOR Level", 0.5, 0.03), ("Coat Weight", 0.4, 0.0), ("Metallic", metallic, 0.0)):
        m2 = nt.nodes.new("ShaderNodeMapRange")
        m2.inputs["From Min"].default_value, m2.inputs["From Max"].default_value = 0.0, fall
        m2.inputs["To Min"].default_value, m2.inputs["To Max"].default_value = hi_, lo_
        nt.links.new(mr.outputs["Result"], m2.inputs["Value"])
        nt.links.new(m2.outputs["Result"], pb.inputs[sock])
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    nt.links.new(oi.outputs["Alpha"], pb.inputs["Alpha"])
    m.surface_render_method = "DITHERED"
    return m
