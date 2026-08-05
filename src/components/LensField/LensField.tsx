"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { classNames } from "@/utils/classNames";
import { useLensField } from "./hooks/useLensField";
import type { TileStateMap } from "@/components/TileField/hooks/useTileField";

// Elva-style corner lens over the hero backdrop: samples the TileField
// cell-state scoreboard, draws the grid bed in-shader, and bends both through
// subtle lens warps with a chromatic fringe (preset-tinted — see
// lensField.presets.ts, or
// ?lens=neutral|dispersion|secondary|brand|mono|rgb). Touch keeps the same
// arcs/bed and the same bed warp; only the chroma samples are skipped.
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
//   z-3  ShowcaseTeaser <section> — see below
//   z-10 hero copy, showcase panel — the lens is a backdrop, it goes behind them
// Raising this above 10 puts the grid bed and lit tiles on top of the headline.
//
// That "competes at the root" property is fragile, and anything this canvas
// overhangs has to defend it. A section that gets promoted to its own stacking
// context — by a fade dropping opacity below 1, or by carrying a compositable
// animation at all — stops exposing its children's z-index to the root and
// falls to its own level instead. ShowcaseTeaser hits exactly that and names
// z-3 to stay above this canvas; the reasoning is written up there.
//
// WebGL init takes a frame or two, so the canvas starts invisible and fades in
// once the first frame is painted — no pop-in.
//
// If WebGL is unavailable the canvas stays blank and onActiveChange never
// fires, so the underlying TileField DOM layers remain the visible fallback.

// The box: full hero width, ending exactly on the showcase card's bottom edge.
// Because the canvas scrolls with the page it has to be as tall as the arcs'
// whole document-space footprint — anything the ring reaches past the bottom
// edge is cut off (softened by the shader's edgeFade, but still cut).
//
// This used to be a flat h-[165%] of the hero, derived from the ring's own
// reach at LENS_SCROLL.expand = 1.4. The problem with any fixed percentage is
// that it scales off the wrong axis. The canvas follows hero *height*; the
// showcase card is aspect-video, so it follows viewport *width*. The two only
// agree at one aspect ratio. Measured against the card's bottom edge, 165%
// overshot by 466px at 390×844 and 421px at 768×1024, while landing within 9px
// at 1440×900 — i.e. it was tuned on a laptop and nowhere else.
//
// So derive it from the card instead of guessing a percentage:
//
//   canvas bottom = hero bottom - 13vh  (ShowcaseTeaser's -mt-[13vh] overlap)
//                 + card height          ((100vw - gutters) × 9/16)
//
// The three variants track ShowcaseTeaser's px-4 / sm:px-10 / lg:px-24 gutters
// (2rem / 5rem / 12rem total). `100%` is the hero's own height, so a hero that
// grows past 100vh still resolves correctly — only the 13vh overlap is keyed
// to the viewport, which is what ShowcaseTeaser actually uses.
//
// Two knowingly-accepted approximations: 100vw includes the scrollbar where
// the card's width does not (~6px of extra canvas on desktop), and on desktop
// useScrollGrow scales the panel from 0.64, so early in that transition the
// *visual* card bottom sits above the layout box this is pinned to. Touch has
// no grow at all, which is the case that motivated this.
//
// Retuning LENS_SCROLL.expand no longer means redoing this number — the box is
// now the constraint and expand has to live inside it. If expand is raised far
// enough that the ring wants more room than the card gives, edgeFade tapers it
// off just above the card rather than letting it sprawl underneath.
//
// These have to be literal class strings (Tailwind's JIT scans source text, so
// an interpolated value would never be generated) — concatenated literals are
// fine, each class name is whole within its own string. And they have to be
// classes rather than an inline style: OGL's Renderer constructor assigns
// inline style.width/height on the canvas it is handed, which would win over
// anything React put there. useLensField strips those inline values right
// after construction so these classes are what actually sizes the element.
const BOX =
  "absolute inset-x-0 top-0 w-full " +
  "h-[calc(100%-13vh+(100vw-2rem)*0.5625)] " +
  "sm:h-[calc(100%-13vh+(100vw-5rem)*0.5625)] " +
  "lg:h-[calc(100%-13vh+(100vw-12rem)*0.5625)]";

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
