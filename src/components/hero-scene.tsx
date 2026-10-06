"use client";

import { Sparkles } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Stingray } from "./stingray";

function Placement({ still }: { still: boolean }) {
  const { viewport } = useThree();

  // On wide screens swim to the right of the headline; on narrow ones, center and shrink behind it.
  const wide = viewport.aspect > 1.1;
  const x = wide ? viewport.width * 0.2 : 0;
  const scale = wide ? 0.95 : 0.7;

  return (
    <group position={[x, 0.1, 0]} scale={scale}>
      <Stingray still={still} />
    </group>
  );
}

export default function HeroScene() {
  const still = useReducedMotion() ?? false;

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.75]}
      frameloop={still ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 4]} intensity={2.4} />
      <pointLight position={[-4, -2, -3]} color="#c084fc" intensity={25} />
      <Placement still={still} />
      {!still && <Sparkles count={70} scale={[9, 5, 4]} size={2} speed={0.25} color="#a5b4fc" />}
    </Canvas>
  );
}
