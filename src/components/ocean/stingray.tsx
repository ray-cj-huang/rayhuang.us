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
  Plane,
  Raycaster,
  Vector2,
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

const NEAR_Z = 0.5;
const FAR_Z = -4;

// Two incommensurate periods (17 s and 29 s) so the near/far drift never visibly repeats.
function cruisingDepth(t: number) {
  const mid = (NEAR_Z + FAR_Z) / 2;
  const range = (NEAR_Z - FAR_Z) / 2;
  return (
    mid + range * (0.6 * Math.sin((2 * Math.PI * t) / 17) + 0.4 * Math.sin((2 * Math.PI * t) / 29 + 1.3))
  );
}

function useSwimPath(still: boolean, worldPosition?: Vector3, minWorldY = Number.NEGATIVE_INFINITY) {
  const follow = useRef<Group>(null);
  const { camera } = useThree();
  const state = useMemo(
    () => ({
      active: false,
      ndc: new Vector2(),
      raycaster: new Raycaster(),
      plane: new Plane(new Vector3(0, 0, 1), 0),
      hit: new Vector3(),
      world: new Vector3(),
      target: new Vector3(),
      last: new Vector3(),
      speed: 0,
    }),
    [],
  );

  // Listen on window because the canvas ignores pointer events, so it never blocks clicks or scrolling.
  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      state.ndc.set(
        MathUtils.clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1),
        MathUtils.clamp(-((e.clientY / window.innerHeight) * 2 - 1), -1, 1),
      );
      state.active = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still, state]);

  useFrame(({ clock }, delta) => {
    const g = follow.current;
    if (!g?.parent) return;
    const dt = Math.min(delta, 1 / 20);
    state.target.set(0, 0, still ? 0 : cruisingDepth(clock.elapsedTime));

    if (state.active) {
      // Cast the cursor onto the plane at the ray's current depth, so it stays under the cursor near or far.
      g.getWorldPosition(state.world);
      state.plane.constant = -state.world.z;
      state.raycaster.setFromCamera(state.ndc, camera);
      if (state.raycaster.ray.intersectPlane(state.plane, state.hit)) {
        state.hit.y = Math.max(state.hit.y, minWorldY);
        g.parent.worldToLocal(state.hit);
        state.target.x = state.hit.x;
        state.target.y = state.hit.y;
      }
    }

    state.last.copy(g.position);
    // Exponential easing on delta keeps the drift speed independent of frame rate.
    const ease = 1 - Math.exp(-dt * 0.9);
    g.position.lerp(state.target, ease);
    const vx = (g.position.x - state.last.x) / dt;
    const vy = (g.position.y - state.last.y) / dt;
    state.speed = MathUtils.lerp(state.speed, Math.hypot(vx, vy, (g.position.z - state.last.z) / dt), 0.1);

    // Turn toward the direction of travel and roll into the turn.
    const turn = ease * 2;
    g.rotation.y = MathUtils.lerp(g.rotation.y, MathUtils.clamp(vx * 0.6, -0.7, 0.7), turn);
    g.rotation.x = MathUtils.lerp(g.rotation.x, MathUtils.clamp(-vy * 0.4, -0.4, 0.4), turn);
    g.rotation.z = MathUtils.lerp(g.rotation.z, MathUtils.clamp(-vx * 0.35, -0.45, 0.45), turn);

    if (worldPosition) g.getWorldPosition(worldPosition);
  });

  return { follow, motion: state };
}

/**
 * Procedural stingray whose fins ripple nose to tail.
 * On desktop it slowly follows the mouse; touch input is ignored.
 *
 * Model space: x spans the wings, y is up, and the nose points to +z.
 *
 * It drifts nearer and farther on its own, so its apparent size changes as it swims.
 *
 * @param still - Freeze the animation, for `prefers-reduced-motion`.
 * @param worldPosition - Receives the ray's world position every frame, e.g. for fish to avoid.
 * @param minWorldY - Lowest world y it will follow the cursor to, to keep it above the seafloor.
 */
export function Stingray({
  still = false,
  worldPosition,
  minWorldY,
}: {
  still?: boolean;
  worldPosition?: Vector3;
  minWorldY?: number;
}) {
  const swim = useRef<Group>(null);
  const finPhase = useRef(0);
  const body = useMemo(buildBody, []);
  const tail = useMemo(buildTail, []);
  const { follow, motion } = useSwimPath(still, worldPosition, minWorldY);

  useFrame(({ clock }, delta) => {
    const t = still ? 0.6 : clock.elapsedTime;
    // Rays swim faster by beating their fins more often, not harder (Blevins & Lauder 2012).
    if (!still) finPhase.current += Math.min(delta, 1 / 20) * 2.1 * (1 + Math.min(motion.speed / 1.5, 1));
    const phase = still ? 1.3 : finPhase.current;

    const pos = body.geometry.getAttribute("position") as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let k = 0; k < arr.length / 3; k++) {
      // Scale by real distance from the midline, not the row-relative u.
      // Rows at the snout and rear are narrow, and flapping their edges fully pinches the tips.
      const reach = Math.abs(body.base[k * 3]) / HALF_SPAN;
      const v = body.uv[k * 2 + 1];
      // Amplitude ramps up to about mid-disc, then plateaus, as measured in freshwater stingrays.
      const flap = 0.26 * MathUtils.smoothstep(reach, 0, 0.55) * Math.sin(phase - v * 3.2);
      arr[k * 3 + 1] = body.base[k * 3 + 1] + flap;
    }
    pos.needsUpdate = true;
    body.geometry.computeVertexNormals();

    const tpos = tail.geometry.getAttribute("position") as BufferAttribute;
    const tarr = tpos.array as Float32Array;
    for (let k = 0; k < tarr.length / 3; k++) {
      const towardTip = Math.max(0, -tail.base[k * 3 + 2] - LENGTH / 2) / TAIL_LENGTH;
      tarr[k * 3] = tail.base[k * 3] + Math.sin(phase - towardTip * 4) * 0.22 * towardTip ** 2;
      tarr[k * 3 + 1] = tail.base[k * 3 + 1] + Math.sin(phase - 3.2 - towardTip * 3) * 0.08 * towardTip;
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
