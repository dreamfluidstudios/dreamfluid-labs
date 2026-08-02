"use client";

// Grain disabled for now — the crisp high-contrast backdrop reads better without
// it. Restore this import + the <GrainOverlay /> below to bring it back.
// import { GrainOverlay } from "@/components/GrainOverlay/GrainOverlay";
import { useEffect, useRef, useState, type RefObject } from "react";
import { classNames } from "@/utils/classNames";
import { TileField } from "@/components/TileField/TileField";
import type { TilePointerSpace } from "@/components/TileField/hooks/useTileField";
import { LensField } from "@/components/LensField/LensField";
import { ZoomBlurField } from "@/components/ZoomBlurField/ZoomBlurField";

// Hero WebGL pass: lens arcs, zoom-blur peephole, or both stacked
// (zoom underneath, lens arcs on top). Override with ?backdrop=lens|zoom|both.
//
// TODO(both-mode): Come back to stacked lens+zoom compositing.
// - Black outline / halo still rings the lens fringe when DEFAULT is "both"
//   (soft fringe over the zoom underlay; fringe-only overlay + bulge=1 helped
//   center shadows but didn’t kill the outline).
// - Earlier attempts: opaque underlay bed, arc cutouts, sharp-under-bulge mix,
//   luminance-gated ridge bed — each fixed one artifact and created another.
// - Likely next: additive / premultiplied fringe blend, or a single combined
//   pass so the two canvases don’t SRC_ALPHA over each other.
type BackdropMode = "lens" | "zoom" | "both";
const DEFAULT_BACKDROP: BackdropMode = "lens";

const resolveBackdrop = (): BackdropMode => {
  if (typeof window === "undefined") return DEFAULT_BACKDROP;
  const q = new URLSearchParams(window.location.search).get("backdrop");
  return q === "zoom" || q === "lens" || q === "both" ? q : DEFAULT_BACKDROP;
};

// The hero's backdrop. TileField paints into a shared canvas inside the hero
// box; WebGL field(s) are portaled + viewport-fixed so they can sit over later
// sections. When WebGL comes up the DOM tiles crossfade out. In "both" mode
// we wait until each pass is ready before hiding TileField. Pointer space
// flips to "viewport" with the field so hover tracks the fixed image.
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
  const [lensActive, setLensActive] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropMode>(DEFAULT_BACKDROP);

  const showLens = backdrop === "lens" || backdrop === "both";
  const showZoom = backdrop === "zoom" || backdrop === "both";
  const fieldActive =
    backdrop === "both"
      ? lensActive && zoomActive
      : backdrop === "zoom"
        ? zoomActive
        : lensActive;

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
        />
        {/* <GrainOverlay /> — disabled for now (crisper without grain) */}
      </div>
      {showZoom && (
        <ZoomBlurField
          source={tileCanvasRef}
          heroRef={heroRef}
          focusRef={focusRef}
          onActiveChange={setZoomActive}
          // Full tile bed (no peephole clip) so outer cells stay visible
          // under arcs-only lens.
          underlay={backdrop === "both"}
        />
      )}
      {showLens && (
        <LensField
          source={tileCanvasRef}
          heroRef={heroRef}
          focusRef={focusRef}
          onActiveChange={setLensActive}
          // Arcs-only so zoom's outer blur isn't buried under a full scene fill.
          overlay={backdrop === "both"}
        />
      )}
    </>
  );
};
