"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  type Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CAUSTIC_GLSL } from "./glsl";
import { seeded } from "./random";
import { getScrollDepth } from "./scroll-depth";
import { CLEANING_STATION, FLOOR_Y } from "./species";

type Rand = () => number;
type Vec3 = [number, number, number];

const UP = new Vector3(0, 1, 0);

function paint(geometry: BufferGeometry, color: (p: Vector3, i: number) => Color) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const c = color(p.fromBufferAttribute(position, i), i);
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
  const geometry = mergeGeometries(parts);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSand() {
  const geometry = new PlaneGeometry(70, 46, 180, 120);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position");
  const sand = new Color("#dccaa1");
  const shade = new Color("#bfa77c");
  const colors = new Float32Array(position.count * 3);
  const c = new Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    // Long, low dunes with fine wave ripples on top, as on a current-swept sand flat.
    const dunes = 0.22 * Math.sin(x * 0.23 + z * 0.17) * Math.sin(z * 0.29 - x * 0.05);
    const ripples = 0.025 * Math.sin(x * 3.2 + 0.7 * Math.sin(z * 0.45));
    position.setY(i, dunes + ripples);
    c.copy(sand).lerp(shade, 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 0.7) * 2));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function buildRock(rand: Rand) {
  const k = Array.from(
    { length: 3 },
    () => [rand() * 6 - 3, rand() * 6 - 3, rand() * 6 - 3, rand() * 6] as const,
  );
  const geometry = new IcosahedronGeometry(1, 3);
  const position = geometry.getAttribute("position");
  const p = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const bump = k.reduce((sum, [a, b, cc, ph]) => sum + Math.sin(p.x * a + p.y * b + p.z * cc + ph), 0);
    p.multiplyScalar(1 + bump * 0.08);
    position.setXYZ(i, p.x, p.y * 0.6, p.z);
  }
  const stone = new Color("#6f6a60");
  const algae = new Color("#5d6e46");
  // Turf algae settles on the sunlit upper faces of reef rock.
  return finish([bare(paint(geometry, (q) => stone.clone().lerp(algae, Math.max(0, q.y * 1.4))))]);
}

function buildBrainCoral(radius: number) {
  const geometry = new SphereGeometry(radius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const position = geometry.getAttribute("position");
  const p = new Vector3();
  const ridges = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const theta = Math.atan2(p.z, p.x);
    const phi = Math.acos(Math.min(1, p.y / radius));
    // Two interfering wavy grooves approximate the meandering valleys of Diploria brain coral.
    const ridge = Math.abs(
      Math.sin(14 * theta + 5 * Math.sin(5 * phi)) * Math.sin(16 * phi + 3 * Math.sin(4 * theta)),
    );
    ridges[i] = ridge;
    p.multiplyScalar(1 + 0.045 * ridge);
    position.setXYZ(i, p.x, p.y * 0.75, p.z);
  }
  const ridgeColor = new Color("#d4bc85");
  const groove = new Color("#8f7a4c");
  return finish([bare(paint(geometry, (_, i) => groove.clone().lerp(ridgeColor, ridges[i])))]);
}

function branch(
  parts: BufferGeometry[],
  rand: Rand,
  start: Vector3,
  dir: Vector3,
  length: number,
  radius: number,
  depth: number,
  planar: boolean,
) {
  const cylinder = new CylinderGeometry(radius * 0.7, radius, length, 6, 1);
  cylinder.applyQuaternion(new Quaternion().setFromUnitVectors(UP, dir));
  const mid = start.clone().addScaledVector(dir, length / 2);
  cylinder.translate(mid.x, mid.y, mid.z);
  parts.push(bare(cylinder));
  if (depth === 0) return;
  const end = start.clone().addScaledVector(dir, length * 0.95);
  const children = planar ? 2 : 2 + Math.floor(rand() * 2);
  for (let i = 0; i < children; i++) {
    const spread = planar ? 0.35 + rand() * 0.35 : 0.5 + rand() * 0.4;
    const next = planar
      ? dir.clone().applyAxisAngle(new Vector3(0, 0, 1), (i % 2 ? 1 : -1) * spread)
      : dir.clone().applyAxisAngle(new Vector3(rand() - 0.5, 0, rand() - 0.5).normalize(), spread);
    // Corals grow toward the light, so bias every branch upward.
    next.lerp(UP, 0.25).normalize();
    branch(parts, rand, end, next, length * (0.7 + rand() * 0.15), radius * 0.72, depth - 1, planar);
  }
}

function buildStaghorn(rand: Rand) {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const dir = new Vector3(rand() - 0.5, 1.2, rand() - 0.5).normalize();
    branch(
      parts,
      rand,
      new Vector3((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3),
      dir,
      0.35,
      0.045,
      3,
      false,
    );
  }
  const base = new Color("#c9914f");
  const tip = new Color("#f2dcae");
  return finish(parts.map((g) => paint(g, (p) => base.clone().lerp(tip, Math.min(1, p.y / 0.9)))));
}

function buildSeaFan(rand: Rand) {
  const parts: BufferGeometry[] = [];
  branch(parts, rand, new Vector3(), UP.clone(), 0.3, 0.025, 5, true);
  const purple = new Color("#8e44ad");
  return finish(parts.map((g) => paint(g, () => purple)));
}

function buildTubeSponges(rand: Rand, hex: string) {
  const color = new Color(hex);
  const parts = Array.from({ length: 3 + Math.floor(rand() * 3) }, () => {
    const h = 0.35 + rand() * 0.45;
    const tube = new CylinderGeometry(0.07, 0.09, h, 12, 1, true);
    tube.rotateZ((rand() - 0.5) * 0.3);
    tube.translate((rand() - 0.5) * 0.3, h / 2, (rand() - 0.5) * 0.3);
    return paint(bare(tube), () => color);
  });
  return finish(parts);
}

type Piece = { geometry: BufferGeometry; position: Vec3; scale: number; rotation: number; sway?: boolean };

function buildReef(rand: Rand): Piece[] {
  const pieces: Piece[] = [];
  const at = (x: number, z: number): Vec3 => [x, FLOOR_Y - 0.05, z];

  pieces.push({
    geometry: buildBrainCoral(0.6),
    position: [CLEANING_STATION[0], FLOOR_Y - 0.08, CLEANING_STATION[2]],
    scale: 1,
    rotation: 0,
  });
  pieces.push({ geometry: buildBrainCoral(0.4), position: at(-4.6, -9.5), scale: 1, rotation: 1 });

  const rocks: [number, number, number][] = [
    [4.4, -6.8, 0.7],
    [2.1, -7.4, 0.5],
    [5.6, -5.2, 0.4],
    [-5.2, -8.4, 0.8],
    [-3.6, -10.5, 0.5],
    [0.6, -11, 0.6],
    [6.8, -9, 0.9],
    [-7, -6, 0.6],
  ];
  for (const [x, z, s] of rocks) {
    pieces.push({ geometry: buildRock(rand), position: at(x, z), scale: s, rotation: rand() * Math.PI });
  }

  for (const [x, z] of [
    [2.6, -5.2],
    [4.8, -7.6],
    [-4.2, -8.8],
    [1.4, -8.6],
  ] as const) {
    pieces.push({
      geometry: buildStaghorn(rand),
      position: at(x, z),
      scale: 0.9 + rand() * 0.4,
      rotation: rand() * Math.PI,
    });
  }
  for (const [x, z] of [
    [5.2, -6.4],
    [-5.8, -9.4],
    [3.6, -8.4],
  ] as const) {
    pieces.push({
      geometry: buildSeaFan(rand),
      position: at(x, z),
      scale: 0.9 + rand() * 0.3,
      rotation: rand() * 0.6 - 0.3,
      sway: true,
    });
  }
  pieces.push({
    geometry: buildTubeSponges(rand, "#9b59b6"),
    position: at(4.1, -5.6),
    scale: 1,
    rotation: 0,
  });
  pieces.push({
    geometry: buildTubeSponges(rand, "#e67e22"),
    position: at(-3.4, -9.8),
    scale: 1,
    rotation: 0,
  });
  return pieces;
}

function buildSeagrass(rand: Rand, count: number) {
  const blade = new PlaneGeometry(0.035, 1, 1, 5);
  blade.translate(0, 0.5, 0);
  paint(blade, (p) => new Color("#2f5a26").lerp(new Color("#7aa65a"), p.y));
  const material = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.8 });
  const time = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      // Each blade sways with the surge, phase-shifted by its position so the meadow ripples.
      float phase = uTime * 1.1 + instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.4;
      transformed.x += sin(phase) * position.y * position.y * 0.12;
      transformed.z += cos(phase * 0.8) * position.y * position.y * 0.05;`,
      );
  };
  const mesh = new InstancedMesh(blade, material, count);
  const patches: [number, number, number][] = [
    [-4.4, -4.6, 1.6],
    [-1.2, -9.2, 1.4],
    [6, -3.8, 1.2],
    [-7.2, -10, 1.8],
  ];
  const m = new Matrix4();
  const q = new Quaternion();
  for (let i = 0; i < count; i++) {
    const [cx, cz, r] = patches[i % patches.length];
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    q.setFromAxisAngle(UP, rand() * Math.PI);
    m.compose(
      new Vector3(cx + Math.cos(a) * d, FLOOR_Y - 0.02, cz + Math.sin(a) * d),
      q,
      new Vector3(1, 0.25 + rand() * 0.4, 1),
    );
    mesh.setMatrixAt(i, m);
  }
  mesh.frustumCulled = false;
  return { mesh, time };
}

/**
 * Caribbean sand flat beside a patch reef: where southern stingrays forage.
 * Sand with caustics, reef rock, brain and staghorn coral, sea fans, tube sponges and turtle grass.
 */
export function Reef({ still, lite }: { still: boolean; lite: boolean }) {
  const fans = useRef<Group>(null);
  const { sand, sandMaterial, causticUniforms } = useMemo(() => {
    const causticUniforms = { uTime: { value: 0 }, uCaustic: { value: 0.35 } };
    const sandMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
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
          "#include <color_fragment>\ndiffuseColor.rgb += caustic(vSeabed.xz * 1.4, uTime) * uCaustic;",
        );
    };
    return { sand: buildSand(), sandMaterial, causticUniforms };
  }, []);

  const pieces = useMemo(() => buildReef(seeded(11)), []);
  const coralMaterial = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
    [],
  );
  const grass = useMemo(() => buildSeagrass(seeded(5), lite ? 500 : 1600), [lite]);

  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime;
    causticUniforms.uTime.value = t;
    causticUniforms.uCaustic.value = 0.35 * (1 - 0.6 * getScrollDepth());
    grass.time.value = t;
    fans.current?.children.forEach((fan, i) => {
      fan.rotation.x = Math.sin(t * 0.9 + i * 1.7) * 0.08;
    });
  });

  return (
    <group>
      <mesh geometry={sand} material={sandMaterial} position={[0, FLOOR_Y - 0.15, -12]} />
      {pieces
        .filter((p) => !p.sway)
        .map((p, i) => (
          <mesh
            // biome-ignore lint/suspicious/noArrayIndexKey: the reef layout is fixed and never reorders.
            key={i}
            geometry={p.geometry}
            material={coralMaterial}
            position={p.position}
            scale={p.scale}
            rotation={[0, p.rotation, 0]}
          />
        ))}
      <group ref={fans}>
        {pieces
          .filter((p) => p.sway)
          .map((p, i) => (
            <mesh
              // biome-ignore lint/suspicious/noArrayIndexKey: the reef layout is fixed and never reorders.
              key={i}
              geometry={p.geometry}
              material={coralMaterial}
              position={p.position}
              scale={p.scale}
              rotation={[0, p.rotation, 0]}
            />
          ))}
      </group>
      <primitive object={grass.mesh} />
    </group>
  );
}
