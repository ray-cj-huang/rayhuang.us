/**
 * GLSL for a cheap caustic web: domain-warped sine ridges, which read as light focused by surface ripples.
 * Defines `float caustic(vec2 p, float t)` returning roughly 0..1.
 */
export const CAUSTIC_GLSL = `
  float causticRidge(float v) { return pow(1.0 - abs(sin(v)), 6.0); }
  float caustic(vec2 p, float t) {
    p += 0.45 * vec2(sin(p.y * 1.3 + t * 0.5), cos(p.x * 1.1 - t * 0.4));
    return (causticRidge(p.x * 1.7 + t * 0.6) + causticRidge(p.y * 1.9 - t * 0.5)
      + causticRidge((p.x + p.y) * 1.3 + t * 0.45)) / 3.0;
  }
`;
