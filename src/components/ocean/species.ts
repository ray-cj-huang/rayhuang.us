import { Color } from "three";
import type { FlockParams } from "./boids";
import { FLOOR_Y } from "./layout";

type Shading = (back: number, along: number) => Color;

export type Species = {
  length: number;
  /** Half the body depth, top to belly. */
  height: number;
  /** Width as a fraction of height; fish are laterally compressed, so well under 1. */
  width: number;
  /**
   * Body color at a point.
   * `back` runs -1 (belly) to 1 (back); `along` runs -1 (tail) to 1 (nose).
   */
  shade: Shading;
  fin: string;
  /** Silvery schooling fish are highly reflective; reef fish are matte. */
  metalness: number;
  roughness: number;
  /** Tail beats per second when cruising; faster fish beat faster. */
  tailBeat: number;
  count: { desktop: number; mobile: number };
  flock: Omit<FlockParams, "goal" | "goalWeight" | "threat">;
};

const c = (hex: string) => new Color(hex);

/** Small silver schooling fish (sardines, silversides) that mill in a tight ball and part around predators. */
export const BAITFISH: Species = {
  length: 0.17,
  height: 0.026,
  width: 0.5,
  // Dark blue-green back, a faint iridescent band, then mirror-silver flanks and belly, as on sardines.
  shade: (back) =>
    back > 0.55
      ? c("#24485f")
      : back > 0.35
        ? c("#3f8a8c")
        : c("#f1f5f7").lerp(c("#b9c7d1"), Math.max(0, back + 0.4)),
  fin: "#9fb4c6",
  metalness: 0.75,
  roughness: 0.22,
  tailBeat: 3.4,
  count: { desktop: 90, mobile: 36 },
  flock: {
    minSpeed: 0.6,
    maxSpeed: 1.7,
    neighborRadius: 1.6,
    separationRadius: 0.15,
    separation: 8,
    alignment: 2.4,
    cohesion: 2.6,
    bounds: { min: [-7, FLOOR_Y + 1.6, -11], max: [7, 1.8, -2] },
    boundsMargin: 0.6,
    boundsWeight: 2,
    neighbors: 7,
    blindAngle: 0.5,
    maxTurnRate: 4,
    maxAccel: 2.5,
    maxPitch: 0.3,
  },
};

/** Gold with blue stripes; small groups hang around coral heads by day. */
export const FRENCH_GRUNT: Species = {
  length: 0.28,
  height: 0.055,
  width: 0.45,
  shade: (back, along) => {
    const stripe = (((back * 2.6 + along * 0.7) % 1) + 1) % 1 < 0.2;
    return stripe ? c("#4f7bb8") : c("#f7d774").lerp(c("#f0b92a"), (back + 1) / 2);
  },
  fin: "#e6a91c",
  metalness: 0.1,
  roughness: 0.5,
  tailBeat: 2.2,
  count: { desktop: 9, mobile: 5 },
  flock: {
    minSpeed: 0.2,
    maxSpeed: 0.9,
    neighborRadius: 1.2,
    separationRadius: 0.22,
    separation: 6,
    alignment: 1.4,
    cohesion: 1,
    bounds: { min: [-8, FLOOR_Y + 0.2, -12], max: [8, FLOOR_Y + 1.3, -5] },
    boundsMargin: 0.4,
    boundsWeight: 2,
    neighbors: 5,
    blindAngle: 0.5,
    maxTurnRate: 2.5,
    maxAccel: 1.5,
    maxPitch: 0.25,
  },
};
