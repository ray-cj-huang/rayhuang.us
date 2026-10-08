import { describe, expect, test } from "bun:test";
import { DARK_WATER, LIGHT_WATER, waterColorAt } from "./palette";

const luminance = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("waterColorAt", () => {
  test("matches the surface and deep stops exactly", () => {
    expect(waterColorAt(0)).toEqual([0xd9 / 255, 0xf2 / 255, 0xfb / 255]);
    expect(waterColorAt(1)).toEqual([0x0a / 255, 0x23 / 255, 0x42 / 255]);
  });

  test("clamps depth outside 0..1", () => {
    expect(waterColorAt(-1)).toEqual(waterColorAt(0));
    expect(waterColorAt(2)).toEqual(waterColorAt(1));
  });

  test.each([
    ["light", LIGHT_WATER],
    ["dark", DARK_WATER],
  ])("%s water darkens monotonically with depth", (_, stops) => {
    let previous = Number.POSITIVE_INFINITY;
    for (let d = 0; d <= 1.0001; d += 0.02) {
      const l = luminance(waterColorAt(d, stops));
      expect(l).toBeLessThanOrEqual(previous + 1e-9);
      previous = l;
    }
  });
});
