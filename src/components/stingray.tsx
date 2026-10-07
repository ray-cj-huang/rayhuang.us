"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  type Group,
  MathUtils,
  Vector3,
} from "three";

// Procedural stingray: a rounded disc whose pectoral fins ripple with a wave
// travelling nose → tail, plus a whip tail that sways. On desktop it
// slowly follows the mouse cursor. Local axes:
// x = span (left/right), y = up, z = forward (nose at +z).

const SEG_U = 64; // across the span
const SEG_V = 56; // nose to rear
const SPAN = 1.85; // half-width at the widest point
const LENGTH = 1.85;
const DOME = 0.15;
const TAIL_LENGTH = 2.4;
const WIDEST = 0.45; // where along the body (0 = nose, 1 = rear) the disc is widest
const ROUNDNESS = 2.1; // superellipse exponent: 1 = diamond, 2 = ellipse

const TOP = new Color("#3b5bdb");
const EDGE = new Color("#a5b6ff");
const BELLY = new Color("#eef1ff");

/** Half-width of the disc at v ∈ [0, 1]: a superellipse skewed so the snout is a little blunter. */
function halfWidth(v: number) {
  const t = v < WIDEST ? (WIDEST - v) / WIDEST : (v - WIDEST) / (1 - WIDEST);
  return SPAN * Math.max(0, 1 - t ** ROUNDNESS) ** (1 / ROUNDNESS);
}

/** Body thickness at (u, v): a central dome that flattens into a thin but rounded rim. */
function thickness(u: number, v: number) {
  const along = Math.max(Math.sin(Math.PI * v), 0) ** 0.5;
  const across = 1 - u * u;
  return DOME * along * (0.1 * Math.sqrt(across) + 0.9 * across ** 1.8);
}

function buildBody() {
  const cols = SEG_U + 1;
  const rows = SEG_V + 1;
  const perSurface = cols * rows;
  const base = new Float32Array(perSurface * 2 * 3);
  const colors = new Float32Array(perSurface * 2 * 3);
  const uv = new Float32Array(perSurface * 2 * 2); // (u, v) kept for animation
  const c = new Color();

  for (let s = 0; s < 2; s++) {
    const top = s === 0;
    for (let j = 0; j < rows; j++) {
      // Cosine spacing packs rows near the snout and rear, where the outline curves fastest;
      // evenly spaced rows leave a flat, pointy facet at the tip.
      const v = (1 - Math.cos((Math.PI * j) / SEG_V)) / 2;
      const w = halfWidth(v);
      for (let i = 0; i < cols; i++) {
        const u = (i / SEG_U) * 2 - 1;
        const k = s * perSurface + j * cols + i;
        const h = thickness(u, v);
        base[k * 3] = u * w;
        base[k * 3 + 1] = top ? h : -h * 0.45;
        base[k * 3 + 2] = (0.5 - v) * LENGTH;
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
        if (top) c.copy(TOP).lerp(EDGE, ((Math.abs(u) * w) / SPAN) ** 2);
        else c.copy(BELLY);
        colors.set([c.r, c.g, c.b], k * 3);
      }
    }
  }

  const index: number[] = [];
  for (let s = 0; s < 2; s++) {
    const o = s * perSurface;
    for (let j = 0; j < SEG_V; j++) {
      for (let i = 0; i < SEG_U; i++) {
        const a = o + j * cols + i;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        // Opposite winding on the belly so both surfaces face outward.
        if (s === 0) index.push(a, b, d, b, e, d);
        else index.push(a, d, b, b, d, e);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(base.slice(), 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, base, uv };
}

function buildTail() {
  // Thin cone lying along -z, starting just inside the rear of the disc.
  const geometry = new CylinderGeometry(0.08, 0.004, TAIL_LENGTH, 10, 32, true);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -LENGTH / 2 - TAIL_LENGTH / 2 + 0.15);
  const base = (geometry.getAttribute("position").array as Float32Array).slice();
  return { geometry, base };
}

function useFollowCursor(still: boolean) {
  const follow = useRef<Group>(null);
  const { viewport, gl } = useThree();
  const state = useMemo(() => ({ cursor: new Vector3(), target: new Vector3(), active: false }), []);

  // Track the mouse anywhere on the page (the canvas itself ignores pointer events so it never
  // blocks clicks or scrolling). Touch and pen input are ignored, so phones just watch it swim.
  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      // Camera looks straight down -z, so NDC maps linearly onto the z = 0 plane.
      state.cursor.set(
        MathUtils.clamp(nx, -1, 1) * (viewport.width / 2),
        MathUtils.clamp(ny, -1, 1) * (viewport.height / 2),
        0,
      );
      state.active = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl, viewport, still, state]);

  // Drift slowly toward the cursor and bank into the direction of travel.
  useFrame((_, delta) => {
    const g = follow.current;
    if (!g?.parent || !state.active) return;
    state.target.copy(state.cursor);
    g.parent.worldToLocal(state.target);
    const ease = 1 - Math.exp(-delta * 0.9); // frame-rate independent; ~1s to close most of the gap
    const dx = state.target.x - g.position.x;
    g.position.lerp(state.target, ease);
    g.rotation.z = MathUtils.lerp(g.rotation.z, MathUtils.clamp(-dx * 0.25, -0.45, 0.45), ease * 2);
  });

  return follow;
}

export function Stingray({ still = false }: { still?: boolean }) {
  const swim = useRef<Group>(null);
  const body = useMemo(buildBody, []);
  const tail = useMemo(buildTail, []);
  const follow = useFollowCursor(still);

  useFrame(({ clock }) => {
    const t = still ? 0.6 : clock.elapsedTime;

    // Fin ripple: amplitude grows toward the wingtips, wave travels nose → tail.
    const pos = body.geometry.getAttribute("position") as BufferAttribute;
    const arr = pos.array as Float32Array;
    // Scale by real distance from the midline, not the normalized row position: rows at the
    // snout and rear are narrow, and flapping their edges fully would pinch the tips into points.
    for (let k = 0; k < arr.length / 3; k++) {
      const reach = Math.abs(body.base[k * 3]) / SPAN;
      const v = body.uv[k * 2 + 1];
      const flap = 0.38 * reach ** 2 * Math.sin(t * 2.1 - v * 3.2);
      arr[k * 3 + 1] = body.base[k * 3 + 1] + flap;
    }
    pos.needsUpdate = true;
    body.geometry.computeVertexNormals();

    // Tail: lateral sway that lags further down the whip.
    const tpos = tail.geometry.getAttribute("position") as BufferAttribute;
    const tarr = tpos.array as Float32Array;
    for (let k = 0; k < tarr.length / 3; k++) {
      const d = Math.max(0, -tail.base[k * 3 + 2] - LENGTH / 2) / TAIL_LENGTH; // 0 at root → 1 at tip
      tarr[k * 3] = tail.base[k * 3] + Math.sin(t * 2.1 - d * 4) * 0.22 * d * d;
      tarr[k * 3 + 1] = tail.base[k * 3 + 1] + Math.sin(t * 2.1 - 3.2 - d * 3) * 0.08 * d;
    }
    tpos.needsUpdate = true;

    // Whole-body glide: gentle bob and roll.
    if (swim.current && !still) {
      swim.current.position.y = Math.sin(t * 0.8) * 0.12;
      swim.current.rotation.z = Math.sin(t * 0.5) * 0.12;
    }
  });

  return (
    <group ref={follow}>
      <group ref={swim} rotation={[0.85, -0.6, 0]}>
        <mesh geometry={body.geometry}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.4}
            metalness={0.05}
            clearcoat={0.5}
            clearcoatRoughness={0.45}
          />
        </mesh>
        <mesh geometry={tail.geometry}>
          <meshStandardMaterial color="#2f4ac0" roughness={0.5} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.22, DOME * 0.95, LENGTH * 0.22]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#0b1020" roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
