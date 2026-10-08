export type Vec3 = [x: number, y: number, z: number];

/** An axis-aligned ellipsoid that fish steer around and can never enter. */
export type Obstacle = { position: Vec3; radii: Vec3 };

export type Flock = {
  count: number;
  /** xyz per fish, packed. */
  position: Float32Array;
  /** xyz per fish, packed, in units per second. */
  velocity: Float32Array;
  /** Per-fish startle level, 1 right after a scare and decaying to 0; created on first step if missing. */
  startle?: Float32Array;
  /** Per-fish multiplier on cruising speed, so individuals don't move in lockstep. */
  pace?: Float32Array;
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
  obstacles?: readonly Obstacle[];
  /** Closest two fish may ever be, enforced after every step. */
  minDistance?: number;
  /** How many nearest neighbors each fish attends to; real fish track only a handful. */
  neighbors?: number;
  /** Half-angle of the blind zone behind each fish, in radians; neighbors there are ignored for alignment and cohesion. */
  blindAngle?: number;
  /** Fastest a fish can change heading, in radians per second. */
  maxTurnRate?: number;
  /** Fastest a fish can change speed, in units per second squared. */
  maxAccel?: number;
  /** Largest vertical component of a fish's heading, 0..1; fish swim mostly level. */
  maxPitch?: number;
};

const AVOID_MARGIN = 0.6;
const AVOID_WEIGHT = 6;
/** Fraction of the threat radius inside which a fish startles into a burst. */
const STARTLE_AT = 0.6;
const STARTLE_DECAY = 1.5;

/** Distance from an ellipsoid's center in units of its radii: under 1 means inside. */
function ellipsoidDistance(o: Obstacle, x: number, y: number, z: number) {
  return Math.hypot(
    (x - o.position[0]) / o.radii[0],
    (y - o.position[1]) / o.radii[1],
    (z - o.position[2]) / o.radii[2],
  );
}

export function createFlock(count: number, bounds: FlockParams["bounds"], random = Math.random): Flock {
  const position = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const pace = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      position[i * 3 + a] = bounds.min[a] + random() * (bounds.max[a] - bounds.min[a]);
    }
    velocity[i * 3] = random() - 0.5;
    velocity[i * 3 + 1] = (random() - 0.5) * 0.3;
    velocity[i * 3 + 2] = (random() - 0.5) * 0.5;
    pace[i] = 0.85 + random() * 0.3;
  }
  return { count, position, velocity, pace, startle: new Float32Array(count) };
}

/**
 * Advances the flock by `dt` seconds in place.
 *
 * Social rules follow Couzin's zonal model: a neighbor inside the separation radius triggers repulsion only;
 * otherwise each fish aligns with and moves toward its nearest visible neighbors.
 * Bounds, goal, obstacles and the threat then steer on top, and heading changes are rate-limited.
 */
export function stepFlock(flock: Flock, p: FlockParams, dt: number): void {
  const { count, position: pos, velocity: vel } = flock;
  flock.startle ??= new Float32Array(count);
  flock.pace ??= new Float32Array(count).fill(1);
  const { startle, pace } = flock;
  const accel = new Float32Array(count * 3);
  const k = p.neighbors ?? Number.POSITIVE_INFINITY;
  const blindCos = Math.cos(Math.PI - (p.blindAngle ?? 0));
  const nearby: { j: number; dist: number }[] = [];

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const speedI = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]) || 1;
    const away = [0, 0, 0];
    let crowded = false;
    nearby.length = 0;

    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const jx = j * 3;
      const dx = pos[ix] - pos[jx];
      const dy = pos[ix + 1] - pos[jx + 1];
      const dz = pos[ix + 2] - pos[jx + 2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > p.neighborRadius) continue;
      if (dist < p.separationRadius) {
        crowded = true;
        // Inverse-distance push, guarded so coincident fish still separate.
        const push = (p.separationRadius - dist) / Math.max(dist, 1e-3);
        away[0] += dx * push;
        away[1] += dy * push;
        away[2] += dz * push;
        continue;
      }
      // Fish can't see directly behind themselves, so they don't react to neighbors there.
      const ahead = -(dx * vel[ix] + dy * vel[ix + 1] + dz * vel[ix + 2]) / (dist * speedI);
      if (ahead < blindCos) continue;
      nearby.push({ j, dist });
    }

    const align = [0, 0, 0];
    const center = [0, 0, 0];
    let used = 0;
    if (!crowded && nearby.length > 0) {
      if (nearby.length > k) nearby.sort((a, b) => a.dist - b.dist);
      used = Math.min(k, nearby.length);
      for (let n = 0; n < used; n++) {
        const jx = nearby[n].j * 3;
        for (let a = 0; a < 3; a++) {
          align[a] += vel[jx + a];
          center[a] += pos[jx + a];
        }
      }
    }

    for (let a = 0; a < 3; a++) {
      let acc = away[a] * p.separation;
      if (used > 0) {
        acc += (align[a] / used - vel[ix + a]) * p.alignment;
        acc += (center[a] / used - pos[ix + a]) * p.cohesion;
      }
      const lo = p.bounds.min[a] + p.boundsMargin;
      const hi = p.bounds.max[a] - p.boundsMargin;
      if (pos[ix + a] < lo) acc += (lo - pos[ix + a]) * p.boundsWeight;
      if (pos[ix + a] > hi) acc -= (pos[ix + a] - hi) * p.boundsWeight;
      if (p.goal && p.goalWeight) acc += (p.goal[a] - pos[ix + a]) * p.goalWeight;
      accel[ix + a] = acc;
    }

    for (const o of p.obstacles ?? []) {
      const d = ellipsoidDistance(o, pos[ix], pos[ix + 1], pos[ix + 2]);
      if (d >= 1 + AVOID_MARGIN || d < 1e-6) continue;
      // Steer along the ellipsoid's outward normal, harder the closer the fish gets.
      const push = ((1 + AVOID_MARGIN - d) / AVOID_MARGIN) * AVOID_WEIGHT;
      const nx = (pos[ix] - o.position[0]) / o.radii[0] ** 2;
      const ny = (pos[ix + 1] - o.position[1]) / o.radii[1] ** 2;
      const nz = (pos[ix + 2] - o.position[2]) / o.radii[2] ** 2;
      const n = Math.hypot(nx, ny, nz) || 1;
      accel[ix] += (nx / n) * push;
      accel[ix + 1] += (ny / n) * push;
      accel[ix + 2] += (nz / n) * push;
    }

    startle[i] *= Math.exp(-dt * STARTLE_DECAY);
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
        if (dist < t.radius * STARTLE_AT) startle[i] = 1;
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    integrate(vel, ix, accel, dt, p, startle[i], pace[i]);
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

  // Hard constraints back up the steering, so no fish ever ends up inside an obstacle or another fish.
  for (let pass = 0; pass < 2; pass++) {
    if (p.minDistance) separateOverlaps(flock, p.minDistance);
    for (const o of p.obstacles ?? []) pushOutOf(flock, o);
  }
}

/** Applies steering to one fish's velocity, within its turn-rate, acceleration, pitch and speed limits. */
function integrate(
  vel: Float32Array,
  ix: number,
  accel: Float32Array,
  dt: number,
  p: FlockParams,
  startle: number,
  pace: number,
) {
  const speed = Math.hypot(vel[ix], vel[ix + 1], vel[ix + 2]);
  const want = [vel[ix] + accel[ix] * dt, vel[ix + 1] + accel[ix + 1] * dt, vel[ix + 2] + accel[ix + 2] * dt];
  const wantSpeed = Math.hypot(want[0], want[1], want[2]);
  // A startled fish bursts to roughly double speed and turns hard: the "flash expansion" escape.
  const topSpeed = p.maxSpeed * (1 + startle);
  const target = Math.min(topSpeed, Math.max(p.minSpeed, wantSpeed * (startle > 0.05 ? 1 : pace)));

  let dir = speed > 1e-6 ? [vel[ix] / speed, vel[ix + 1] / speed, vel[ix + 2] / speed] : [1, 0, 0];
  let goal = wantSpeed > 1e-6 ? [want[0] / wantSpeed, want[1] / wantSpeed, want[2] / wantSpeed] : dir;
  // Limit the pitch of the heading being turned toward, so fish level out gradually instead of snapping flat.
  const maxPitch = p.maxPitch ?? 1;
  if (Math.abs(goal[1]) > maxPitch) {
    const level = Math.hypot(goal[0], goal[2]);
    const flat = Math.sqrt(1 - maxPitch ** 2);
    goal =
      level > 1e-6
        ? [(goal[0] / level) * flat, Math.sign(goal[1]) * maxPitch, (goal[2] / level) * flat]
        : dir;
  }
  const maxTurn = (p.maxTurnRate ?? Number.POSITIVE_INFINITY) * (1 + startle * 2) * dt;
  const cos = Math.min(1, Math.max(-1, dir[0] * goal[0] + dir[1] * goal[1] + dir[2] * goal[2]));
  const angle = Math.acos(cos);
  if (angle <= maxTurn) dir = goal;
  else {
    // Rotate toward the goal heading by at most maxTurn, within the plane the two directions span.
    let perp = [goal[0] - dir[0] * cos, goal[1] - dir[1] * cos, goal[2] - dir[2] * cos];
    let len = Math.hypot(perp[0], perp[1], perp[2]);
    if (len < 1e-6) {
      perp = [-dir[2], 0, dir[0]];
      len = Math.hypot(perp[0], perp[1], perp[2]) || 1;
    }
    const c = Math.cos(maxTurn);
    const s = Math.sin(maxTurn);
    dir = [0, 1, 2].map((a) => dir[a] * c + (perp[a] / len) * s);
  }

  const maxDelta = (p.maxAccel ?? Number.POSITIVE_INFINITY) * (1 + startle * 3) * dt;
  const next = speed + Math.min(maxDelta, Math.max(-maxDelta, target - speed));
  const finalSpeed = Math.min(topSpeed, Math.max(p.minSpeed, next));
  for (let a = 0; a < 3; a++) vel[ix + a] = dir[a] * finalSpeed;
}

function separateOverlaps({ count, position: pos }: Flock, minDistance: number) {
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = pos[j * 3] - pos[i * 3];
      const dy = pos[j * 3 + 1] - pos[i * 3 + 1];
      const dz = pos[j * 3 + 2] - pos[i * 3 + 2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist >= minDistance) continue;
      const [ux, uy, uz] = dist > 1e-6 ? [dx / dist, dy / dist, dz / dist] : [1, 0, 0];
      const half = (minDistance - dist) / 2;
      pos[i * 3] -= ux * half;
      pos[i * 3 + 1] -= uy * half;
      pos[i * 3 + 2] -= uz * half;
      pos[j * 3] += ux * half;
      pos[j * 3 + 1] += uy * half;
      pos[j * 3 + 2] += uz * half;
    }
  }
}

function pushOutOf({ count, position: pos, velocity: vel }: Flock, o: Obstacle) {
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const d = ellipsoidDistance(o, pos[ix], pos[ix + 1], pos[ix + 2]);
    if (d >= 1) continue;
    const scale = d > 1e-6 ? 1.001 / d : 0;
    for (let a = 0; a < 3; a++) {
      const offset = pos[ix + a] - o.position[a];
      pos[ix + a] = o.position[a] + (scale ? offset * scale : a === 1 ? o.radii[1] * 1.001 : 0);
    }
    // Drop the velocity component pointing into the obstacle so the fish slides along its surface.
    const nx = (pos[ix] - o.position[0]) / o.radii[0] ** 2;
    const ny = (pos[ix + 1] - o.position[1]) / o.radii[1] ** 2;
    const nz = (pos[ix + 2] - o.position[2]) / o.radii[2] ** 2;
    const n = Math.hypot(nx, ny, nz) || 1;
    const inward = (vel[ix] * nx + vel[ix + 1] * ny + vel[ix + 2] * nz) / n;
    if (inward < 0) {
      vel[ix] -= (inward * nx) / n;
      vel[ix + 1] -= (inward * ny) / n;
      vel[ix + 2] -= (inward * nz) / n;
    }
  }
}
