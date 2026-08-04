"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { classNames } from "@/utils/classNames";
import { useLensField } from "./hooks/useLensField";
import type { TileStateMap } from "@/components/TileField/hooks/useTileField";

// Elva-style corner lens over the hero backdrop: samples the TileField
// cell-state scoreboard, draws the grid bed in-shader, and bends both through
// subtle lens warps with a chromatic fringe (preset-tinted — see
// lensField.presets.ts, or ?lens=neutral|brand|mono|rgb). Touch keeps the same
// arcs/bed, but skips warp + chroma under the bands.
//
// POSITIONING — this is load-bearing, see the header in useLensField.ts.
// The canvas sits *in the hero's scroll flow* (absolute, not fixed, not
// portaled). That hands the arc-to-headline alignment to the compositor, which
// is the only way it stays locked during iOS momentum scroll. It used to be
// portaled to body and viewport-fixed, which forced every frame to re-derive
// its position from window.scrollY on the main thread — the source of the
// lag/stutter on phones.
//
// It still needs to reach the sections below (the ring expands past the hero as
// you scroll out), which the BOX overhang gives it.
//
// z-2 is exact, not approximate. Neither <main> nor the hero <section> creates
// a stacking context (position: relative with z-index: auto does not), so every
// z-index on the page competes at the root, and this canvas has to land in a
// one-value gap:
//   z-0  TileField's DOM bed      — the lens replaces it, so it must be under
//   z-1  ScrollFadeEdge frost     — the ring reads through it, so it must be over
//   z-2  THIS CANVAS
//   z-10 hero copy, showcase panel — the lens is a backdrop, it goes behind them
// Raising this above 10 puts the grid bed and lit tiles on top of the headline.
//
// WebGL init takes a frame or two, so the canvas starts invisible and fades in
// once the first frame is painted — no pop-in.
//
// If WebGL is unavailable the canvas stays blank and onActiveChange never
// fires, so the underlying TileField DOM layers remain the visible fallback.

// The box: full hero width, 165% of hero height. Because the canvas scrolls
// with the page, it has to be as tall as the arcs' whole document-space
// footprint — anything the ring reaches past the bottom edge gets cut off with
// a hard horizontal line. Where 165% comes from, in hero-height units:
//
//   focus centre sits at          ~0.50   (copy is vertically centred)
//   ring + band reach             ~0.46   at rest (radius + ~2.5 gaussian σ)
//   × expand at the last visible frame  × 2.30   (1 + 1.4·uScroll, uScroll≈0.93,
//                                                 where LENS_SCROLL's exit fade
//                                                 has taken it under ~2%)
//   → 0.50 + 0.46 × 2.30         ≈ 1.56, rounded up for margin
//
// Percent of the hero rather than vh on purpose: arc size is scaled by uUnit,
// which is the hero's height, so the footprint tracks the hero and not the
// viewport. Retuning LENS_SCROLL.expand or LENS_FOCUS radii means redoing this
// number — the shader's bottom-edge fade keeps that from being a hard seam,
// but it cannot conjure back a ring that has run out of canvas.
//
// This has to be a literal class string (Tailwind's JIT scans source text, so
// an interpolated value would never be generated), and it has to be a class
// rather than an inline style: OGL's Renderer constructor assigns inline
// style.width/height on the canvas it is handed, which would win over anything
// React put there. useLensField strips those inline values right after
// construction so these classes are what actually sizes the element.
const BOX = "absolute inset-x-0 top-0 w-full h-[165%]";

export const LensField = ({
  source,
  tileStateRef,
  heroRef,
  focusRef,
  onActiveChange,
  overlay = false,
}: {
  // TileField canvas element — used for CSS-box sizing (uMapSize), not pixels.
  source: RefObject<HTMLCanvasElement | null>;
  // Packed lit-cell scoreboard from TileField (cols×rows RGBA8).
  tileStateRef?: RefObject<TileStateMap | null>;
  // Hero <section> used for scroll-exit progress and the ring's unit scale.
  heroRef: RefObject<HTMLElement | null>;
  // Intro block (wordmark + headline + CTAs) the content oval is fitted to.
  focusRef: RefObject<HTMLElement | null>;
  onActiveChange?: (active: boolean) => void;
  // Arcs-only composite for stacking over ZoomBlurField.
  overlay?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Stable callback identity — useLensField re-inits WebGL when this changes,
  // so we must not pass a fresh closure every render.
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  const handleActiveRef = useRef((active: boolean) => {
    onActiveChangeRef.current?.(active);
    if (!active) {
      setVisible(false);
      return;
    }
    // Wait two animation frames so the first WebGL clear/draw lands before
    // we start the fade — otherwise you'd glimpse an empty buffer.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  });

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useLensField(
    canvasRef,
    source,
    heroRef,
    focusRef,
    handleActiveRef.current,
    overlay,
    tileStateRef,
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={classNames(
        "pointer-events-none z-[2]",
        BOX,
        visible ? "opacity-100" : "opacity-0",
        !reduced && "transition-opacity duration-700 ease-out",
      )}
    />
  );
};
