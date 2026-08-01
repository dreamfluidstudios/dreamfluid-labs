// Grain disabled for now — the crisp high-contrast backdrop reads better without
// it. Restore this import + the <GrainOverlay /> below to bring it back.
// import { GrainOverlay } from "@/components/GrainOverlay/GrainOverlay";
import { TileField } from "@/components/TileField/TileField";

// The hero's backdrop. Currently the interactive tile field alone, over the page
// background; the ambient layer is gone pending its rework. Kept as one swappable
// unit — the whole backdrop can be replaced (or its layers reused elsewhere)
// without touching the hero's content. Fills the hero section behind the copy.
export const HeroBackdropSection = () => (
  <div className="pointer-events-none absolute inset-0 z-0">
    <TileField rippleShape="round" />
    {/* <GrainOverlay /> — disabled for now (crisper without grain) */}
  </div>
);
