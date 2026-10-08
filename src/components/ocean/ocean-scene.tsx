"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { type AmbientLight, Color, type DirectionalLight, FogExp2, SRGBColorSpace, Vector3 } from "three";
import { FishSchool, type SchoolBehavior } from "./fish-school";
import { Caustics, GodRays } from "./light-rays";
import { MarineSnow } from "./marine-snow";
import { DARK_WATER, LIGHT_WATER, waterColorAt } from "./palette";
import { Reef } from "./reef";
import { getScrollDepth } from "./scroll-depth";
import { BAR_JACK, BLUE_CHROMIS, BLUEHEAD_WRASSE, CLEANING_STATION, FLOOR_Y, FRENCH_GRUNT } from "./species";
import { Stingray } from "./stingray";

function Water({ dark, still }: { dark: boolean; still: boolean }) {
  const { scene, invalidate } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const water = useMemo(() => {
    const background = new Color();
    const fog = new FogExp2(background.getHex(), 0.03);
    return { background, fog };
  }, []);

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
    water.fog.density = 0.05 + depth * 0.05;
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

function useBehaviors(ray: Vector3) {
  return useMemo(() => {
    const avoidRay = () => ({
      position: [ray.x, ray.y, ray.z] as [number, number, number],
      radius: 1.8,
      weight: 7,
    });
    // Bar jacks hover above and behind a foraging ray to snatch prey it flushes from the sand.
    const jacks: SchoolBehavior = () => ({
      goal: [ray.x, ray.y + 0.6, ray.z - 0.5],
      goalWeight: 1.4,
      threat: undefined,
    });
    const grunts: SchoolBehavior = (t) => ({
      goal: [3.4 + Math.sin(t * 0.1) * 1.6, FLOOR_Y + 0.6, -6.8 + Math.cos(t * 0.08) * 1.4],
      goalWeight: 0.3,
      threat: avoidRay(),
    });
    const chromis: SchoolBehavior = (t) => ({
      goal: [-1.5 + Math.sin(t * 0.06) * 3, FLOOR_Y + 1.7, -7.5 + Math.cos(t * 0.05) * 2],
      goalWeight: 0.2,
      threat: avoidRay(),
    });
    // Wrasse stay at their cleaning station, and swim out to clean the ray when it passes close.
    const wrasse: SchoolBehavior = (t) => {
      const [sx, sy, sz] = CLEANING_STATION;
      const cleaning = Math.hypot(ray.x - sx, ray.y - sy, ray.z - sz) < 2.6;
      return cleaning
        ? { goal: [ray.x, ray.y, ray.z], goalWeight: 1.2, threat: undefined }
        : {
            goal: [sx + Math.sin(t * 0.7) * 0.4, sy + 0.25, sz + Math.cos(t * 0.5) * 0.4],
            goalWeight: 0.9,
            threat: undefined,
          };
    };
    return { jacks, grunts, chromis, wrasse };
  }, [ray]);
}

function RayPlacement({ still, worldPosition }: { still: boolean; worldPosition: Vector3 }) {
  const { viewport } = useThree();

  // On phones the hero text is bottom-aligned, so the ray uses the open space above it.
  const wide = viewport.aspect > 1.1;
  const x = wide ? viewport.width * 0.2 : 0;
  const y = wide ? 0.1 : viewport.height * 0.24;
  const scale = wide ? 0.95 : Math.min(0.6, viewport.width / 5.2);

  return (
    <group position={[x, y, 0]} scale={scale}>
      <Stingray still={still} worldPosition={worldPosition} minWorldY={FLOOR_Y + 0.5} />
    </group>
  );
}

export default function OceanScene() {
  const still = useReducedMotion() ?? false;
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const rayPosition = useMemo(() => new Vector3(), []);
  const behaviors = useBehaviors(rayPosition);
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
      <Reef still={still} lite={narrow} />
      <MarineSnow count={narrow ? 150 : 400} still={still} />
      <FishSchool species={BAR_JACK} count={n(BAR_JACK)} behavior={behaviors.jacks} still={still} />
      <FishSchool species={FRENCH_GRUNT} count={n(FRENCH_GRUNT)} behavior={behaviors.grunts} still={still} />
      <FishSchool species={BLUE_CHROMIS} count={n(BLUE_CHROMIS)} behavior={behaviors.chromis} still={still} />
      <FishSchool
        species={BLUEHEAD_WRASSE}
        count={n(BLUEHEAD_WRASSE)}
        behavior={behaviors.wrasse}
        still={still}
      />
      <RayPlacement still={still} worldPosition={rayPosition} />
    </Canvas>
  );
}
