import { describe, expect, test } from "bun:test";
import { createFlock, type FlockParams, stepFlock } from "./boids";
import { seeded } from "./random";

const params: FlockParams = {
  minSpeed: 0.3,
  maxSpeed: 1,
  neighborRadius: 1,
  separationRadius: 0.3,
  separation: 4,
  alignment: 0.8,
  cohesion: 0.4,
  bounds: { min: [-3, -2, -4], max: [3, 2, 0.5] },
  boundsMargin: 0.5,
  boundsWeight: 2,
  goal: [0, 0, -1],
  goalWeight: 0.05,
};

function simulate(steps: number, onStep: (flock: ReturnType<typeof createFlock>) => void) {
  const flock = createFlock(36, params.bounds, seeded(7));
  for (let s = 0; s < steps; s++) {
    stepFlock(flock, params, 1 / 60);
    onStep(flock);
  }
  return flock;
}

describe("stepFlock", () => {
  test("keeps every fish's speed within limits", () => {
    simulate(600, (flock) => {
      for (let i = 0; i < flock.count; i++) {
        const v = flock.velocity;
        const speed = Math.hypot(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);
        expect(speed).toBeGreaterThanOrEqual(params.minSpeed - 1e-4);
        expect(speed).toBeLessThanOrEqual(params.maxSpeed + 1e-4);
      }
    });
  });

  test("keeps every fish inside the bounds", () => {
    simulate(2000, (flock) => {
      for (let i = 0; i < flock.count; i++) {
        for (let a = 0; a < 3; a++) {
          const value = flock.position[i * 3 + a];
          expect(value).toBeGreaterThanOrEqual(params.bounds.min[a]);
          expect(value).toBeLessThanOrEqual(params.bounds.max[a]);
        }
      }
    });
  });

  test("pushes overlapping fish apart", () => {
    const flock = {
      count: 2,
      position: new Float32Array([0, 0, -1, 0.02, 0, -1]),
      velocity: new Float32Array([0.5, 0, 0, 0.5, 0, 0]),
    };
    for (let s = 0; s < 120; s++) stepFlock(flock, { ...params, cohesion: 0, goal: undefined }, 1 / 60);
    const [ax, ay, az, bx, by, bz] = flock.position;
    expect(Math.hypot(ax - bx, ay - by, az - bz)).toBeGreaterThan(params.separationRadius * 0.6);
  });

  test("steers fish away from a threat", () => {
    const flock = {
      count: 1,
      position: new Float32Array([0.2, 0, -1]),
      velocity: new Float32Array([-0.5, 0, 0]),
    };
    const threat = { position: [0, 0, -1] as [number, number, number], radius: 1, weight: 8 };
    for (let s = 0; s < 60; s++) stepFlock(flock, { ...params, goal: undefined, threat }, 1 / 60);
    expect(Math.hypot(flock.position[0], flock.position[1], flock.position[2] + 1)).toBeGreaterThan(0.2);
  });
});
