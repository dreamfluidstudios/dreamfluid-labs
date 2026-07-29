import { useEffect, type RefObject } from "react";
import { emitTileRipple } from "@/components/TileField/utils/rippleEvents";

// Fraction of the slam animation at which the card touches down (the scale(1)
// keyframe) — the grid ripple must fire at the moment of impact, not at
// animation end, which is only reached after the squash/rebound settle.
const TOUCHDOWN_FRACTION = 0.7;
const SLAM_DURATION_MS = 650;
// The slam hits harder than a click, so its shockwave reaches farther across
// the tile field (click ripples use the field's default RIPPLE_RANGE).
const IMPACT_RANGE = 5;

// Spawns a tile-field ripple from the card's center when the slam entrance
// lands. Keyed off animationstart, so under prefers-reduced-motion (where the
// animation never runs) no ripple fires.
export const useSlamImpact = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) => {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    let timeout = 0;
    const onAnimationStart = (e: AnimationEvent) => {
      if (e.animationName !== "element-slam") return;
      timeout = window.setTimeout(() => {
        const rect = el.getBoundingClientRect();
        emitTileRipple(rect.left + rect.width / 2, rect.top + rect.height / 2, {
          range: IMPACT_RANGE,
        });
      }, TOUCHDOWN_FRACTION * SLAM_DURATION_MS);
    };

    el.addEventListener("animationstart", onAnimationStart);
    return () => {
      el.removeEventListener("animationstart", onAnimationStart);
      window.clearTimeout(timeout);
    };
  }, [ref, enabled]);
};
