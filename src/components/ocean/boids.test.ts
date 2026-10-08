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

  test("never leaves a fish inside an obstacle", () => {
    const obstacle = {
      position: [0, 0, -1.5] as [number, number, number],
      radii: [1.2, 0.5, 0.8] as [number, number, number],
    };
    const flock = createFlock(36, params.bounds, seeded(3));
    for (let s = 0; s < 1500; s++) {
      // Move the obstacle around like the stingray does, sweeping through the school.
      obstacle.position[0] = Math.sin(s / 90) * 2;
      stepFlock(flock, { ...params, obstacles: [obstacle], minDistance: 0.08 }, 1 / 60);
      for (let i = 0; i < flock.count; i++) {
        const [x, y, z] = [flock.position[i * 3], flock.position[i * 3 + 1], flock.position[i * 3 + 2]];
        const d = Math.hypot((x - obstacle.position[0]) / 1.2, y / 0.5, (z + 1.5) / 0.8);
        expect(d).toBeGreaterThanOrEqual(0.999);
      }
    }
  });

  test("keeps fish at least the minimum distance apart", () => {
    const flock = createFlock(36, params.bounds, seeded(9));
    for (let s = 0; s < 600; s++) stepFlock(flock, { ...params, cohesion: 3, minDistance: 0.1 }, 1 / 60);
    for (let i = 0; i < flock.count; i++) {
      for (let j = i + 1; j < flock.count; j++) {
        const d = Math.hypot(
          flock.position[i * 3] - flock.position[j * 3],
          flock.position[i * 3 + 1] - flock.position[j * 3 + 1],
          flock.position[i * 3 + 2] - flock.position[j * 3 + 2],
        );
        expect(d).toBeGreaterThan(0.1 * 0.9);
      }
    }
  });

  test("never turns faster than the max turn rate", () => {
    const realistic = { ...params, maxTurnRate: 3, maxPitch: 0.35, maxAccel: 2 };
    const flock = createFlock(36, params.bounds, seeded(4));
    const dt = 1 / 60;
    for (let s = 0; s < 600; s++) {
      const before = Float32Array.from(flock.velocity);
      stepFlock(flock, realistic, dt);
      for (let i = 0; i < flock.count; i++) {
        const a = [before[i * 3], before[i * 3 + 1], before[i * 3 + 2]];
        const b = [flock.velocity[i * 3], flock.velocity[i * 3 + 1], flock.velocity[i * 3 + 2]];
        // Wall bounces reflect velocity outright; only check steering turns away from the walls.
        const nearWall = [0, 1, 2].some((ax) => {
          const v = flock.position[i * 3 + ax];
          return v <= params.bounds.min[ax] + 1e-4 || v >= params.bounds.max[ax] - 1e-4;
        });
        if (nearWall) continue;
        const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b));
        expect(Math.acos(Math.min(1, cos))).toBeLessThanOrEqual(3 * dt + 1e-3);
      }
    }
  });

  test("keeps fish swimming mostly level", () => {
    const flock = createFlock(36, params.bounds, seeded(6));
    for (let s = 0; s < 600; s++) stepFlock(flock, { ...params, maxPitch: 0.35, maxTurnRate: 3 }, 1 / 60);
    for (let i = 0; i < flock.count; i++) {
      const v = [flock.velocity[i * 3], flock.velocity[i * 3 + 1], flock.velocity[i * 3 + 2]];
      const atWall =
        flock.position[i * 3 + 1] <= params.bounds.min[1] + 1e-4 ||
        flock.position[i * 3 + 1] >= params.bounds.max[1] - 1e-4;
      if (!atWall) expect(Math.abs(v[1]) / Math.hypot(...v)).toBeLessThanOrEqual(0.35 + 0.02);
    }
  });

  test("startled fish burst faster than cruising speed", () => {
    const flock = {
      count: 1,
      position: new Float32Array([0.2, 0, -1]),
      velocity: new Float32Array([0.5, 0, 0]),
    };
    const threat = { position: [0, 0, -1] as [number, number, number], radius: 1, weight: 20 };
    for (let s = 0; s < 10; s++)
      stepFlock(flock, { ...params, goal: undefined, threat, maxAccel: 2 }, 1 / 60);
    expect(Math.hypot(flock.velocity[0], flock.velocity[1], flock.velocity[2])).toBeGreaterThan(
      params.maxSpeed,
    );
  });
});
