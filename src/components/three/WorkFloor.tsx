"use client";
/**
 * Puture's Work chapter: the projects stand on a white grid floor as framed panels (16:9 landscape or 9:16
 * portrait), zig-zagging left/right and receding 2.5 units per project. The camera flies from one to the next;
 * each panel lies flat until the camera arrives, then rotates up out of the grid (and lies back down as the
 * camera walks on). While a project is held the camera slowly orbits it and dollies in. The pull-back at the
 * end lifts the camera over the whole floor while the icon tiles settle on the grid.
 * Hover is Puture's: a raycast every frame from the shared pointer (so a still pointer catches a panel rising under it),
 * feeding the grid spot and the DOM exhibit cursor; a click on a risen panel leaves through the pixel wave.
 */
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRouter } from "@/i18n/navigation";
import type { CardShape } from "@/content/work";
import type { WorkPacing } from "@/components/sections/WorkPacing";
import type { ExhibitHover } from "@/components/sections/work/ExhibitCursor";
import { waveTo } from "@/components/sections/work/pixelWave";
import { cn } from "@/lib/cn";
import { useCanvasVisible } from "./useCanvasVisible";
import { useContextRecovery } from "./useContextRecovery";
import CanvasBoundary from "./CanvasBoundary";
import { CANVAS_CAMERA, CANVAS_DPR, Space, SpaceBackdrop, SpaceTimeline, canvasPointer, forgetPointer, frame, gridPoint, handoffFrame, useSpace, type SpaceParams, type TileChipState } from "./WorkSpace";

export type FloorCard = { slug: string; title: string; cover: string | null; shape: CardShape; accent: string; /** a 3D model (GLB) standing in for the panel */ model?: string };

const HALF = 1.5;
/** Panel size: landscape 6 × 3.375, portrait 3 × 5.33 (world units). */
export function cardSize(shape: CardShape): [number, number] {
  return shape === "landscape" ? [HALF * 4, (HALF * 4 * 9) / 16] : [HALF * 2, (HALF * 2 * 16) / 9];
}
/** Each panel's foot on the grid: alternating ±4.5 in x, 2.5 further back per project. */
export function cardFoot(i: number): [number, number] {
  return [i % 2 ? 4.5 : -4.5, 4.5 - 2.5 * i];
}

const FRAME_DEPTH = 0.08;
const FRAME_INSET = 0.06;
const smoothstep = THREE.MathUtils.smoothstep;

/** Shared parameters of the light Work space (Puture's `I`) and its dark variant. */
const base = (dark: boolean): Partial<SpaceParams> =>
  dark
    ? { light: 0, sky: -1.15, grid: 1, pitch: 0, spin: 0, gY: -1.6, gZ: -3, wave: 0.4, flow: 0.6, dust: 0.6, roll: 0 }
    : { light: 1, sky: -1.6, grid: 1, pitch: 0, spin: 0, gY: -1.6, gZ: -3, wave: 0.4, flow: 0.6, dust: 0.15, roll: 0 };

function cardView(i: number, shape: CardShape, b: Partial<SpaceParams>): Partial<SpaceParams> {
  const [x, z] = cardFoot(i);
  const [, h] = cardSize(shape);
  const portrait = shape !== "landscape";
  // a tall panel stands further off and a little lower: at 10 its top ran under the header once the hold dollied in
  return { tgtX: (b.gX ?? 0) + x, tgtY: (b.gY ?? 0) + h / 2, tgtZ: (b.gZ ?? 0) + z, azim: 8, elev: 9, dist: portrait ? 11.5 : 8.7, fov: 40, pan: 0.28, panY: portrait ? -0.04 : 0 };
}

function buildTimeline(cards: FloorCard[], pacing: WorkPacing, dark: boolean, mobile: boolean, handoff: boolean) {
  const I = base(dark);
  const R: Partial<SpaceParams> = { ...I, wave: 0, flow: 0, orbit: 0, exhibit: 1 };
  const n = cards.length;
  const m = (o: Partial<SpaceParams> = {}) => (mobile ? o : false);
  return new SpaceTimeline([
    // phones: no ring during the opening (award) beat, so the tiles do not cluster above the headline
    { at: 0, frame: frame("halo", { ...I, ring: 7.9, ringTilt: 90 }, m({ orbit: 0 })) },
    // phones: a portrait panel sits smaller and lower than a landscape one, so its top clears the header and its foot the copy
    ...cards.map((c, i) => ({
      at: pacing.cards[i].at,
      frame: frame("halo", { ...R, ...cardView(i, c.shape, I), raised: i + 1 }, m({ pan: 0, panY: c.shape === "landscape" ? 0.4 : 0.31, azim: 4, dist: c.shape === "landscape" ? 11 : 12.5 })),
    })),
    {
      at: pacing.fold.at,
      frame: frame(
        "halo",
        { ...I, wave: 0, flow: 0, orbit: 0, settle: 1, raised: n, tgtX: 2, tgtY: -1.2, tgtZ: Math.min(-5, -3 + 4.5 - 1.25 * (n - 1) - 2), azim: 10, elev: 30, dist: 14 + n * 0.7 },
        m({ panY: 0.2, dist: 20 + n * 0.7 }),
      ),
    },
    // the pull-back keeps going into the dark opening frame of the Process chapter
    ...(handoff ? [{ at: pacing.end, frame: handoffFrame(mobile) }] : []),
  ]);
}

/* ------------------------------------------------------------------------------------------------- panels */

let shadowTex: THREE.CanvasTexture | null = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#000000");
  ctx.setTransform(1, 0, 0, 0.25, 0, 0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

/** Cover-fit a texture onto a panel of the given aspect. A vertical crop keeps the top: these are screenshots, and a
 *  centred crop sliced the MacyePay dashboard's title in half (a 4:3 shot on a 16:9 panel). */
function coverFit(tex: THREE.Texture, w: number, h: number, aspect: number) {
  const ia = w / Math.max(h, 1);
  tex.repeat.set(ia > aspect ? aspect / ia : 1, ia > aspect ? 1 : ia / aspect);
  tex.offset.set((1 - tex.repeat.x) / 2, 1 - tex.repeat.y);
}

function placeholderTexture(card: FloorCard, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = Math.round((640 * h) / w);
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, "#0b3d2e");
  g.addColorStop(1, card.accent);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  for (let x = 0; x < c.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }
  for (let y = 0; y < c.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 40px Archivo, system-ui, sans-serif";
  ctx.fillText(card.title, 36, c.height - 44);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** How far panel i has risen: fully up within ±.15 of `raised`, flat beyond ±.85 (Puture's fn). */
function raise(p: SpaceParams, i: number) {
  const u = 1 - (Math.abs(p.raised - (i + 1)) - 0.15) / 0.7;
  return smoothstep(u, 0, 1) * smoothstep(p.exhibit, 0, 1);
}

const _tilt = new THREE.Quaternion();
const _flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const _axisX = new THREE.Vector3(1, 0, 0);

function Panel({ card, index, dark, faces }: { card: FloorCard; index: number; dark: boolean; faces: RefObject<(THREE.Mesh | null)[]> }) {
  const st = useSpace();
  const router = useRouter();
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const frameMat = useRef<THREE.MeshStandardMaterial>(null);
  const faceMat = useRef<THREE.MeshBasicMaterial>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const loaded = useRef(false);
  const [w, h] = cardSize(card.shape);
  const [x, z] = cardFoot(index);

  useEffect(() => {
    loaded.current = false;
    const mat = faceMat.current;
    return () => {
      mat?.map?.dispose();
    };
  }, [card.cover]);

  useFrame(() => {
    const g = group.current;
    const s = shadow.current;
    if (!g || !s || !frameMat.current || !faceMat.current || !shadowMat.current) return;
    const p = st.p;
    const u = raise(p, index);
    // load the cover once the floor renders (half a screen before the chapter): loading it as the panel was about to rise
    // showed a grey slab until the file arrived, on a slow connection for most of the hold
    if (!loaded.current) {
      loaded.current = true;
      const mat = faceMat.current;
      if (card.cover) {
        new THREE.TextureLoader().load(card.cover, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          coverFit(tex, tex.image.width, tex.image.height, w / h);
          mat.map = tex;
          mat.color.set("#ffffff");
          mat.needsUpdate = true;
        });
      } else {
        mat.map = placeholderTexture(card, w, h);
        mat.color.set("#ffffff");
        mat.needsUpdate = true;
      }
    }
    g.visible = s.visible = u > 0.002;
    if (!g.visible) return;
    gridPoint(st, x, z, 0, g.position);
    g.quaternion.copy(st.grid.quaternion).multiply(_tilt.setFromAxisAngle(_axisX, -(1 - u) * (Math.PI / 2)));
    gridPoint(st, x, z, 0.01, s.position);
    s.quaternion.copy(st.grid.quaternion).multiply(_flat);
    frameMat.current.opacity = smoothstep(u, 0, 0.25);
    faceMat.current.opacity = smoothstep(u, 0.1, 0.55);
    shadowMat.current.opacity = (dark ? 0.3 : 0.14) * u;
    g.updateMatrixWorld(); // the hover raycast reads it this frame
  });

  // a risen panel opens its case study through Puture's pixel wave, from the click point
  const open = (e: ThreeEvent<MouseEvent>) => {
    if (raise(st.p, index) <= 0.9) return;
    document.documentElement.style.removeProperty("cursor");
    waveTo(`/work/${card.slug}`, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }, (href) => router.push(href as never, { scroll: false }));
  };

  return (
    <>
      <group ref={group}>
        <mesh position={[0, h / 2, -FRAME_DEPTH / 2]}>
          <boxGeometry args={[w, h, FRAME_DEPTH]} />
          <meshStandardMaterial ref={frameMat} color="#ffffff" roughness={0.55} transparent />
        </mesh>
        <mesh
          ref={(el) => void (faces.current[index] = el)}
          position={[0, h / 2, 0.002]}
          onClick={(e) => {
            e.stopPropagation();
            open(e);
          }}
        >
          <planeGeometry args={[w - FRAME_INSET * 2, h - FRAME_INSET * 2]} />
          <meshBasicMaterial ref={faceMat} color="#dfe8e2" transparent toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={shadow} renderOrder={-1}>
        <planeGeometry args={[w * 1.5, 2.4]} />
        <meshBasicMaterial ref={shadowMat} color="#04150f" alphaMap={shadowTexture()} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------------------------------------- 3D models */

/** The model's size and resting turn on the floor (the Linse POS terminal is ~3.6 × 3.3 units in its file). */
const MODEL_SCALE = 1.0;
const MODEL_YAW = -0.55;

/**
 * The GLB, cloned for this floor. Its shaders are compiled at idle time as soon as it loads: compiled on first sight
 * instead (mid-scroll, as the camera arrives), WebKit froze for up to a second.
 */
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const root = useThree((s) => s.scene);
  const obj = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    let live = true;
    const warm = () => {
      if (live) gl.compileAsync(obj, camera, root).catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => {
        live = false;
        window.cancelIdleCallback(id);
      };
    }
    const id = setTimeout(warm, 200);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [gl, camera, root, obj]);
  return <primitive object={obj} />;
}

/**
 * A project shown as a 3D object instead of a framed panel (the retail case's POS terminal): it stands on the panel's
 * foot, grows up out of the grid as the camera arrives (the panels' `raise`; no opacity fade, which made the materials
 * switch shader variants mid-scroll), turns from the side into a three-quarter view, then sways slowly while it is held.
 * An invisible box takes the hover raycast and the click, like a panel's face.
 */
function ModelPanel({ card, index, dark, faces }: { card: FloorCard; index: number; dark: boolean; faces: RefObject<(THREE.Mesh | null)[]> }) {
  const st = useSpace();
  const router = useRouter();
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const [w, h] = cardSize(card.shape);
  const [x, z] = cardFoot(index);

  useEffect(() => {
    if (card.model) useGLTF.preload(card.model);
  }, [card.model]);

  useFrame(({ clock }) => {
    const g = group.current;
    const b = body.current;
    const s = shadow.current;
    if (!g || !b || !s || !shadowMat.current) return;
    const u = raise(st.p, index);
    g.visible = s.visible = u > 0.002;
    if (!g.visible) return;
    gridPoint(st, x, z, 0, g.position);
    g.quaternion.copy(st.grid.quaternion);
    const k = smoothstep(u, 0.02, 0.9);
    b.scale.setScalar(MODEL_SCALE * Math.max(0.001, 1 - (1 - k) ** 3));
    b.rotation.y = MODEL_YAW - (1 - k) * 1.1 + Math.sin(clock.elapsedTime * 0.45) * 0.14 * k;
    gridPoint(st, x, z, 0.01, s.position);
    s.quaternion.copy(st.grid.quaternion).multiply(_flat);
    shadowMat.current.opacity = (dark ? 0.32 : 0.18) * u;
    g.updateMatrixWorld();
  });

  const open = (e: ThreeEvent<MouseEvent>) => {
    if (raise(st.p, index) <= 0.9) return;
    document.documentElement.style.removeProperty("cursor");
    waveTo(`/work/${card.slug}`, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }, (href) => router.push(href as never, { scroll: false }));
  };

  return (
    <>
      <group ref={group}>
        <group ref={body}>
          <Suspense fallback={null}>
            <Model url={card.model!} />
          </Suspense>
        </group>
        <mesh
          ref={(el) => void (faces.current[index] = el)}
          position={[0, h * 0.4, 0]}
          onClick={(e) => {
            e.stopPropagation();
            open(e);
          }}
        >
          <boxGeometry args={[w * 1.4, h * 0.8, 3]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      <mesh ref={shadow} renderOrder={-1}>
        <planeGeometry args={[w * 1.9, 3.2]} />
        <meshBasicMaterial ref={shadowMat} color="#04150f" alphaMap={shadowTexture()} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

function Panels({ cards, dark, hover }: { cards: FloorCard[]; dark: boolean; hover?: ExhibitHover }) {
  const st = useSpace();
  const faces = useRef<(THREE.Mesh | null)[]>([]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("cursor");
    },
    [],
  );
  useFrame(({ camera, gl }, delta) => {
    const dt = Math.min(delta, 0.05);
    // Puture's exhibit hover: the nearest fully risen panel under a resting fine pointer, every frame
    let hit = -1;
    if (st.p.exhibit > 0.5 && canvasPointer(gl.domElement, _ndc)) {
      _ray.setFromCamera(_ndc, camera);
      let best = Infinity;
      faces.current.forEach((m, i) => {
        if (!m || raise(st.p, i) <= 0.9) return;
        const h = _ray.intersectObject(m, false)[0];
        if (h && h.distance < best) {
          best = h.distance;
          hit = i;
        }
      });
    }
    if (hit !== st.spot.index) {
      if (hit >= 0) document.documentElement.style.cursor = "pointer";
      else document.documentElement.style.removeProperty("cursor");
    }
    if (hit >= 0) {
      const [x, z] = cardFoot(hit);
      st.spot.x = x;
      st.spot.z = z;
      st.spot.half = cardSize(cards[hit].shape)[0] / 2;
    }
    st.spot.index = hit;
    st.spot.amount = THREE.MathUtils.clamp(st.spot.amount + (hit >= 0 ? dt / 0.6 : -dt / 0.45), 0, 1);
    if (hover) {
      hover.index = hit;
      hover.amount = st.spot.amount;
    }
  });
  return (
    <>
      {cards.map((c, i) => (c.model ? <ModelPanel key={c.slug} card={c} index={i} dark={dark} faces={faces} /> : <Panel key={c.slug} card={c} index={i} dark={dark} faces={faces} />))}
    </>
  );
}

/* ------------------------------------------------------------------------------------------------- canvas */

type Props = {
  cards: FloorCard[];
  pacing: WorkPacing;
  screensRef: RefObject<number>;
  className?: string;
  dark?: boolean;
  handoff?: boolean;
  /** written every frame: the hovered exhibit and the hover amount (the DOM exhibit cursor reads it) */
  hover?: ExhibitHover;
  /** written every frame: the hovered icon tile (the DOM tile chip reads it) */
  chip?: TileChipState;
};

export default function WorkFloor({ cards, pacing, screensRef, className, dark = false, handoff = false, hover, chip }: Props) {
  const [wrap, visible] = useCanvasVisible();
  const [generation, watchContext] = useContextRecovery();
  const [ready, setReady] = useState(false);
  const timeline = useMemo(() => buildTimeline(cards, pacing, dark, false, handoff), [cards, pacing, dark, handoff]);
  const mobileTimeline = useMemo(() => buildTimeline(cards, pacing, dark, true, handoff), [cards, pacing, dark, handoff]);
  // a fresh view of the floor (also after Back): no hover until the pointer has moved here
  useEffect(() => forgetPointer(), []);

  return (
    // Puture's `.space-stage`: the canvas fades in over 1.4s once it exists
    <div ref={wrap} className={cn(className, "transition-opacity duration-[1400ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none", ready ? "opacity-100" : "opacity-0")}>
      <CanvasBoundary>
        <Canvas
          key={generation}
          dpr={CANVAS_DPR}
          flat
          frameloop={visible ? "always" : "never"}
          camera={CANVAS_CAMERA}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          style={{ background: dark ? "#020a07" : "#f7f9f7" }}
          onCreated={(state) => {
            watchContext(state);
            // the error check reads each program's compile log at once, forcing a blocking compile (60–100 ms frames)
            state.gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
            requestAnimationFrame(() => setReady(true));
          }}
        >
          <Space timeline={timeline} mobileTimeline={mobileTimeline} screensRef={screensRef}>
            <SpaceBackdrop env={1.2} chip={chip} />
            <Panels cards={cards} dark={dark} hover={hover} />
          </Space>
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
