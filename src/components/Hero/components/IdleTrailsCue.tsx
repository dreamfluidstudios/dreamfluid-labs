"use client";

import { useEffect } from "react";
import { emitTileSweepStart } from "@/components/TileField/utils/rippleEvents";
import { HERO_INTRO_MS } from "../hero.animations";

// A quiet beat after the entrance settles before the ambient trails begin, so
// the intro has room to breathe.
const HERO_TILE_SWEEP_DELAY_MS = 2200;

// Renders nothing: once the hero's entrance has fully played (plus a pause), it
// cues the ambient tile field to begin its idle left/right trails. Kept as a
// tiny client boundary so the Hero section itself stays a server component.
export const IdleTrailsCue = () => {
  useEffect(() => {
    const id = window.setTimeout(emitTileSweepStart, HERO_INTRO_MS + HERO_TILE_SWEEP_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  return null;
};
