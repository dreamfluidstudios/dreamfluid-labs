import { useEffect, type RefObject } from "react";
import {
  buildRipple,
  RIPPLE_DECAY,
  type RippleShape,
  type RippleTile,
} from "../utils/ripple";
import {
  TILE_RIPPLE_EVENT,
  TILE_SWEEP_EVENT,
  type TileRippleDetail,
} from "../utils/rippleEvents";

// Must match the ambient grid's background-size so lit tiles sit exactly on its lines.
export const CELL = 72;

// Idle auto-trail tuning: a single virtual cursor dragged straight across one
// row. A fixed glide speed (px per ms) so the trail moves the same on any
// screen — wider viewports simply take longer to cross. One trail at a time,
// with a random idle gap between them.
const SWEEP_SPEED = 0.45; // px/ms
const SWEEP_GAP_MIN_MS = 1800;
const SWEEP_GAP_MAX_MS = 5000;

// Neutral shades only — brightness varies per tile, hue never does. The ramp is
// interpolated between the brand's two light neutrals, Clarity White (df-white)
// and Silver Veil (df-silver); the palette has no tokens between them. Stops are
// weighted toward the light end rather than evenly spaced, and dimmer greys
// carry more alpha, so every shade reads against the background.
const SHADE_FROM = { r: 250, g: 250, b: 250 }; // #FAFAFA Clarity White
const SHADE_TO = { r: 108, g: 110, b: 113 }; // #6C6E71 Silver Veil

const SHADE_STOPS = [
  { t: 0, fill: 0.05, line: 0.15 },
  { t: 0.27, fill: 0.07, line: 0.13 },
  { t: 0.56, fill: 0.09, line: 0.115 },
  { t: 1, fill: 0.12, line: 0.1 },
];

const mix = (from: number, to: number, t: number) =>
  Math.round(from + (to - from) * t);

const SHADES = SHADE_STOPS.map(({ t, fill, line }) => ({
  r: mix(SHADE_FROM.r, SHADE_TO.r, t),
  g: mix(SHADE_FROM.g, SHADE_TO.g, t),
  b: mix(SHADE_FROM.b, SHADE_TO.b, t),
  fill,
  line,
}));

// How long a hover-trail tile takes to fade out.
const FADE_MS = 900;

type Shade = (typeof SHADES)[number];
type Tile = { heat: number; peak: number; decay: number; shade: Shade };
type Ripple = { start: number; idx: number; tiles: RippleTile[] };

// Drives the tile-field canvas: hover lights the tile under the cursor and
// leaves a fading trail; a click spawns a ripple in the given shape.
export const useTileField = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rippleShape: RippleShape,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tiles = new Map<number, Tile>();
    const ripples: Ripple[] = [];
    let current = -1;
    let raf = 0;
    let last = 0;
    let cols = 0;
    let rows = 0;
    // Geometry is derived from the canvas's own measured box (not the window),
    // so the bitmap always matches its on-screen size 1:1 and the lit tiles stay
    // locked to the CSS grid bed — even on mobile, where the element's height
    // (100vh) and window.innerHeight diverge behind the URL bar. width/height are
    // CSS px; originX/originY are the canvas's viewport offset, used to map
    // pointer/event coordinates (which are viewport-relative) into local space.
    let width = 0;
    let height = 0;
    let originX = 0;
    let originY = 0;
    // Idle auto-trail: an in-flight sweep (a virtual cursor at pixel x on `row`
    // moving in `dir`), plus the pending timer for the next one. `sweeping`
    // gates the whole loop until the hero signals its entrance is done.
    let sweep: { dir: 1 | -1; row: number; x: number } | null = null;
    let sweepTimer = 0;
    let sweeping = false;

    // Cheap re-read of the canvas's box; scroll only shifts the origin, so it
    // updates offsets without touching the (unchanged) bitmap size.
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      originX = rect.left;
      originY = rect.top;
    };

    const resize = () => {
      measure();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL) + 1;
      rows = Math.ceil(height / CELL) + 1;
      tiles.clear();
      ripples.length = 0;
      ctx.clearRect(0, 0, width, height);
    };

    const light = (c: number, r: number, peak: number, decay: number) => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const key = r * cols + c;
      const tile = tiles.get(key);
      if (tile) {
        tile.heat = 1;
        tile.peak = Math.max(tile.peak, peak);
        tile.decay = Math.min(tile.decay, decay);
      } else {
        tiles.set(key, {
          heat: 1,
          peak,
          decay,
          shade: SHADES[Math.floor(Math.random() * SHADES.length)],
        });
      }
    };

    const draw = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (sweep) {
        // Relighting the current column every frame keeps the leading tile
        // pinned at full heat (like a held hover) while the ones behind fade.
        sweep.x += sweep.dir * SWEEP_SPEED * dt;
        light(Math.floor(sweep.x / CELL), sweep.row, 1, 1);
        const gone =
          sweep.dir === 1 ? sweep.x > width + CELL : sweep.x < -CELL;
        if (gone) {
          sweep = null;
          if (sweeping) scheduleSweep();
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const elapsed = now - rp.start;
        while (rp.idx < rp.tiles.length && rp.tiles[rp.idx].at <= elapsed) {
          const t = rp.tiles[rp.idx];
          light(t.c, t.r, t.peak, RIPPLE_DECAY);
          rp.idx++;
        }
        if (rp.idx >= rp.tiles.length) ripples.splice(i, 1);
      }
      ctx.clearRect(0, 0, width, height);
      let fading = false;
      for (const [key, tile] of tiles) {
        if (key !== current) {
          tile.heat -= (dt / FADE_MS) * tile.decay;
          if (tile.heat <= 0) {
            tiles.delete(key);
            continue;
          }
          fading = true;
        }
        const a = tile.heat * tile.heat * (3 - 2 * tile.heat) * tile.peak;
        const x = (key % cols) * CELL;
        const y = Math.floor(key / cols) * CELL;
        const { r, g, b, fill, line } = tile.shade;
        ctx.fillStyle = `rgba(${r},${g},${b},${fill * a})`;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = `rgba(${r},${g},${b},${line * a})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
      // A held tile repaints identically, so the loop only needs to run while
      // something is fading, a ripple is still expanding, or a trail is sweeping.
      if (fading || ripples.length > 0 || sweep) {
        raf = requestAnimationFrame(draw);
      } else {
        raf = 0;
        last = 0;
      }
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const c = Math.floor((e.clientX - originX) / CELL);
      const r = Math.floor((e.clientY - originY) / CELL);
      const key = r * cols + c;
      if (key === current) return;
      current = key;
      light(c, r, 1, 1);
      wake();
    };

    const spawnRipple = (
      x: number,
      y: number,
      shape: RippleShape = rippleShape,
      range?: number,
    ) => {
      ripples.push({
        start: performance.now(),
        idx: 0,
        tiles: buildRipple(shape, Math.floor(x / CELL), Math.floor(y / CELL), range),
      });
      wake();
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      // Clicks on interactive elements act, they don't ripple.
      const target = e.target as Element | null;
      if (target?.closest?.('a, button, [role="button"], input, textarea, select, label')) return;
      spawnRipple(e.clientX - originX, e.clientY - originY);
    };

    const onRippleEvent = (e: Event) => {
      // Event coordinates are viewport-relative (e.g. a card's bounding rect),
      // so map them into the canvas's local space before rippling.
      const { x, y, shape, range } = (e as CustomEvent<TileRippleDetail>).detail;
      spawnRipple(x - originX, y - originY, shape, range);
    };

    const startSweep = () => {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      sweep = {
        dir,
        row: Math.floor(Math.random() * rows),
        x: dir === 1 ? -CELL : width + CELL,
      };
      wake();
    };

    function scheduleSweep() {
      const gap =
        SWEEP_GAP_MIN_MS + Math.random() * (SWEEP_GAP_MAX_MS - SWEEP_GAP_MIN_MS);
      sweepTimer = window.setTimeout(startSweep, gap);
    }

    const onSweepStart = () => {
      if (sweeping) return; // one-shot: ignore repeat signals
      sweeping = true;
      startSweep();
    };

    const leave = () => {
      current = -1;
      wake();
    };

    resize();
    // A ResizeObserver on the canvas catches window resizes and orientation
    // changes (the box is full-bleed) and re-derives geometry from the element
    // itself; scroll only shifts the viewport offset, so it just re-measures.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener(TILE_RIPPLE_EVENT, onRippleEvent);
    window.addEventListener(TILE_SWEEP_EVENT, onSweepStart);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(sweepTimer);
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener(TILE_RIPPLE_EVENT, onRippleEvent);
      window.removeEventListener(TILE_SWEEP_EVENT, onSweepStart);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [canvasRef, rippleShape]);
};
