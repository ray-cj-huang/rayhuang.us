"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  type InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createFlock, type FlockParams, stepFlock } from "./boids";
import type { Species } from "./species";

function finGeometry(points: readonly number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
  return geometry;
}

function buildFish(species: Species) {
  const { length: L, height: H } = species;
  const half = L / 2;
  // Fusiform profile: blunt head, deepest a third back, tapering to a narrow tail stalk.
  const profile = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    const radius = H * Math.sin(Math.PI * t ** 0.75) ** 0.9 + (t > 0.9 ? H * 0.09 : 0);
    return new Vector2(radius, half - t * L * 0.85);
  });
  const body = new LatheGeometry(profile, 12).toNonIndexed();
  body.deleteAttribute("uv");
  body.deleteAttribute("normal");
  body.rotateX(Math.PI / 2);
  body.scale(species.width, 1, 1);

  const root = -half * 0.65;
  const end = -half * 1.05;
  const spread = H * 1.25;
  const tail = finGeometry([
    0,
    0,
    root,
    0,
    spread,
    end,
    0,
    spread * 0.22,
    end + L * 0.07,
    0,
    0,
    root,
    0,
    -spread * 0.22,
    end + L * 0.07,
    0,
    -spread,
    end,
  ]);
  const dorsal = finGeometry([0, H * 0.8, L * 0.1, 0, H * 1.45, -L * 0.07, 0, H * 0.7, -L * 0.13]);

  const geometry = mergeGeometries([body, tail, dorsal]);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const bodyVertices = body.getAttribute("position").count;
  const fin = new Color(species.fin);
  for (let i = 0; i < position.count; i++) {
    const color = i >= bodyVertices ? fin : species.shade(position.getY(i) / H, position.getZ(i) / half);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function buildMaterial(species: Species) {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0.25,
    side: DoubleSide,
  });
  const L = species.length;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPhase;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float tailward = smoothstep(${(L * 0.15).toFixed(4)}, ${(-L * 0.55).toFixed(4)}, position.z);
        transformed.x += sin(aPhase - position.z * ${(5.4 / L).toFixed(2)}) * ${(L * 0.095).toFixed(4)} * tailward;`,
      );
  };
  return material;
}

export type SchoolBehavior = (
  time: number,
) => Pick<FlockParams, "goal" | "goalWeight" | "threat" | "obstacles" | "minDistance">;

/**
 * One species of procedural fish, flocking with boids.
 *
 * @param behavior - Called every frame to steer the school: where to head, and what to avoid.
 * @param still - Freeze the school, for `prefers-reduced-motion`.
 */
export function FishSchool({
  species,
  count,
  behavior,
  still,
}: {
  species: Species;
  count: number;
  behavior: SchoolBehavior;
  still: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => buildFish(species), [species]);
  const material = useMemo(() => buildMaterial(species), [species]);

  const school = useMemo(() => {
    const flock = createFlock(count, species.flock.bounds);
    // Random phases keep the school from beating in lockstep, which reads as robotic.
    const phase = new Float32Array(count).map(() => Math.random() * Math.PI * 2);
    const scale = new Float32Array(count).map(() => 0.85 + Math.random() * 0.3);
    const phaseAttribute = new InstancedBufferAttribute(phase, 1);
    geometry.setAttribute("aPhase", phaseAttribute);
    const params: FlockParams = { ...species.flock };
    return { flock, phase, scale, phaseAttribute, params };
  }, [count, species, geometry]);

  const temp = useMemo(
    () => ({
      matrix: new Matrix4(),
      heading: new Vector3(),
      size: new Vector3(),
      origin: new Vector3(),
      up: new Vector3(0, 1, 0),
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 20);
    const { flock, phase, scale, params } = school;

    if (!still) {
      Object.assign(params, behavior(clock.elapsedTime));
      stepFlock(flock, params, dt);
    }

    for (let i = 0; i < flock.count; i++) {
      const ix = i * 3;
      const speed = Math.hypot(flock.velocity[ix], flock.velocity[ix + 1], flock.velocity[ix + 2]);
      // Faster fish beat their tails faster rather than wider.
      if (!still) phase[i] += dt * Math.PI * 2 * species.tailBeat * (0.6 + speed / species.flock.maxSpeed);
      temp.heading.set(flock.velocity[ix], flock.velocity[ix + 1], flock.velocity[ix + 2]).normalize();
      temp.matrix.lookAt(temp.heading, temp.origin, temp.up);
      temp.matrix.scale(temp.size.setScalar(scale[i]));
      temp.matrix.setPosition(flock.position[ix], flock.position[ix + 1], flock.position[ix + 2]);
      m.setMatrixAt(i, temp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    school.phaseAttribute.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}
