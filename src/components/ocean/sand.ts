import { MeshStandardMaterial, PlaneGeometry } from "three";
import { CAUSTIC_GLSL } from "./glsl";
import { FLOOR_Y } from "./layout";

const SAND_Y = FLOOR_Y - 0.12;
const SAND_Z = -12;

function dunes(x: number, z: number) {
  return 0.2 * Math.sin(x * 0.17 + z * 0.11) * Math.sin(z * 0.23 - x * 0.04);
}

/** World-space height of the sand surface, so objects can rest on it. */
export function sandHeight(x: number, z: number): number {
  return SAND_Y + dunes(x, z - SAND_Z);
}

export const SAND_POSITION: [number, number, number] = [0, SAND_Y, SAND_Z];

/** Gentle dunes only; ripples are far finer than any affordable mesh, so the shader draws them. */
export function buildSandGeometry() {
  const geometry = new PlaneGeometry(70, 46, 140, 92);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) position.setY(i, dunes(position.getX(i), position.getZ(i)));
  geometry.computeVertexNormals();
  return geometry;
}

/*
 * One scene unit is about 60 cm (a sardine is ~0.17 units).
 * Current ripples on sand flats run 6–30 cm crest to crest and 1–3 cm high, with a gentle upstream (stoss)
 * slope and a steep downstream (lee) face, mostly straight crests and occasional forks.
 */
const SAND_GLSL = `
  ${CAUSTIC_GLSL}
  float sandHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sandNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(sandHash(i), sandHash(i + vec2(1.0, 0.0)), u.x),
      mix(sandHash(i + vec2(0.0, 1.0)), sandHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float ripplePhase(vec2 p) {
    float wavelength = 0.38;
    float phase = p.x * 6.2832 / wavelength;
    // Slow sinuous drift keeps crests mostly straight but never ruler-perfect.
    phase += 2.2 * sin(p.y * 0.42 + 0.6 * sin(p.x * 0.2)) + 1.1 * sin(p.y * 1.05 + p.x * 0.27);
    // Phase dislocations: each adds one crest, so ripples fork into a Y-junction there.
    phase += atan(p.y + 7.0, p.x - 2.0) + atan(p.y + 11.0, p.x + 4.0) - atan(p.y + 5.0, p.x + 1.5);
    return phase;
  }
  // Asymmetric profile: the second harmonic steepens one face, giving a gentle stoss and a steep lee.
  float rippleHeight(vec2 p) {
    float t = ripplePhase(p);
    return sin(t) + 0.28 * sin(2.0 * t);
  }
`;

/** Pale carbonate sand with shader-drawn ripples, grain, settled detritus in the troughs and moving caustics. */
export function buildSandMaterial(uniforms: { uTime: { value: number }; uCaustic: { value: number } }) {
  const material = new MeshStandardMaterial({ color: "#ece6d2", roughness: 0.95 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSeabed;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvSeabed = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSeabed;
        uniform float uTime;
        uniform float uCaustic;
        ${SAND_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Fade fine detail with distance; beyond a few meters it would only alias.
        float near = 1.0 - smoothstep(5.0, 20.0, length(vViewPosition));
        float ripple = rippleHeight(vSeabed.xz);
        float patchiness = sandNoise(vSeabed.xz * 0.16);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.9, 0.93, 0.86), smoothstep(0.45, 0.85, patchiness));
        diffuseColor.rgb *= 1.0 - 0.07 * (0.5 - 0.5 * ripple) * near;
        diffuseColor.rgb *= 1.0 + (sandHash(floor(vSeabed.xz * 90.0)) - 0.5) * 0.1 * near;
        diffuseColor.rgb += vec3(0.85, 1.0, 0.97) * caustic(vSeabed.xz * 1.1, uTime) * uCaustic;`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        {
          float e = 0.01;
          float amp = 0.022 * near;
          float gx = (rippleHeight(vSeabed.xz + vec2(e, 0.0)) - rippleHeight(vSeabed.xz - vec2(e, 0.0))) / (2.0 * e);
          float gz = (rippleHeight(vSeabed.xz + vec2(0.0, e)) - rippleHeight(vSeabed.xz - vec2(0.0, e))) / (2.0 * e);
          vec3 worldNormal = (vec4(normal, 0.0) * viewMatrix).xyz;
          worldNormal = normalize(worldNormal + vec3(-gx, 0.0, -gz) * amp);
          normal = normalize((viewMatrix * vec4(worldNormal, 0.0)).xyz);
        }`,
      );
  };
  return material;
}
