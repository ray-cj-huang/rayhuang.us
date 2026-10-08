"use client";

import { useFrame, useThree } from "@react-three/fiber";
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

const FISH_LENGTH = 0.3;
const BACK = new Color("#3d5a73");
const BELLY = new Color("#e3eaf0");
const FIN = new Color("#5d7b93");

function finGeometry(points: readonly number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
  return geometry;
}

function buildFish() {
  const half = FISH_LENGTH / 2;
  // Fusiform profile: blunt head, widest a third back, tapering to a narrow tail stalk.
  const profile = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    const radius = 0.045 * Math.sin(Math.PI * t ** 0.75) ** 0.9 + (t > 0.9 ? 0.004 : 0);
    return new Vector2(radius, half - t * FISH_LENGTH * 0.85);
  });
  const body = new LatheGeometry(profile, 12).toNonIndexed();
  body.deleteAttribute("uv");
  body.deleteAttribute("normal");
  body.rotateX(Math.PI / 2);
  // Real fish are laterally compressed: taller than they are wide.
  body.scale(0.45, 1, 1);

  const tailRoot = -half * 0.65;
  const tailEnd = -half * 1.05;
  const tail = finGeometry([
    0,
    0,
    tailRoot,
    0,
    0.055,
    tailEnd,
    0,
    0.012,
    tailEnd + 0.02,
    0,
    0,
    tailRoot,
    0,
    -0.012,
    tailEnd + 0.02,
    0,
    -0.055,
    tailEnd,
  ]);
  const dorsal = finGeometry([0, 0.035, 0.03, 0, 0.065, -0.02, 0, 0.032, -0.04]);

  const geometry = mergeGeometries([body, tail, dorsal]);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const bodyVertices = body.getAttribute("position").count;
  const c = new Color();
  for (let i = 0; i < position.count; i++) {
    if (i >= bodyVertices) c.copy(FIN);
    else {
      // Countershading: dark back, silver belly, as seen on most open-water fish.
      const y = position.getY(i) / 0.045;
      c.copy(BELLY).lerp(BACK, Math.min(1, Math.max(0, y * 0.9 + 0.45)));
    }
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function buildMaterial() {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.3,
    side: DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPhase;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float tailward = smoothstep(${(FISH_LENGTH * 0.15).toFixed(3)}, ${(-FISH_LENGTH * 0.55).toFixed(3)}, position.z);
        transformed.x += sin(aPhase - position.z * 18.0) * 0.028 * tailward;`,
      );
  };
  return material;
}

/**
 * A school of procedural fish that flock with boids and swerve away from the stingray.
 *
 * @param threat - World position of the stingray, updated by it every frame.
 * @param still - Freeze the school, for `prefers-reduced-motion`.
 */
export function FishSchool({ count, threat, still }: { count: number; threat: Vector3; still: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const { viewport } = useThree();
  const geometry = useMemo(buildFish, []);
  const material = useMemo(buildMaterial, []);

  const params = useMemo<FlockParams>(
    () => ({
      minSpeed: 0.35,
      maxSpeed: 1.1,
      neighborRadius: 1.3,
      separationRadius: 0.22,
      separation: 6,
      alignment: 1.8,
      cohesion: 1.1,
      bounds: {
        min: [-viewport.width * 0.6, -viewport.height * 0.55, -4],
        max: [viewport.width * 0.6, viewport.height * 0.55, 0.8],
      },
      boundsMargin: 0.6,
      boundsWeight: 1.5,
      goal: [0, 0, -1.5],
      goalWeight: 0.1,
      threat: { position: [0, 0, 0], radius: 1.6, weight: 7 },
    }),
    [viewport.width, viewport.height],
  );

  const school = useMemo(() => {
    const flock = createFlock(count, params.bounds);
    // Random phases keep the school from beating in lockstep, which reads as robotic.
    const phase = new Float32Array(count).map(() => Math.random() * Math.PI * 2);
    const scale = new Float32Array(count).map(() => 0.8 + Math.random() * 0.45);
    const phaseAttribute = new InstancedBufferAttribute(phase, 1);
    geometry.setAttribute("aPhase", phaseAttribute);
    return { flock, phase, scale, phaseAttribute };
  }, [count, params.bounds, geometry]);

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
    const { flock, phase, scale } = school;

    if (!still) {
      const t = clock.elapsedTime;
      params.goal = [
        Math.sin(t * 0.07) * viewport.width * 0.3,
        Math.cos(t * 0.05) * viewport.height * 0.25,
        -1.6 + Math.sin(t * 0.04) * 1.2,
      ];
      params.threat = { position: [threat.x, threat.y, threat.z], radius: 1.6, weight: 7 };
      stepFlock(flock, params, dt);
    }

    for (let i = 0; i < flock.count; i++) {
      const ix = i * 3;
      const speed = Math.hypot(flock.velocity[ix], flock.velocity[ix + 1], flock.velocity[ix + 2]);
      // Faster fish beat their tails faster rather than wider.
      if (!still) phase[i] += dt * Math.PI * 2 * (1.4 + speed * 2.2);
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
