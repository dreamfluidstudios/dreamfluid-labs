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

// Hero WebGL pass: lens arcs (default) or zoom-blur peephole.
// Override with ?backdrop=lens|zoom.
//
// TODO(both-mode): Stacked lens+zoom is shelved — compositing still left a
// black outline / halo on the fringe. Ignore ?backdrop=both for now (falls
// back to lens). Likely next: additive / premultiplied fringe, or one pass.
type BackdropMode = "lens" | "zoom";
const DEFAULT_BACKDROP: BackdropMode = "lens";

const resolveBackdrop = (): BackdropMode => {
  if (typeof window === "undefined") return DEFAULT_BACKDROP;
  const q = new URLSearchParams(window.location.search).get("backdrop");
  // "both" intentionally ignored until stacked compositing is solid.
  return q === "zoom" || q === "lens" ? q : DEFAULT_BACKDROP;
};

// The hero's backdrop. TileField paints into a shared canvas inside the hero
// box; WebGL field(s) are portaled + viewport-fixed so they can sit over later
// sections. When WebGL comes up the DOM tiles crossfade out; the lens owns the
// bed via tileStateRef. Pointer space flips to "viewport" with the field so
// hover tracks the fixed image.
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
  const fieldActive = showZoom ? zoomActive : lensActive;

  useEffect(() => {
    setBackdrop(resolveBackdrop());
  }, []);

  useEffect(() => {
    pointerSpaceRef.current = fieldActive ? "viewport" : "element";
  }, [fieldActive]);

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
