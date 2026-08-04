"use client";

import { useRef, type RefObject } from "react";
import {
  CELL,
  useTileField,
  type TilePointerSpace,
  type TileStateMap,
} from "./hooks/useTileField";
import type { RippleShape } from "./utils/ripple";
import { classNames } from "@/utils/classNames";

export type { RippleShape, TileStateMap };

// Interactive layer of the backdrop: a faint static grid bed (aligned to CELL)
// with a canvas painted on top that lights the tile under the cursor, trails a
// fading wake, ripples on click, and glides idle auto-trails on request. The
// grid lives here — not with the ambient gradients — because it is the unlit
// bed the canvas tiles light up, sharing the exact CELL size.
//
// Hover trails, click ripples and idle auto-trails are all desktop-only, so on
// touch the field is driven purely by programmatic ripples (the hero's slam
// landing) and is otherwise static.
//
// When a WebGL lens presents this field, pass tileStateRef so the sim packs a
// tiny cell map instead of painting a full bitmap (Lens draws the bed in GL).
// DOM layers can still fade out; pointerSpace flips to "viewport" so hover
// stays locked to the fixed lens image. Standalone use (e.g. /comingsoon)
// omits tileStateRef and keeps the canvas path + default "element" space.
export const TileField = ({
  rippleShape = "round",
  canvasRef: externalCanvasRef,
  hidden = false,
  pointerSpaceRef,
  sourceDirtyRef,
  tileStateRef,
}: {
  rippleShape?: RippleShape;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
  hidden?: boolean;
  pointerSpaceRef?: RefObject<TilePointerSpace>;
  // Shared with Zoom (canvas path): set true whenever the bitmap changes.
  sourceDirtyRef?: RefObject<boolean>;
  // Shared with Lens: packed lit-cell scoreboard (skips canvas fillRect).
  tileStateRef?: RefObject<TileStateMap | null>;
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalCanvasRef ?? internalCanvasRef;
  useTileField(
    canvasRef,
    rippleShape,
    pointerSpaceRef,
    sourceDirtyRef,
    tileStateRef,
  );

  return (
    <>
      <div
        aria-hidden="true"
        className={classNames(
          "pointer-events-none absolute inset-0 z-0 opacity-[0.55] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]",
          hidden && "invisible",
        )}
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={classNames(
          "pointer-events-none absolute inset-0 z-0 h-full w-full [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]",
          hidden && "invisible",
        )}
      />
    </>
  );
};
