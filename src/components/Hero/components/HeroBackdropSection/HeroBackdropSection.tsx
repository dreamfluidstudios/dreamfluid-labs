"use client";

// Grain disabled for now — the crisp high-contrast backdrop reads better without
// it. Restore this import + the <GrainOverlay /> below to bring it back.
// import { GrainOverlay } from "@/components/GrainOverlay/GrainOverlay";
import { useEffect, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { classNames } from "@/utils/classNames";
import { TileField } from "@/components/TileField/TileField";
import type {
  TilePointerSpace,
  TileStateMap,
} from "@/components/TileField/hooks/useTileField";
import { LensField } from "@/components/LensField/LensField";

// Zoom stays out of the default lens chunk — only fetched for ?backdrop=zoom.
const ZoomBlurField = dynamic(
  () =>
    import("@/components/ZoomBlurField/ZoomBlurField").then((m) => ({
      default: m.ZoomBlurField,
    })),
  { ssr: false },
);

// Hero WebGL pass: lens arcs, zoom-blur peephole, or none at all.
// Override with ?backdrop=lens|zoom|tiles.
//
// "tiles" runs no WebGL pass whatsoever — TileField keeps its own DOM layers
// and paints its own bitmap, which is what the backdrop was before any of this
// existed. It is here as a perf bisect: it removes the lens canvas from the
// page entirely, so if scrolling is still rough with ?backdrop=tiles then the
// lens is not what is costing frames and the search should move elsewhere.
// Note the fallback stays cheap on touch — hover trails are desktop-only.
// Idle sweeps still run; after each pass the tile loop parks until the next.
//
// TODO(both-mode): Stacked lens+zoom is shelved — compositing still left a
// black outline / halo on the fringe. Ignore ?backdrop=both for now (falls
// back to the default). Likely next: additive / premultiplied fringe, or one
// pass.
type BackdropMode = "lens" | "zoom" | "tiles";
// TEMP: lens off for mobile/perf bisect. Flip back to "lens" when done.
const DEFAULT_BACKDROP: BackdropMode = "tiles";

const resolveBackdrop = (): BackdropMode => {
  if (typeof window === "undefined") return DEFAULT_BACKDROP;
  const q = new URLSearchParams(window.location.search).get("backdrop");
  // "both" intentionally ignored until stacked compositing is solid.
  return q === "zoom" || q === "lens" || q === "tiles" ? q : DEFAULT_BACKDROP;
};

// The hero's backdrop. TileField paints into a shared canvas inside the hero
// box; when WebGL comes up the DOM tiles crossfade out and the field owns the
// bed.
//
// LensField is a sibling in this same box — absolutely positioned, in the
// scroll flow — so its bed lands exactly on TileField's grid and its arcs stay
// compositor-locked to the copy while scrolling (see LensField.tsx). Because it
// shares the hero's coordinate space, pointer mapping stays in "element" space.
// ZoomBlurField is the exception: it is still viewport-fixed and samples the
// bitmap as a fullscreen texture, so it needs "viewport" pointer space.
export const HeroBackdropSection = ({
  heroRef,
  focusRef,
}: {
  heroRef: RefObject<HTMLElement | null>;
  // Intro copy + CTAs — lens oval / zoom focus is fitted to this box.
  focusRef: RefObject<HTMLElement | null>;
}) => {
  const tileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerSpaceRef = useRef<TilePointerSpace>("element");
  // Zoom still samples the canvas bitmap; dirty-flagged uploads.
  const sourceDirtyRef = useRef(true);
  // Lens samples this packed cell map instead of the full canvas.
  const tileStateRef = useRef<TileStateMap | null>(null);
  const [lensActive, setLensActive] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropMode>(DEFAULT_BACKDROP);

  const showLens = backdrop === "lens";
  const showZoom = backdrop === "zoom";
  // Only a WebGL pass that is actually mounted can claim the backdrop. Stated
  // explicitly rather than falling through to lensActive, so "tiles" cannot be
  // left invisible by a stale active flag.
  const fieldActive = showZoom ? zoomActive : showLens ? lensActive : false;

  useEffect(() => {
    setBackdrop(resolveBackdrop());
  }, []);

  useEffect(() => {
    pointerSpaceRef.current = showZoom && zoomActive ? "viewport" : "element";
  }, [showZoom, zoomActive]);

  return (
    <>
      <div
        className={classNames(
          "pointer-events-none absolute inset-0 z-0 motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out",
          fieldActive ? "opacity-0" : "opacity-100",
        )}
      >
        <TileField
          rippleShape="round"
          canvasRef={tileCanvasRef}
          pointerSpaceRef={pointerSpaceRef}
          sourceDirtyRef={showZoom ? sourceDirtyRef : undefined}
          // Lens path: pack cells, skip canvas paint. Zoom keeps the bitmap.
          tileStateRef={showLens ? tileStateRef : undefined}
        />
        {/* <GrainOverlay /> — disabled for now (crisper without grain) */}
      </div>
      {showZoom && (
        <ZoomBlurField
          source={tileCanvasRef}
          sourceDirtyRef={sourceDirtyRef}
          heroRef={heroRef}
          focusRef={focusRef}
          onActiveChange={setZoomActive}
        />
      )}
      {showLens && (
        <LensField
          source={tileCanvasRef}
          tileStateRef={tileStateRef}
          heroRef={heroRef}
          focusRef={focusRef}
          onActiveChange={setLensActive}
        />
      )}
    </>
  );
};
