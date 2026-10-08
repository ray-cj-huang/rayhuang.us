import type { Obstacle } from "./boids";

export const FLOOR_Y = -2.4;

/** Coral heads ("bommies") rising from open sand, with the radius and height of their solid mass. */
export const BOMMIES: readonly { x: number; z: number; radius: number; height: number }[] = [
  { x: -5.4, z: -9, radius: 1.1, height: 1.1 },
  { x: 5.6, z: -10.5, radius: 1.3, height: 1.3 },
];

/** Sparse seaweed tufts on the sand. */
export const TUFTS: readonly [x: number, z: number][] = [
  [-1.8, -6.5],
  [1.6, -8.2],
  [3.4, -5.2],
  [-3.2, -11.5],
];

/** Everything fixed on the seafloor that fish and the stingray must not pass through. */
export const REEF_OBSTACLES: readonly Obstacle[] = [
  ...BOMMIES.map(({ x, z, radius, height }) => ({
    position: [x, FLOOR_Y, z] as [number, number, number],
    radii: [radius * 1.15, height * 1.1, radius * 1.15] as [number, number, number],
  })),
  ...TUFTS.map(([x, z]) => ({
    position: [x, FLOOR_Y, z] as [number, number, number],
    radii: [0.35, 0.75, 0.35] as [number, number, number],
  })),
];
