export type Vec3 = [x: number, y: number, z: number];

export type Flock = {
  count: number;
  /** xyz per fish, packed. */
  position: Float32Array;
  /** xyz per fish, packed, in units per second. */
  velocity: Float32Array;
};

export type FlockParams = {
  minSpeed: number;
  maxSpeed: number;
  neighborRadius: number;
  separationRadius: number;
  separation: number;
  alignment: number;
  cohesion: number;
  bounds: { min: Vec3; max: Vec3 };
  /** Distance inside the bounds where fish start turning back. */
  boundsMargin: number;
  boundsWeight: number;
  goal?: Vec3;
  goalWeight?: number;
  threat?: { position: Vec3; radius: number; weight: number };
};

export function createFlock(count: number, bounds: FlockParams["bounds"], random = Math.random): Flock {
  const position = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      position[i * 3 + a] = bounds.min[a] + random() * (bounds.max[a] - bounds.min[a]);
    }
    velocity[i * 3] = random() - 0.5;
    velocity[i * 3 + 1] = (random() - 0.5) * 0.3;
    velocity[i * 3 + 2] = (random() - 0.5) * 0.5;
  }
  return { count, position, velocity };
}

/** Advances the flock by `dt` seconds in place, using classic boids rules plus bounds, goal and threat. */
export function stepFlock(flock: Flock, p: FlockParams, dt: number): void {
  const { count, position: pos, velocity: vel } = flock;
  const accel = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    let neighbors = 0;
    const align = [0, 0, 0];
    const center = [0, 0, 0];
    const away = [0, 0, 0];

    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const jx = j * 3;
      const dx = pos[ix] - pos[jx];
      const dy = pos[ix + 1] - pos[jx + 1];
      const dz = pos[ix + 2] - pos[jx + 2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > p.neighborRadius) continue;
      neighbors++;
      for (let a = 0; a < 3; a++) {
        align[a] += vel[jx + a];
        center[a] += pos[jx + a];
      }
      if (dist < p.separationRadius) {
        // Inverse-distance push, guarded so coincident fish still separate.
        const push = (p.separationRadius - dist) / Math.max(dist, 1e-3);
        away[0] += dx * push;
        away[1] += dy * push;
        away[2] += dz * push;
      }
    }

    for (let a = 0; a < 3; a++) {
      let acc = away[a] * p.separation;
      if (neighbors > 0) {
        acc += (align[a] / neighbors - vel[ix + a]) * p.alignment;
        acc += (center[a] / neighbors - pos[ix + a]) * p.cohesion;
      }
      const lo = p.bounds.min[a] + p.boundsMargin;
      const hi = p.bounds.max[a] - p.boundsMargin;
      if (pos[ix + a] < lo) acc += (lo - pos[ix + a]) * p.boundsWeight;
      if (pos[ix + a] > hi) acc -= (pos[ix + a] - hi) * p.boundsWeight;
      if (p.goal && p.goalWeight) acc += (p.goal[a] - pos[ix + a]) * p.goalWeight;
      accel[ix + a] = acc;
    }

    if (p.threat) {
      const t = p.threat;
      const dx = pos[ix] - t.position[0];
      const dy = pos[ix + 1] - t.position[1];
      const dz = pos[ix + 2] - t.position[2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist < t.radius && dist > 1e-3) {
        const flee = ((t.radius - dist) / t.radius) * t.weight;
        accel[ix] += (dx / dist) * flee;
        accel[ix + 1] += (dy / dist) * flee;
        accel[ix + 2] += (dz / dist) * flee;
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    for (let a = 0; a < 3; a++) vel[ix + a] += accel[ix + a] * dt;

    const speed = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]);
    const clamped = Math.min(p.maxSpeed, Math.max(p.minSpeed, speed));
    const scale = speed > 1e-6 ? clamped / speed : 0;
    if (scale === 0) vel[ix] = p.minSpeed;
    else for (let a = 0; a < 3; a++) vel[ix + a] *= scale;

    for (let a = 0; a < 3; a++) {
      pos[ix + a] += vel[ix + a] * dt;
      // Hard walls as a backstop for the soft steering above, so no fish can escape the view.
      if (pos[ix + a] < p.bounds.min[a]) {
        pos[ix + a] = p.bounds.min[a];
        vel[ix + a] = Math.abs(vel[ix + a]);
      } else if (pos[ix + a] > p.bounds.max[a]) {
        pos[ix + a] = p.bounds.max[a];
        vel[ix + a] = -Math.abs(vel[ix + a]);
      }
    }
  }
}
