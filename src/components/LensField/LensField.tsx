"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { classNames } from "@/utils/classNames";
import { useLensField } from "./hooks/useLensField";
import type { TileStateMap } from "@/components/TileField/hooks/useTileField";

// Elva-style corner lens over the hero backdrop. Desktop: samples the
// TileField cell-state scoreboard, draws the grid bed in-shader, warps both
// with a chromatic fringe. Touch: arcs-only overlay — DOM TileField keeps the
// bed; this pass paints the fringe only (preset via ?lens=… / ?blend=…).
//
// Portaled to document.body and fixed to the viewport so the expanding ring
// can composite over later sections without being clipped by the hero's box.
// Scroll progress tracks heroRef; arc radii track focusRef (intro copy oval).
// Empty areas are transparent — see the shader alpha path.
//
// WebGL init takes a frame or two, so the canvas starts invisible and fades in
// once the first frame is painted — no pop-in. Eager mount + soft reveal
// (ZoomBlurField is the lazy-loaded backdrop alternative).
//
// If WebGL is unavailable the canvas stays blank and onActiveChange never
// fires, so the underlying TileField DOM layers remain the visible fallback.
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
  // Hero <section> used for scroll-exit progress (rotate / expand / dissolve).
  heroRef: RefObject<HTMLElement | null>;
  // Intro block (wordmark + headline + CTAs) the content oval is fitted to.
  focusRef: RefObject<HTMLElement | null>;
  onActiveChange?: (active: boolean) => void;
  // Arcs-only composite for stacking over ZoomBlurField.
  overlay?: boolean;
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // LensCanvas mounts only after the portal target exists, so useLensField's
  // effect sees a live canvas on its first run (avoids a stale early bail).
  return createPortal(
    <LensCanvas
      source={source}
      tileStateRef={tileStateRef}
      heroRef={heroRef}
      focusRef={focusRef}
      onActiveChange={onActiveChange}
      overlay={overlay}
    />,
    document.body,
  );
};

const LensCanvas = ({
  source,
  tileStateRef,
  heroRef,
  focusRef,
  onActiveChange,
  overlay,
}: {
  source: RefObject<HTMLCanvasElement | null>;
  tileStateRef?: RefObject<TileStateMap | null>;
  heroRef: RefObject<HTMLElement | null>;
  focusRef: RefObject<HTMLElement | null>;
  onActiveChange?: (active: boolean) => void;
  overlay: boolean;
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
        "pointer-events-none fixed inset-0 z-[2] h-full w-full",
        visible ? "opacity-100" : "opacity-0",
        !reduced && "transition-opacity duration-700 ease-out",
      )}
    />
  );
};
