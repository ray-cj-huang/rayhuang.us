export type Rgb = readonly [r: number, g: number, b: number];

type Stop = readonly [depth: number, hex: string];

export const LIGHT_WATER: readonly Stop[] = [
  [0, "#c9f1ee"],
  [0.3, "#6fd0d2"],
  [0.65, "#1f86b3"],
  [1, "#0b4f86"],
];

export const DARK_WATER: readonly Stop[] = [
  [0, "#1d4f6e"],
  [0.35, "#123a5a"],
  [0.7, "#0a2440"],
  [1, "#06223a"],
];

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Water color at a scroll depth, as sRGB components in 0..1.
 *
 * @param depth - 0 at the top of the page (surface) to 1 at the bottom (deep).
 */
export function waterColorAt(depth: number, stops: readonly Stop[] = LIGHT_WATER): Rgb {
  const d = Math.min(1, Math.max(0, depth));
  const upper = stops.findIndex(([at]) => at >= d);
  if (upper <= 0) return hexToRgb(stops[0][1]);
  const [fromAt, fromHex] = stops[upper - 1];
  const [toAt, toHex] = stops[upper];
  const t = (d - fromAt) / (toAt - fromAt);
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  if (t >= 1) return to;
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
}
