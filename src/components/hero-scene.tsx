"use client";

import { Sparkles } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Stingray } from "./stingray";

function Placement({ still }: { still: boolean }) {
  const { viewport } = useThree();

  // Wide screens: swim to the right of the headline. Narrow (phones): swim in the open space
  // above the text, which is bottom-aligned on mobile, sized to fit the screen width.
  const wide = viewport.aspect > 1.1;
  const x = wide ? viewport.width * 0.2 : 0;
  const y = wide ? 0.1 : viewport.height * 0.24;
  const scale = wide ? 0.95 : Math.min(0.6, viewport.width / 5.2);

  return (
    <group position={[x, y, 0]} scale={scale}>
      <Stingray still={still} />
    </group>
  );
}

export default function HeroScene() {
  const still = useReducedMotion() ?? false;
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, narrow ? 1.5 : 1.75]}
      frameloop={still ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 4]} intensity={2.4} />
      <pointLight position={[-4, -2, -3]} color="#c084fc" intensity={25} />
      <Placement still={still} />
      {!still && (
        <Sparkles count={narrow ? 35 : 70} scale={[9, 5, 4]} size={2} speed={0.25} color="#a5b4fc" />
      )}
    </Canvas>
  );
}
