"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, CylinderGeometry, type Group } from "three";

// Procedural stingray: a lens-shaped disc whose pectoral fins ripple with a
// wave travelling nose → tail, plus a whip tail that sways. Local axes:
// x = span (left/right), y = up, z = forward (nose at +z).

const SEG_U = 48; // across the span
const SEG_V = 40; // nose to rear
const SPAN = 1.6; // half-width at the widest point
const LENGTH = 2.0;
const DOME = 0.22;
const TAIL_LENGTH = 2.4;

const TOP = new Color("#3b5bdb");
const EDGE = new Color("#9fb3ff");
const BELLY = new Color("#e8edff");

/** Half-width of the disc at v ∈ [0, 1] (0 = nose, 1 = rear). */
function halfWidth(v: number) {
  // Rhombus with pointed wingtips at v = TIP, a rounded snout and a tapered rear.
  const TIP = 0.42;
  return v < TIP ? SPAN * (v / TIP) ** 0.6 : SPAN * ((1 - v) / (1 - TIP)) ** 1.1;
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
      const v = j / SEG_V;
      const w = halfWidth(v);
      const bulge = Math.max(Math.sin(Math.PI * v), 0) ** 0.8;
      for (let i = 0; i < cols; i++) {
        const u = (i / SEG_U) * 2 - 1;
        const k = s * perSurface + j * cols + i;
        const dome = DOME * (1 - u * u) ** 1.5 * bulge;
        base[k * 3] = u * w;
        base[k * 3 + 1] = top ? dome : -dome * 0.35;
        base[k * 3 + 2] = (0.5 - v) * LENGTH;
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
        if (top) c.copy(TOP).lerp(EDGE, Math.abs(u) ** 2.2);
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
        // Flip winding on the belly so both faces point outward.
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
  // Thin cone lying along -z, starting at the rear of the disc.
  const geometry = new CylinderGeometry(0.06, 0.004, TAIL_LENGTH, 8, 32, true);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -LENGTH / 2 - TAIL_LENGTH / 2 + 0.1);
  const base = (geometry.getAttribute("position").array as Float32Array).slice();
  return { geometry, base };
}

export function Stingray({ still = false }: { still?: boolean }) {
  const group = useRef<Group>(null);
  const body = useMemo(buildBody, []);
  const tail = useMemo(buildTail, []);

  useFrame(({ clock, pointer }) => {
    const t = still ? 0.6 : clock.elapsedTime;

    // Fin ripple: amplitude grows toward the wingtips, wave travels nose → tail.
    const pos = body.geometry.getAttribute("position") as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let k = 0; k < arr.length / 3; k++) {
      const u = body.uv[k * 2];
      const v = body.uv[k * 2 + 1];
      const flap = 0.42 * Math.abs(u) ** 1.8 * Math.sin(t * 2.1 - v * 3.2);
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

    // Whole-body glide: bob, gentle bank, and turn slightly toward the pointer.
    if (group.current && !still) {
      const g = group.current;
      g.position.y = Math.sin(t * 0.8) * 0.12;
      g.rotation.z = Math.sin(t * 0.5) * 0.12;
      g.rotation.y += (-0.6 + pointer.x * 0.35 - g.rotation.y) * 0.03;
      g.rotation.x += (0.85 - pointer.y * 0.2 - g.rotation.x) * 0.03;
    }
  });

  return (
    <group ref={group} rotation={[0.85, -0.6, 0]}>
      <mesh geometry={body.geometry}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.35}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.4}
        />
      </mesh>
      <mesh geometry={tail.geometry}>
        <meshStandardMaterial color="#2f4ac0" roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.22, DOME * 0.9, LENGTH * 0.24]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#0b1020" roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
