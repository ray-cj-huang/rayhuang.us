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
  Euler,
  type Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { CAUSTIC_GLSL } from "./glsl";
import { BOMMIES, FLOOR_Y, TUFTS } from "./layout";
import { seeded } from "./random";
import { buildSandGeometry, buildSandMaterial, SAND_POSITION, sandHeight } from "./sand";
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
  const shade = new Color("#6f675a");
  parts.push(
    paint(rock, (p) => {
      // Mottled rock: low-frequency blotches of darker stone, with turf algae on the sunlit top.
      const blotch =
        0.5 + 0.5 * Math.sin(p.x * 4.1 + Math.sin(p.z * 3.3) * 2) * Math.sin(p.z * 3.7 - p.y * 2.9);
      const top = Math.min(1, Math.max(0, p.y / (height * 0.5)));
      return stone
        .clone()
        .lerp(shade, blotch * 0.5)
        .lerp(algae, top * 0.8);
    }),
  );

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

type ShadowPose = { x: number; z: number; width: number; depth: number; angle: number; opacity: number };

/** A soft shadow blob on the sand, re-posed every frame; the sun is overhead, so shadows fall straight down. */
function SoftShadow({ pose }: { pose: () => ShadowPose }) {
  const mesh = useRef<Mesh>(null);
  const shadowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        map: softShadowTexture(),
        color: "#0e4a5a",
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const s = pose();
    m.position.set(s.x, sandHeight(s.x, s.z) + 0.03, s.z);
    m.scale.set(s.width, s.depth, 1);
    m.rotation.z = s.angle;
    shadowMaterial.opacity = s.opacity;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} material={shadowMaterial} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

function rayShadow(ray: RayState): ShadowPose {
  const height = Math.max(0, ray.position.y - FLOOR_Y);
  // Higher above the sand, the shadow spreads wider and fades.
  const spread = 1 + height * 0.18;
  return {
    x: ray.position.x + 0.3,
    z: ray.position.z,
    width: 3.4 * ray.scale * spread,
    depth: 2 * ray.scale * spread,
    angle: Math.atan2(-ray.span.z, ray.span.x),
    opacity: 0.32 * Math.max(0, 1 - height / 6),
  };
}

function schoolShadow(center: Vector3): ShadowPose {
  const height = Math.max(0, center.y - FLOOR_Y);
  return {
    x: center.x,
    z: center.z,
    width: 2.4 + height * 0.4,
    depth: 1.8 + height * 0.3,
    angle: 0,
    opacity: 0.14 * Math.max(0, 1 - height / 7),
  };
}

/** Shell hash and coral rubble: denser near coral heads, where broken coral collects, and sparse elsewhere. */
function buildRubble(rand: Rand, count: number) {
  const geometry = lump(rand, 0.18);
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ roughness: 0.85, flatShading: true });
  const mesh = new InstancedMesh(geometry, material, count);
  const tones = ["#f3eee3", "#e8dcc6", "#d9cdb8", "#cbb79a", "#efe6d6"].map((h) => new Color(h));
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  for (let i = 0; i < count; i++) {
    let x: number;
    let z: number;
    if (i % 3 !== 0) {
      const b = BOMMIES[i % BOMMIES.length];
      const a = rand() * Math.PI * 2;
      const r = b.radius * (1.05 + rand() ** 2 * 2.2);
      x = b.x + Math.cos(a) * r;
      z = b.z + Math.sin(a) * r;
    } else {
      x = (rand() - 0.5) * 18;
      z = -3 - rand() * 14;
    }
    const size = 0.025 + rand() ** 2 * 0.07;
    q.setFromEuler(e.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6));
    m.compose(
      new Vector3(x, sandHeight(x, z) + size * 0.25, z),
      q,
      new Vector3(size * 1.3, size * 0.45, size),
    );
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, tones[Math.floor(rand() * tones.length)]);
  }
  return mesh;
}

/**
 * Open Caribbean sand flat with two coral heads and a few seaweed tufts, where southern stingrays forage.
 * Kept deliberately sparse: rays favor open sand and avoid dense reef.
 */
export function Reef({
  still,
  ray,
  school,
  lite,
}: {
  still: boolean;
  ray: RayState;
  school?: Vector3;
  lite: boolean;
}) {
  const tufts = useRef<Group>(null);
  const causticUniforms = useMemo(() => ({ uTime: { value: 0 }, uCaustic: { value: 0.5 } }), []);
  const sand = useMemo(buildSandGeometry, []);
  const sandMaterial = useMemo(() => buildSandMaterial(causticUniforms), [causticUniforms]);
  const rubble = useMemo(() => buildRubble(seeded(23), lite ? 70 : 170), [lite]);

  const material = useMemo(() => {
    const coral = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide });
    // Caustics play across the up-facing tops of coral and rock, just as on the sand around them.
    coral.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, causticUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vReefWorld;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvReefWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\nvarying vec3 vReefWorld;\nuniform float uTime;\nuniform float uCaustic;\n${CAUSTIC_GLSL}`,
        )
        .replace(
          "#include <normal_fragment_begin>",
          `#include <normal_fragment_begin>
          float up = max(0.0, (vec4(normal, 0.0) * viewMatrix).y);
          diffuseColor.rgb += vec3(0.85, 1.0, 0.97) * caustic(vReefWorld.xz * 1.1, uTime) * uCaustic * up * 0.8;`,
        );
    };
    return coral;
  }, [causticUniforms]);
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
      <mesh geometry={sand} material={sandMaterial} position={SAND_POSITION} />
      <primitive object={rubble} />
      {BOMMIES.map((b) => (
        <SoftShadow
          key={`shadow ${b.x},${b.z}`}
          pose={() => ({
            x: b.x,
            z: b.z,
            width: b.radius * 3.2,
            depth: b.radius * 3.2,
            angle: 0,
            opacity: 0.35,
          })}
        />
      ))}
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
      <SoftShadow pose={() => rayShadow(ray)} />
      {school && <SoftShadow pose={() => schoolShadow(school)} />}
    </group>
  );
}
