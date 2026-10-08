import { Color } from "three";
import type { FlockParams } from "./boids";

export const FLOOR_Y = -2.4;

/** A bluehead wrasse cleaning station on a brain coral head, which rays visit to have parasites picked off. */
export const CLEANING_STATION: [number, number, number] = [3.2, FLOOR_Y + 0.55, -6];

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
  /** Tail beats per second when cruising; faster fish beat faster. */
  tailBeat: number;
  count: { desktop: number; mobile: number };
  flock: Omit<FlockParams, "goal" | "goalWeight" | "threat">;
};

const c = (hex: string) => new Color(hex);

/** Silver with a dark back stripe; shadows foraging rays to snatch prey they stir from the sand. */
export const BAR_JACK: Species = {
  length: 0.5,
  height: 0.075,
  width: 0.4,
  shade: (back) =>
    back > 0.45 && back < 0.8 ? c("#1c2b45") : c("#dfe6ec").lerp(c("#6f8fa8"), Math.max(0, back)),
  fin: "#2a3d5c",
  tailBeat: 1.6,
  count: { desktop: 5, mobile: 3 },
  flock: {
    minSpeed: 0.5,
    maxSpeed: 1.8,
    neighborRadius: 1.2,
    separationRadius: 0.45,
    separation: 5,
    alignment: 0.8,
    cohesion: 0.3,
    bounds: { min: [-7, FLOOR_Y + 0.3, -6], max: [7, 2, 1] },
    boundsMargin: 0.6,
    boundsWeight: 1.5,
  },
};

/** Gold with blue stripes; schools low around patch reefs by day. */
export const FRENCH_GRUNT: Species = {
  length: 0.3,
  height: 0.06,
  width: 0.45,
  shade: (back, along) => {
    const stripe = (((back * 2.6 + along * 0.7) % 1) + 1) % 1 < 0.2;
    return stripe ? c("#4f7bb8") : c("#f7d774").lerp(c("#f0b92a"), (back + 1) / 2);
  },
  fin: "#e6a91c",
  tailBeat: 2.2,
  count: { desktop: 22, mobile: 10 },
  flock: {
    minSpeed: 0.25,
    maxSpeed: 0.9,
    neighborRadius: 1.2,
    separationRadius: 0.2,
    separation: 6,
    alignment: 1.6,
    cohesion: 1.1,
    bounds: { min: [-7, FLOOR_Y + 0.15, -10], max: [7, FLOOR_Y + 1.6, -2] },
    boundsMargin: 0.4,
    boundsWeight: 2,
  },
};

/** Small, bright blue plankton-pickers that hover in loose schools above the reef. */
export const BLUE_CHROMIS: Species = {
  length: 0.17,
  height: 0.04,
  width: 0.45,
  shade: (back) => c("#8ec2f5").lerp(c("#1f6fd6"), (back + 1) / 2),
  fin: "#2a7de0",
  tailBeat: 3,
  count: { desktop: 26, mobile: 12 },
  flock: {
    minSpeed: 0.3,
    maxSpeed: 1.1,
    neighborRadius: 1,
    separationRadius: 0.16,
    separation: 6,
    alignment: 1.4,
    cohesion: 0.9,
    bounds: { min: [-7, FLOOR_Y + 0.9, -11], max: [7, 1.6, -2] },
    boundsMargin: 0.5,
    boundsWeight: 1.8,
  },
};

/** Initial-phase bluehead wrasse: yellow with a dark midline stripe; the Caribbean's main cleaner fish. */
export const BLUEHEAD_WRASSE: Species = {
  length: 0.16,
  height: 0.03,
  width: 0.4,
  shade: (back) => (back > -0.15 && back < 0.2 ? c("#2b2b2b") : c("#f5d33a")),
  fin: "#f0c020",
  tailBeat: 3.2,
  count: { desktop: 8, mobile: 4 },
  flock: {
    minSpeed: 0.2,
    maxSpeed: 1.4,
    neighborRadius: 0.6,
    separationRadius: 0.14,
    separation: 5,
    alignment: 0.4,
    cohesion: 0.3,
    bounds: { min: [-7, FLOOR_Y + 0.1, -9], max: [7, FLOOR_Y + 2.5, -1] },
    boundsMargin: 0.3,
    boundsWeight: 2,
  },
};
