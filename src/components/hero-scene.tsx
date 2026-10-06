"use client";

import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useRef } from "react";
import type { Mesh } from "three";

function Blob({ still }: { still: boolean }) {
  const mesh = useRef<Mesh>(null);
  const { viewport } = useThree();

  // On wide screens sit to the right of the headline; on narrow ones, center and shrink behind it.
  const wide = viewport.aspect > 1.1;
  const anchorX = wide ? viewport.width * 0.28 : 0;
  const scale = wide ? 1.2 : 1.1;

  // Ease the blob toward the pointer for a subtle parallax feel.
  useFrame(({ pointer }, delta) => {
    if (!mesh.current || still) return;
    mesh.current.rotation.y += delta * 0.15;
    mesh.current.rotation.x += (pointer.y * 0.4 - mesh.current.rotation.x) * 0.05;
    mesh.current.position.x += (anchorX + pointer.x * 0.3 - mesh.current.position.x) * 0.05;
  });

  return (
    <Float speed={still ? 0 : 1.4} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={mesh} scale={scale} position-x={anchorX}>
        <icosahedronGeometry args={[1, 32]} />
        <MeshDistortMaterial
          color="#5b8cff"
          emissive="#1b2a6b"
          roughness={0.15}
          metalness={0.6}
          distort={still ? 0 : 0.35}
          speed={1.6}
        />
      </mesh>
    </Float>
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
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <pointLight position={[-4, -2, -3]} color="#c084fc" intensity={30} />
      <Blob still={still} />
      {!still && <Sparkles count={60} scale={7} size={2} speed={0.3} color="#a5b4fc" />}
    </Canvas>
  );
}
