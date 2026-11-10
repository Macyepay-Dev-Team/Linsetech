"""
glass.py — the brand's clear glass, path-traced (Cycles), for the /brand page and the social templates.

The owner rejected the EEVEE glass (frosted, then "fake" Fresnel-alpha glass that turned milky on thick edges) and asked
for the NexaVest look: truly clear glass, the background seen straight through, bright highlights on thick bevels and
rainbow fringes at the edges. So this is real glass:
- Cycles, refraction and reflection traced, "transparent glass" film: what is seen through the glass is the page
  behind it (the PNG is transparent there), while highlights, internal reflections and objects inside stay;
- chromatic dispersion by the classic split: three Glass BSDFs (red, green, blue) with slightly different IORs, added;
- a faint green volume absorption, so thick parts tint like real glass;
- a dark studio lit by thin strip lights (long crisp highlights) and a green back light.

    Blender -b -P glass.py -- --preview        # SHOT=hero (default) | tile, 25 %
    SHOT=tile Blender -b -P glass.py           # full size -> out/glass/<shot>_0001.png
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *  # noqa
from common import _new_mat

ARGS = parse_args()
SHOT = os.environ.get("SHOT", "hero")
W = H = 1600 if SHOT == "hero" else 1000
OUT_DIR = os.path.join(OUT, "glass")
os.makedirs(OUT_DIR, exist_ok=True)

scene = reset_scene()
setup_render(scene, W, H, 30, 1, ARGS, transparent=True, view="Standard", look=None)
r = scene.render
r.engine = "CYCLES"
cy = scene.cycles
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == "METAL"
cy.device = "GPU"
cy.samples = ARGS["samples"] or (96 if ARGS["preview"] else int(os.environ.get("SAMPLES", "512")))
cy.use_denoising = True
cy.film_transparent_glass = True
cy.film_transparent_roughness = 0.1
cy.max_bounces, cy.transmission_bounces, cy.glossy_bounces, cy.transparent_max_bounces = 32, 24, 12, 16
cy.diffuse_bounces, cy.volume_bounces = 4, 2
cy.caustics_reflective = False
cy.caustics_refractive = False
cy.blur_glossy = 0.4
cy.sample_clamp_indirect = float(os.environ.get("CLAMP", "6"))
scene.view_settings.exposure = float(os.environ.get("EXPOSURE", "0.0"))

# dark studio: a dim HDRI for reflections, thin strip lights for the long highlights, a green back light
setup_world(scene, strength=float(os.environ.get("HDR_STR", "0.25")), gradient=None, rotation=math.radians(float(os.environ.get("HDR_ROT", "35"))))
add_light(scene, "StripTop", (-1.5, -6, 7), (0, 0, 0), float(os.environ.get("TOP", "900")), 9, color=(1, 1, 1), size_y=0.35)
add_light(scene, "StripLeft", (-7, -4, 1), (0, 0, 0), float(os.environ.get("LEFT", "700")), 0.3, color=(0.95, 1, 0.97), size_y=8)
add_light(scene, "StripRight", (7, -3, 2), (0, 0, 0), float(os.environ.get("RIGHT", "600")), 0.3, color=(0.75, 1, 0.85), size_y=8)
back = add_light(scene, "Back", (0.5, 7, 0.5), (0, 0, 0), float(os.environ.get("BACK", "900")), 4, color=(0.3, 1, 0.5))
back.visible_transmission = False  # seen through the glass it reads as a white block; keep it for the green rims only
add_light(scene, "Key", (-6, -9, 6), (0, 0, 0), float(os.environ.get("KEY", "260")), 6, color=(1, 1, 1))


def mat_glass(name="glass", ior=1.45, spread=0.03, tint="#E6FFF0", density=0.25):
    """Clear dispersive glass: R/G/B Glass BSDFs at IOR -spread / 0 / +spread, added; a faint green absorption."""
    m, nt, pb, out = _new_mat(name)
    nt.nodes.remove(pb)
    add1 = nt.nodes.new("ShaderNodeAddShader")
    add2 = nt.nodes.new("ShaderNodeAddShader")
    gs = []
    for col, d in (((1, 0, 0, 1), -spread), ((0, 1, 0, 1), 0.0), ((0, 0, 1, 1), spread)):
        g = nt.nodes.new("ShaderNodeBsdfGlass")
        g.distribution = "MULTI_GGX"
        g.inputs["Color"].default_value = col
        g.inputs["Roughness"].default_value = 0.0
        g.inputs["IOR"].default_value = ior + d
        gs.append(g)
    nt.links.new(gs[0].outputs[0], add1.inputs[0])
    nt.links.new(gs[1].outputs[0], add1.inputs[1])
    nt.links.new(add1.outputs[0], add2.inputs[0])
    nt.links.new(gs[2].outputs[0], add2.inputs[1])
    nt.links.new(add2.outputs[0], out.inputs["Surface"])
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = hex2lin(tint)
    vol.inputs["Density"].default_value = density
    nt.links.new(vol.outputs[0], out.inputs["Volume"])
    return m


def mat_glow(name="glow", color="#22C55E", strength=6.0):
    """Soft round emission (fades out at radius 1 in object space), transparent elsewhere."""
    m, nt, pb, out = _new_mat(name)
    nt.nodes.remove(pb)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    nt.links.new(tc.outputs["Object"], grad.inputs["Vector"])
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 2.2
    nt.links.new(grad.outputs["Fac"], pw.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = hex2lin(color)
    em.inputs["Strength"].default_value = strength
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(pw.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


glass = mat_glass("glass", ior=float(os.environ.get("IOR", "1.45")), spread=float(os.environ.get("SPREAD", "0.035")), density=float(os.environ.get("DENSITY", "0.25")))
chrome = mat_chrome("chrome", color=(0.9, 0.93, 0.91), rough=float(os.environ.get("CHROME_ROUGH", "0.06")), coat=0.8)
glow = mat_glow("glow", strength=float(os.environ.get("GLOW", "2.6")))


def glow_plane(parent, r, loc):
    o = mesh_object(scene, "Glow", bm_box(2.0, 0.002, 2.0), glow, smooth=False, parent=parent)
    o.scale = (r, 1, r)
    o.location = loc
    o.visible_shadow = False
    return o


rig = add_empty(scene, "Rig")
if SHOT == "hero":
    D = float(os.environ.get("D", "7.6"))
    add_camera(scene, (0, -D, 0.55), (0, 0, 0.05), lens=50)
    rig.rotation_euler = (math.radians(8), 0, math.radians(float(os.environ.get("YAW", "-24"))))
    F, T = 3.3, 0.2
    mesh_object(scene, "Frame", bm_frame(F, F, T, 0.34, bevel=0.035), chrome, parent=rig)
    mesh_object(scene, "Panel", bm_box(F - 2 * T + 0.02, 0.12, F - 2 * T + 0.02, bevel=0.03, seg=4), glass, parent=rig)
    glow_plane(rig, float(os.environ.get("GLOW_R", "1.5")), (0.05, 0.45, -0.1))
    s = LOGO_SCALE * float(os.environ.get("MARK_S", "0.84"))
    m = mesh_object(scene, "Mark", bm_logo_mark(scale=s, depth=150, bevel=26, segs=6), glass, parent=rig)
    m.location = (0, -0.34, 0.02)
else:
    # the square unit in glass: a thick clear block with rounded edges, a chrome LS mark held inside it
    D = float(os.environ.get("D", "6.2"))
    add_camera(scene, (0, -D, 1.1), (0, 0, 0), lens=50)
    rig.rotation_euler = (math.radians(22), 0, math.radians(-30))
    mesh_object(scene, "Tile", bm_box(2.1, 0.8, 2.1, bevel=0.26, seg=8), glass, parent=rig)
    mesh_object(scene, "Inner", bm_logo_mark(scale=LOGO_SCALE * 0.52, depth=46, bevel=6, segs=3), chrome, parent=rig)
    glow_plane(rig, 1.0, (0, 0.9, 0))

render_frames(scene, SHOT, [1], OUT_DIR, skip_existing=False)
log("done", SHOT)
