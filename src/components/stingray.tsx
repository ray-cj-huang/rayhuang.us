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

const SPAN_SEGMENTS = 64;
const LENGTH_SEGMENTS = 56;
const HALF_SPAN = 1.85;
const LENGTH = 1.85;
const DOME = 0.15;
const TAIL_LENGTH = 2.4;
const WIDEST_AT = 0.45;
// Superellipse exponent for the outline: 1 is a diamond, 2 an ellipse.
const ROUNDNESS = 2.1;

const TOP = new Color("#3b5bdb");
const EDGE = new Color("#a5b6ff");
const BELLY = new Color("#eef1ff");

function halfWidth(v: number) {
  const t = v < WIDEST_AT ? (WIDEST_AT - v) / WIDEST_AT : (v - WIDEST_AT) / (1 - WIDEST_AT);
  return HALF_SPAN * Math.max(0, 1 - t ** ROUNDNESS) ** (1 / ROUNDNESS);
}

// The sqrt term keeps the rim rounded instead of tapering to a knife edge.
function thickness(u: number, v: number) {
  const along = Math.max(Math.sin(Math.PI * v), 0) ** 0.5;
  const across = 1 - u * u;
  return DOME * along * (0.1 * Math.sqrt(across) + 0.9 * across ** 1.8);
}

function buildBody() {
  const cols = SPAN_SEGMENTS + 1;
  const rows = LENGTH_SEGMENTS + 1;
  const perSurface = cols * rows;
  const base = new Float32Array(perSurface * 2 * 3);
  const colors = new Float32Array(perSurface * 2 * 3);
  const uv = new Float32Array(perSurface * 2 * 2);
  const c = new Color();

  for (let s = 0; s < 2; s++) {
    const top = s === 0;
    for (let j = 0; j < rows; j++) {
      // Cosine spacing packs rows near the snout and rear, where the outline curves fastest.
      // Even spacing leaves a flat, pointy facet at the tip.
      const v = (1 - Math.cos((Math.PI * j) / LENGTH_SEGMENTS)) / 2;
      const w = halfWidth(v);
      for (let i = 0; i < cols; i++) {
        const u = (i / SPAN_SEGMENTS) * 2 - 1;
        const k = s * perSurface + j * cols + i;
        const h = thickness(u, v);
        base[k * 3] = u * w;
        base[k * 3 + 1] = top ? h : -h * 0.45;
        base[k * 3 + 2] = (0.5 - v) * LENGTH;
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
        if (top) c.copy(TOP).lerp(EDGE, ((Math.abs(u) * w) / HALF_SPAN) ** 2);
        else c.copy(BELLY);
        colors.set([c.r, c.g, c.b], k * 3);
      }
    }
  }

  const index: number[] = [];
  for (let s = 0; s < 2; s++) {
    const o = s * perSurface;
    for (let j = 0; j < LENGTH_SEGMENTS; j++) {
      for (let i = 0; i < SPAN_SEGMENTS; i++) {
        const a = o + j * cols + i;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        // The belly winds the other way so both surfaces face outward.
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

  // Listen on window because the canvas ignores pointer events, so it never blocks clicks or scrolling.
  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      // The camera looks straight down -z, so NDC maps linearly onto the z = 0 plane.
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

  useFrame((_, delta) => {
    const g = follow.current;
    if (!g?.parent || !state.active) return;
    state.target.copy(state.cursor);
    g.parent.worldToLocal(state.target);
    // Exponential easing on delta keeps the drift speed independent of frame rate.
    const ease = 1 - Math.exp(-delta * 0.9);
    const dx = state.target.x - g.position.x;
    g.position.lerp(state.target, ease);
    g.rotation.z = MathUtils.lerp(g.rotation.z, MathUtils.clamp(-dx * 0.25, -0.45, 0.45), ease * 2);
  });

  return follow;
}

/**
 * Procedural stingray whose fins ripple nose to tail.
 * On desktop it slowly follows the mouse; touch input is ignored.
 *
 * Model space: x spans the wings, y is up, and the nose points to +z.
 *
 * @param still - Freeze the animation, for `prefers-reduced-motion`.
 */
export function Stingray({ still = false }: { still?: boolean }) {
  const swim = useRef<Group>(null);
  const body = useMemo(buildBody, []);
  const tail = useMemo(buildTail, []);
  const follow = useFollowCursor(still);

  useFrame(({ clock }) => {
    const t = still ? 0.6 : clock.elapsedTime;

    const pos = body.geometry.getAttribute("position") as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let k = 0; k < arr.length / 3; k++) {
      // Scale by real distance from the midline, not the row-relative u.
      // Rows at the snout and rear are narrow, and flapping their edges fully pinches the tips.
      const reach = Math.abs(body.base[k * 3]) / HALF_SPAN;
      const v = body.uv[k * 2 + 1];
      const flap = 0.38 * reach ** 2 * Math.sin(t * 2.1 - v * 3.2);
      arr[k * 3 + 1] = body.base[k * 3 + 1] + flap;
    }
    pos.needsUpdate = true;
    body.geometry.computeVertexNormals();

    const tpos = tail.geometry.getAttribute("position") as BufferAttribute;
    const tarr = tpos.array as Float32Array;
    for (let k = 0; k < tarr.length / 3; k++) {
      const towardTip = Math.max(0, -tail.base[k * 3 + 2] - LENGTH / 2) / TAIL_LENGTH;
      tarr[k * 3] = tail.base[k * 3] + Math.sin(t * 2.1 - towardTip * 4) * 0.22 * towardTip ** 2;
      tarr[k * 3 + 1] = tail.base[k * 3 + 1] + Math.sin(t * 2.1 - 3.2 - towardTip * 3) * 0.08 * towardTip;
    }
    tpos.needsUpdate = true;

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
