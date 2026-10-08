"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture, PointsMaterial } from "three";
import { getScrollDepth } from "./scroll-depth";

const BOX = { x: 9, y: 5.5, zNear: 2, zFar: -7 };

function softDot() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new CanvasTexture(canvas);
}

/** Drifting organic particles, more visible the deeper the reader scrolls. */
export function MarineSnow({ count, still }: { count: number; still: boolean }) {
  const { geometry, fall, material } = useMemo(() => {
    const position = new Float32Array(count * 3);
    const fall = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      position[i * 3] = (Math.random() * 2 - 1) * BOX.x;
      position[i * 3 + 1] = (Math.random() * 2 - 1) * BOX.y;
      position[i * 3 + 2] = BOX.zFar + Math.random() * (BOX.zNear - BOX.zFar);
      fall[i] = 0.04 + Math.random() * 0.12;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(position, 3));
    const material = new PointsMaterial({
      size: 0.05,
      map: softDot(),
      color: "#e8f6ff",
      transparent: true,
      depthWrite: false,
      opacity: 0.3,
    });
    return { geometry, fall, material };
  }, [count]);

  useFrame(({ clock }, delta) => {
    material.opacity = 0.25 + 0.55 * getScrollDepth();
    if (still) return;
    const dt = Math.min(delta, 1 / 20);
    const position = geometry.getAttribute("position") as BufferAttribute;
    const arr = position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t * 0.3 + i) * 0.02 * dt;
      arr[i * 3 + 1] -= fall[i] * dt;
      if (arr[i * 3 + 1] < -BOX.y) arr[i * 3 + 1] = BOX.y;
    }
    position.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} />;
}
