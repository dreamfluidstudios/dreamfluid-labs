// Click-ripple scheduling for the tile field. Pure functions — no DOM.

export type RippleShape = "square" | "round";

// One tile of a ripple: grid position, activation delay from the click (ms),
// and peak brightness (0..1) when it lights.
export type RippleTile = { c: number; r: number; at: number; peak: number };

// How far a click ripple expands (tiles away from the clicked one).
export const RIPPLE_RANGE = 3;
// Delay per tile of distance from the click.
export const RING_MS = 90;
// Ripple brightness at the outermost tiles (1 at the clicked tile).
export const RIPPLE_EDGE = 0.35;
// Ripple tiles fade this much faster than hover-trail tiles, so the wave
// reads as a moving band instead of a filled block.
export const RIPPLE_DECAY = 2.2;

// "round" measures Euclidean distance (diagonals count as √2 ≈ 1.4), so the
// wavefront expands as a circle. "square" measures Chebyshev distance
// (diagonals count as 1), so whole square rings fire together.
const distance = (shape: RippleShape, dc: number, dr: number) =>
  shape === "round"
    ? Math.hypot(dc, dr)
    : Math.max(Math.abs(dc), Math.abs(dr));

// Every tile within `range` of (c0, r0), sorted by activation time. Range
// defaults to RIPPLE_RANGE (click ripples); callers can pass a larger reach
// for a bigger wave, e.g. the element slam impact.
export const buildRipple = (
  shape: RippleShape,
  c0: number,
  r0: number,
  range: number = RIPPLE_RANGE,
): RippleTile[] => {
  const out: RippleTile[] = [];
  for (let dc = -range; dc <= range; dc++) {
    for (let dr = -range; dr <= range; dr++) {
      const d = distance(shape, dc, dr);
      if (d > range) continue;
      out.push({
        c: c0 + dc,
        r: r0 + dr,
        at: d * RING_MS,
        peak: 1 - (1 - RIPPLE_EDGE) * (d / range),
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
};
