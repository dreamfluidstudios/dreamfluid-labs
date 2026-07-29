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

// Neutral shades only — brightness varies per tile, hue never does.
// Dimmer greys carry more alpha so every shade reads against df-black.
const SHADES = [
  { r: 250, g: 250, b: 250, fill: 0.05, line: 0.15 },
  { r: 212, g: 215, b: 219, fill: 0.07, line: 0.13 },
  { r: 170, g: 173, b: 178, fill: 0.09, line: 0.115 },
  { r: 108, g: 110, b: 113, fill: 0.12, line: 0.1 },
];

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
    // Idle auto-trail: an in-flight sweep (a virtual cursor at pixel x on `row`
    // moving in `dir`), plus the pending timer for the next one. `sweeping`
    // gates the whole loop until the hero signals its entrance is done.
    let sweep: { dir: 1 | -1; row: number; x: number } | null = null;
    let sweepTimer = 0;
    let sweeping = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(window.innerWidth / CELL) + 1;
      rows = Math.ceil(window.innerHeight / CELL) + 1;
      tiles.clear();
      ripples.length = 0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
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
          sweep.dir === 1 ? sweep.x > window.innerWidth + CELL : sweep.x < -CELL;
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
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
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
      const key =
        Math.floor(e.clientY / CELL) * cols + Math.floor(e.clientX / CELL);
      if (key === current) return;
      current = key;
      light(Math.floor(e.clientX / CELL), Math.floor(e.clientY / CELL), 1, 1);
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
      spawnRipple(e.clientX, e.clientY);
    };

    const onRippleEvent = (e: Event) => {
      const { x, y, shape, range } = (e as CustomEvent<TileRippleDetail>).detail;
      spawnRipple(x, y, shape, range);
    };

    const startSweep = () => {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      sweep = {
        dir,
        row: Math.floor(Math.random() * rows),
        x: dir === 1 ? -CELL : window.innerWidth + CELL,
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
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener(TILE_RIPPLE_EVENT, onRippleEvent);
    window.addEventListener(TILE_SWEEP_EVENT, onSweepStart);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(sweepTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener(TILE_RIPPLE_EVENT, onRippleEvent);
      window.removeEventListener(TILE_SWEEP_EVENT, onSweepStart);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [canvasRef, rippleShape]);
};
