"use client";

import { useRef } from "react";
import { CELL, useTileField } from "./hooks/useTileField";
import type { RippleShape } from "./utils/ripple";

export type { RippleShape };

// Interactive layer of the backdrop: a faint static grid bed (aligned to CELL)
// with a canvas painted on top that lights the tile under the cursor, trails a
// fading wake, ripples on click, and glides idle auto-trails on request. The
// grid lives here — not with the ambient gradients — because it is the unlit
// bed the canvas tiles light up, sharing the exact CELL size.
export const TileField = ({
  rippleShape = "round",
}: {
  rippleShape?: RippleShape;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useTileField(canvasRef, rippleShape);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.55] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]"
      />
    </>
  );
};
