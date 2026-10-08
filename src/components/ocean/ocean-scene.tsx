"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { type AmbientLight, Color, type DirectionalLight, FogExp2, SRGBColorSpace, Vector3 } from "three";
import { FishSchool } from "./fish-school";
import { Caustics, GodRays } from "./light-rays";
import { MarineSnow } from "./marine-snow";
import { DARK_WATER, LIGHT_WATER, waterColorAt } from "./palette";
import { getScrollDepth } from "./scroll-depth";
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
    water.fog.density = 0.03 + depth * 0.07;
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

function RayPlacement({ still, worldPosition }: { still: boolean; worldPosition: Vector3 }) {
  const { viewport } = useThree();

  // On phones the hero text is bottom-aligned, so the ray uses the open space above it.
  const wide = viewport.aspect > 1.1;
  const x = wide ? viewport.width * 0.2 : 0;
  const y = wide ? 0.1 : viewport.height * 0.24;
  const scale = wide ? 0.95 : Math.min(0.6, viewport.width / 5.2);

  return (
    <group position={[x, y, 0]} scale={scale}>
      <Stingray still={still} worldPosition={worldPosition} />
    </group>
  );
}

export default function OceanScene() {
  const still = useReducedMotion() ?? false;
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const rayPosition = useMemo(() => new Vector3(), []);

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, narrow ? 1.5 : 1.75]}
      frameloop={still ? "demand" : "always"}
      gl={{ antialias: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <Water dark={dark} still={still} />
      <GodRays still={still} />
      {!narrow && <Caustics still={still} />}
      <MarineSnow count={narrow ? 150 : 400} still={still} />
      <FishSchool count={narrow ? 14 : 36} threat={rayPosition} still={still} />
      <RayPlacement still={still} worldPosition={rayPosition} />
    </Canvas>
  );
}
