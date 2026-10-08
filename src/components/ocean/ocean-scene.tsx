"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import {
  type AmbientLight,
  Color,
  type DirectionalLight,
  FogExp2,
  PMREMGenerator,
  SRGBColorSpace,
  Vector3,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Obstacle } from "./boids";
import { FishSchool, type SchoolBehavior } from "./fish-school";
import { BOMMIES, FLOOR_Y, REEF_OBSTACLES } from "./layout";
import { Caustics, GodRays } from "./light-rays";
import { MarineSnow } from "./marine-snow";
import { DARK_WATER, LIGHT_WATER, waterColorAt } from "./palette";
import { type RayState, Reef } from "./reef";
import { getScrollDepth } from "./scroll-depth";
import { BAITFISH, FRENCH_GRUNT } from "./species";
import { Stingray } from "./stingray";

function Water({ dark, still }: { dark: boolean; still: boolean }) {
  const { scene, invalidate, gl } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const water = useMemo(() => {
    const background = new Color();
    const fog = new FogExp2(background.getHex(), 0.03);
    return { background, fog };
  }, []);

  useEffect(() => {
    // A soft procedural environment, so silver fish and wet surfaces pick up believable reflections.
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.35;
    return () => {
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.background = water.background;
    scene.fog = water.fog;
    // With frameloop="demand" (reduced motion), scrolling must still repaint the water color.
    if (!still) return;
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scene, water, still, invalidate]);

  useFrame(() => {
    const depth = getScrollDepth();
    const [r, g, b] = waterColorAt(depth, dark ? DARK_WATER : LIGHT_WATER);
    water.background.setRGB(r, g, b, SRGBColorSpace);
    water.fog.color.copy(water.background);
    // Deeper water is murkier, so distant and even nearby sand settles into blue.
    water.fog.density = 0.05 + depth * 0.09;
    if (sun.current) sun.current.intensity = 2.6 * (1 - 0.7 * depth);
    if (ambient.current) ambient.current.intensity = 0.9 - 0.4 * depth;
  });

  return (
    <>
      <ambientLight ref={ambient} color="#cfe8ff" />
      <directionalLight ref={sun} position={[1.5, 6, 3]} color="#f2fbff" />
      <pointLight position={[-4, -3, -2]} color="#5aa9e6" intensity={18} />
    </>
  );
}

// Scrolling tilts the view down toward the seafloor, like descending onto the reef.
function CameraRig() {
  useFrame(({ camera }) => {
    const depth = getScrollDepth();
    camera.position.y = -0.5 * depth;
    camera.rotation.x = 0.1 - 0.3 * depth ** 1.2;
  });
  return null;
}

// The ray's solid mass, as an ellipsoid fish can't enter; sized to its wings and tilted disc.
function rayObstacle(ray: RayState): Obstacle {
  return {
    position: [ray.position.x, ray.position.y, ray.position.z],
    radii: [1.8 * ray.scale, 0.8 * ray.scale, 1 * ray.scale],
  };
}

function useBehaviors(ray: RayState) {
  return useMemo(() => {
    const flee = () => ({
      position: [ray.position.x, ray.position.y, ray.position.z] as [number, number, number],
      radius: 2.6 * ray.scale,
      weight: 9,
    });
    const obstacles = () => [...REEF_OBSTACLES, rayObstacle(ray)];
    // Baitfish mill in a slowly drifting ball, and part around the ray as it passes.
    const baitfish: SchoolBehavior = (t) => ({
      goal: [
        -2.6 + Math.sin(t * 0.05) * 2 + Math.cos(t * 0.55) * 1.3,
        FLOOR_Y + 2.6 + Math.sin(t * 0.3) * 0.25,
        -7.5 + Math.sin(t * 0.55) * 1.3,
      ],
      goalWeight: 1.3,
      threat: flee(),
      obstacles: obstacles(),
      minDistance: 0.12,
    });
    // Grunts hover around the coral heads, drifting between them.
    const grunts: SchoolBehavior = (t) => {
      const home = BOMMIES[Math.floor(t / 40) % BOMMIES.length];
      return {
        goal: [home.x + Math.sin(t * 0.3) * 1.4, FLOOR_Y + 0.8, home.z + 1.4 + Math.cos(t * 0.25) * 0.8],
        goalWeight: 0.35,
        threat: flee(),
        obstacles: obstacles(),
        minDistance: 0.14,
      };
    };
    return { baitfish, grunts };
  }, [ray]);
}

function RayPlacement({ still, ray }: { still: boolean; ray: RayState }) {
  const { viewport } = useThree();

  // On phones the hero text is bottom-aligned, so the ray uses the open space above it.
  const wide = viewport.aspect > 1.1;
  const x = wide ? viewport.width * 0.2 : 0;
  const y = wide ? 0.1 : viewport.height * 0.24;
  const scale = wide ? 0.95 : Math.min(0.6, viewport.width / 5.2);
  ray.scale = scale;

  return (
    <group position={[x, y, 0]} scale={scale}>
      <Stingray
        still={still}
        worldPosition={ray.position}
        worldSpan={ray.span}
        minWorldY={FLOOR_Y + 0.5}
        mounds={BOMMIES}
      />
    </group>
  );
}

export default function OceanScene() {
  const still = useReducedMotion() ?? false;
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const ray = useMemo<RayState>(
    () => ({ position: new Vector3(), span: new Vector3(1, 0, 0), scale: 1 }),
    [],
  );
  const behaviors = useBehaviors(ray);
  const baitCenter = useMemo(() => new Vector3(), []);
  const n = (s: { count: { desktop: number; mobile: number } }) =>
    narrow ? s.count.mobile : s.count.desktop;

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, narrow ? 1.5 : 1.75]}
      frameloop={still ? "demand" : "always"}
      gl={{ antialias: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <Water dark={dark} still={still} />
      <CameraRig />
      <GodRays still={still} />
      {!narrow && <Caustics still={still} />}
      <Reef still={still} ray={ray} school={baitCenter} lite={narrow} />
      <MarineSnow count={narrow ? 150 : 400} still={still} />
      <FishSchool
        species={BAITFISH}
        count={n(BAITFISH)}
        behavior={behaviors.baitfish}
        still={still}
        center={baitCenter}
      />
      <FishSchool species={FRENCH_GRUNT} count={n(FRENCH_GRUNT)} behavior={behaviors.grunts} still={still} />
      <RayPlacement still={still} ray={ray} />
    </Canvas>
  );
}
