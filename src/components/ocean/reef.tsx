"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  type Group,
  IcosahedronGeometry,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { CAUSTIC_GLSL } from "./glsl";
import { BOMMIES, FLOOR_Y, TUFTS } from "./layout";
import { seeded } from "./random";
import { getScrollDepth } from "./scroll-depth";

type Rand = () => number;

const UP = new Vector3(0, 1, 0);

function paint(geometry: BufferGeometry, color: (p: Vector3) => Color) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const c = color(p.fromBufferAttribute(position, i));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

/** Strips to position (and color, if painted) so parts built from different three.js primitives can be merged. */
function bare(geometry: BufferGeometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  for (const name of Object.keys(g.attributes)) {
    if (name !== "position" && name !== "color") g.deleteAttribute(name);
  }
  return g;
}

function finish(parts: BufferGeometry[]) {
  // Re-weld shared vertices so normals average across faces; otherwise every surface renders faceted.
  const geometry = mergeVertices(mergeGeometries(parts), 1e-4);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSand() {
  const geometry = new PlaneGeometry(70, 46, 220, 140);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    // Broad, sinuous ripple ridges over gentle dunes, like current-swept sand in clear shallows.
    const ripples = 0.07 * Math.sin(x * 1.3 + 1.4 * Math.sin(z * 0.33) + 0.5 * Math.sin(x * 0.4));
    const dunes = 0.2 * Math.sin(x * 0.17 + z * 0.11) * Math.sin(z * 0.23 - x * 0.04);
    position.setY(i, ripples + dunes);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A lumpy dome: displaced icosphere, for reef rock and boulder corals. */
function lump(rand: Rand, roughness: number) {
  const k = Array.from(
    { length: 3 },
    () => [rand() * 6 - 3, rand() * 6 - 3, rand() * 6 - 3, rand() * 6] as const,
  );
  const geometry = new IcosahedronGeometry(1, 4);
  const position = geometry.getAttribute("position");
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const bump = k.reduce((sum, [a, b, c, ph]) => sum + Math.sin(p.x * a + p.y * b + p.z * c + ph), 0);
    p.multiplyScalar(1 + bump * roughness);
    position.setXYZ(i, p.x, Math.max(p.y, -0.15), p.z);
  }
  return bare(geometry);
}

function brainCoral(radius: number) {
  const geometry = bare(new SphereGeometry(radius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2));
  const position = geometry.getAttribute("position");
  const p = new Vector3();
  // Two interfering wavy grooves approximate the meandering valleys of Diploria brain coral.
  const ridgeAt = (q: Vector3) => {
    const theta = Math.atan2(q.z, q.x);
    const phi = Math.acos(Math.min(1, Math.max(-1, q.y / q.length())));
    return Math.abs(
      Math.sin(14 * theta + 5 * Math.sin(5 * phi)) * Math.sin(16 * phi + 3 * Math.sin(4 * theta)),
    );
  };
  const ridges = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    ridges[i] = ridgeAt(p);
    p.multiplyScalar(1 + 0.05 * ridges[i]);
    position.setXYZ(i, p.x, p.y * 0.8, p.z);
  }
  const ridge = new Color("#e2cf9d");
  const groove = new Color("#9c8758");
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const c = groove.clone().lerp(ridge, ridges[i]);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

function branch(
  parts: BufferGeometry[],
  rand: Rand,
  start: Vector3,
  dir: Vector3,
  length: number,
  radius: number,
  depth: number,
) {
  const cylinder = new CylinderGeometry(radius * 0.75, radius, length, 5, 1);
  cylinder.applyQuaternion(new Quaternion().setFromUnitVectors(UP, dir));
  const mid = start.clone().addScaledVector(dir, length / 2);
  cylinder.translate(mid.x, mid.y, mid.z);
  parts.push(bare(cylinder));
  if (depth === 0) return;
  const end = start.clone().addScaledVector(dir, length * 0.95);
  for (let i = 0; i < 2; i++) {
    const next = dir
      .clone()
      .applyAxisAngle(new Vector3(rand() - 0.5, 0, rand() - 0.5).normalize(), 0.35 + rand() * 0.4)
      .lerp(UP, 0.2)
      .normalize();
    branch(parts, rand, end, next, length * (0.75 + rand() * 0.15), radius * 0.8, depth - 1);
  }
}

function seaFan(rand: Rand) {
  const parts: BufferGeometry[] = [];
  const fan = (start: Vector3, dir: Vector3, length: number, depth: number) => {
    const rod = new CylinderGeometry(0.008, 0.012, length, 4, 1);
    rod.applyQuaternion(new Quaternion().setFromUnitVectors(UP, dir));
    const mid = start.clone().addScaledVector(dir, length / 2);
    rod.translate(mid.x, mid.y, mid.z);
    parts.push(bare(rod));
    if (depth === 0) return;
    const end = start.clone().addScaledVector(dir, length);
    for (const side of [-1, 1]) {
      const next = dir
        .clone()
        .applyAxisAngle(new Vector3(0, 0, 1), side * (0.3 + rand() * 0.3))
        .lerp(UP, 0.3)
        .normalize();
      fan(end, next, length * 0.78, depth - 1);
    }
  };
  fan(new Vector3(), UP.clone(), 0.22, 5);
  const purple = new Color("#9b5fc0");
  return finish(parts.map((g) => paint(g, () => purple)));
}

/** A coral head: a reef-rock dome crowned with a brain coral and pastel boulder corals. */
function buildBommie(rand: Rand, radius: number, height: number) {
  const parts: BufferGeometry[] = [];
  const rock = lump(rand, 0.09);
  rock.scale(radius, height * 0.55, radius);
  const stone = new Color("#a39a86");
  const algae = new Color("#7f8f62");
  parts.push(paint(rock, (p) => stone.clone().lerp(algae, Math.min(1, Math.max(0, p.y / (height * 0.5))))));

  const brain = brainCoral(radius * 0.45);
  brain.translate(radius * 0.15, height * 0.45, 0);
  parts.push(brain);

  const pastels = ["#b48ccf", "#e3a3b5", "#d9c6a0", "#9fb6d9"];
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    const r = radius * (0.18 + rand() * 0.12);
    const boulder = lump(rand, 0.12);
    boulder.scale(r, r * 0.7, r);
    boulder.translate(
      Math.cos(a) * radius * 0.55,
      height * (0.3 + rand() * 0.15),
      Math.sin(a) * radius * 0.55,
    );
    const color = new Color(pastels[i % pastels.length]);
    parts.push(paint(boulder, () => color));
  }
  return finish(parts);
}

function buildTuft(rand: Rand) {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const dir = new Vector3(rand() - 0.5, 1.4, rand() - 0.5).normalize();
    branch(parts, rand, new Vector3((rand() - 0.5) * 0.12, 0, (rand() - 0.5) * 0.12), dir, 0.16, 0.014, 3);
  }
  const base = new Color("#6f8a22");
  const tip = new Color("#c9d34a");
  return finish(parts.map((g) => paint(g, (p) => base.clone().lerp(tip, Math.min(1, p.y / 0.55)))));
}

function softShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.55, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

export type RayState = {
  position: Vector3;
  /** World direction of the ray's wingspan, for orienting its shadow. */
  span: Vector3;
  scale: number;
};

/** The stingray's soft shadow on the sand, directly below it since the sun is overhead. */
function RayShadow({ ray }: { ray: RayState }) {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: softShadowTexture(),
        color: "#0e4a5a",
        transparent: true,
        depthWrite: false,
        opacity: 0.3,
      }),
    [],
  );

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const height = Math.max(0, ray.position.y - FLOOR_Y);
    // Higher above the sand, the shadow spreads wider and fades, as with a real overhead sun.
    const spread = 1 + height * 0.18;
    m.position.set(ray.position.x + 0.3, FLOOR_Y + 0.12, ray.position.z);
    m.scale.set(3.4 * ray.scale * spread, 2 * ray.scale * spread, 1);
    m.rotation.z = Math.atan2(-ray.span.z, ray.span.x);
    material.opacity = 0.32 * Math.max(0, 1 - height / 6);
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/**
 * Open Caribbean sand flat with two coral heads and a few seaweed tufts, where southern stingrays forage.
 * Kept deliberately sparse: rays favor open sand and avoid dense reef.
 */
export function Reef({ still, ray }: { still: boolean; ray: RayState }) {
  const tufts = useRef<Group>(null);
  const { sand, sandMaterial, causticUniforms } = useMemo(() => {
    const causticUniforms = { uTime: { value: 0 }, uCaustic: { value: 0.5 } };
    const sandMaterial = new MeshStandardMaterial({ color: "#ece6d2", roughness: 1 });
    sandMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, causticUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vSeabed;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvSeabed = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\nvarying vec3 vSeabed;\nuniform float uTime;\nuniform float uCaustic;\n${CAUSTIC_GLSL}`,
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\ndiffuseColor.rgb += vec3(0.85, 1.0, 0.97) * caustic(vSeabed.xz * 1.1, uTime) * uCaustic;",
        );
    };
    return { sand: buildSand(), sandMaterial, causticUniforms };
  }, []);

  const material = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
    [],
  );
  const bommies = useMemo(() => {
    const rand = seeded(11);
    return BOMMIES.map((b) => ({ ...b, geometry: buildBommie(rand, b.radius, b.height), fan: seaFan(rand) }));
  }, []);
  const tuftGeometries = useMemo(() => {
    const rand = seeded(5);
    return TUFTS.map(() => buildTuft(rand));
  }, []);

  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime;
    causticUniforms.uTime.value = t;
    causticUniforms.uCaustic.value = 0.5 * (1 - 0.5 * getScrollDepth());
    tufts.current?.children.forEach((tuft, i) => {
      tuft.rotation.x = Math.sin(t * 0.8 + i * 1.3) * 0.12;
      tuft.rotation.z = Math.cos(t * 0.6 + i) * 0.08;
    });
  });

  return (
    <group>
      <mesh geometry={sand} material={sandMaterial} position={[0, FLOOR_Y - 0.12, -12]} />
      {bommies.map((b) => (
        <group key={`${b.x},${b.z}`} position={[b.x, FLOOR_Y - 0.1, b.z]}>
          <mesh geometry={b.geometry} material={material} />
          <mesh
            geometry={b.fan}
            material={material}
            position={[-b.radius * 0.45, b.height * 0.35, -b.radius * 0.3]}
            scale={1.3}
          />
        </group>
      ))}
      <group ref={tufts}>
        {TUFTS.map(([x, z], i) => (
          <mesh
            key={`${x},${z}`}
            geometry={tuftGeometries[i]}
            material={material}
            position={[x, FLOOR_Y - 0.05, z]}
          />
        ))}
      </group>
      <RayShadow ray={ray} />
    </group>
  );
}
