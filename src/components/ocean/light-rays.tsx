"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Group, MathUtils, ShaderMaterial } from "three";
import { getScrollDepth } from "./scroll-depth";

const SHAFTS = [
  { x: -5.5, width: 1.1, tilt: 0.32, z: -3, speed: 0.11 },
  { x: -3.2, width: 0.6, tilt: 0.28, z: -2, speed: 0.17 },
  { x: -1.2, width: 1.4, tilt: 0.35, z: -4, speed: 0.09 },
  { x: 1.1, width: 0.7, tilt: 0.3, z: -2.5, speed: 0.14 },
  { x: 3.4, width: 1.2, tilt: 0.33, z: -3.5, speed: 0.12 },
  { x: 5.6, width: 0.8, tilt: 0.29, z: -2, speed: 0.16 },
];

function shaftMaterial() {
  return new ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;
      void main() {
        float across = pow(1.0 - abs(vUv.x * 2.0 - 1.0), 2.0);
        float down = smoothstep(0.0, 0.75, vUv.y);
        float shimmer = 0.75 + 0.25 * sin(uTime * 0.8 + uSeed * 6.0 + vUv.y * 3.0);
        gl_FragColor = vec4(vec3(0.85, 0.96, 1.0), across * down * shimmer * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
}

/** Sunlight shafts slanting down from the surface; they fade out as the reader scrolls deeper. */
export function GodRays({ still }: { still: boolean }) {
  const group = useRef<Group>(null);
  const materials = useMemo(() => SHAFTS.map(shaftMaterial), []);

  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime;
    const opacity = 0.32 * (1 - MathUtils.smoothstep(getScrollDepth(), 0, 0.5));
    materials.forEach((m, i) => {
      m.uniforms.uOpacity.value = opacity;
      m.uniforms.uTime.value = t;
      m.uniforms.uSeed.value = i;
    });
    group.current?.children.forEach((shaft, i) => {
      shaft.rotation.z = SHAFTS[i].tilt + Math.sin(t * SHAFTS[i].speed + i) * 0.04;
    });
  });

  return (
    <group ref={group}>
      {SHAFTS.map((s, i) => (
        <mesh key={s.x} position={[s.x, 3.5, s.z]} rotation={[0, 0, s.tilt]} material={materials[i]}>
          <planeGeometry args={[s.width, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/** Faint moving caustic light far behind everything, strongest near the surface. */
export function Caustics({ still }: { still: boolean }) {
  const { viewport } = useThree();
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        // Domain-warped sine ridges: cheap, and reads as the web of light from surface ripples.
        fragmentShader: `
          uniform float uOpacity;
          uniform float uTime;
          uniform float uAspect;
          varying vec2 vUv;
          float ridge(float v) { return pow(1.0 - abs(sin(v)), 6.0); }
          void main() {
            vec2 p = vUv * vec2(uAspect, 1.0) * 7.0;
            p += 0.45 * vec2(sin(p.y * 1.3 + uTime * 0.5), cos(p.x * 1.1 - uTime * 0.4));
            float c = ridge(p.x * 1.7 + uTime * 0.6) + ridge(p.y * 1.9 - uTime * 0.5)
              + ridge((p.x + p.y) * 1.3 + uTime * 0.45);
            float top = smoothstep(0.1, 1.0, vUv.y);
            gl_FragColor = vec4(vec3(0.9, 0.98, 1.0), (c / 3.0) * top * uOpacity);
          }`,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    [],
  );

  const distance = 11;
  const height = 2 * distance * Math.tan(MathUtils.degToRad(45 / 2)) * 1.1;
  const width = height * (viewport.aspect || 1);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = still ? 0 : clock.elapsedTime;
    material.uniforms.uAspect.value = viewport.aspect || 1;
    material.uniforms.uOpacity.value = 0.22 * (1 - MathUtils.smoothstep(getScrollDepth(), 0, 0.6));
  });

  return (
    <mesh position={[0, 0, 5 - distance]} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}
