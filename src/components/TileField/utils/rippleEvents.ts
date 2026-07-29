// Window-event contract letting other components disturb the tile field
// programmatically (e.g. the periodic element card's slam landing) using the
// same ripple machinery as pointer clicks.

import type { RippleShape } from "./ripple";

export const TILE_RIPPLE_EVENT = "df:tile-ripple";

// shape/range omitted → the field's configured defaults; set either to
// override per-emit (e.g. the slam impact rippling farther than a click).
export type TileRippleDetail = {
  x: number;
  y: number;
  shape?: RippleShape;
  range?: number;
};

export const emitTileRipple = (
  x: number,
  y: number,
  opts: { shape?: RippleShape; range?: number } = {},
) => {
  window.dispatchEvent(
    new CustomEvent<TileRippleDetail>(TILE_RIPPLE_EVENT, {
      detail: { x, y, ...opts },
    }),
  );
};

// One-shot signal to start the field's idle auto-trails — slow horizontal
// sweeps that read like a cursor being dragged across the screen. The hero
// fires this once its entrance finishes so the trails don't compete with it.
export const TILE_SWEEP_EVENT = "df:tile-sweep-start";

export const emitTileSweepStart = () => {
  window.dispatchEvent(new CustomEvent(TILE_SWEEP_EVENT));
};
