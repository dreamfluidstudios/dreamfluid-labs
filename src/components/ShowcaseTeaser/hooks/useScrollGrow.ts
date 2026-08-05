import { useLayoutEffect, type RefObject } from "react";
import { registerScrollFrame } from "@/utils/scrollFrame";
import { resolveDeviceProfile } from "@/utils/deviceProfile";

// How far the panel grows: from GROW_FROM of its container's width at the
// fold, to full width once its top has scrolled up to GROW_UNTIL of the
// viewport height.
const GROW_FROM = 0.64;
const GROW_UNTIL = 0.25;
// Floor the panel used to get from `min-w-[320px]`; reproduced here because the
// scale is computed from the container rather than read off the layout.
const MIN_PX = 320;

// Drives the showcase panel's scroll-linked growth: measures where the panel
// sits in the viewport each scroll frame and eases it between the bounds above.
// Desktop only — touch (portrait or landscape) stays full-width 16:9 with no
// scroll-linked scale, so phones skip the per-frame measure/transform work.
// Reduced motion also stays full size.
//
// This scales with `transform`, not `width`. Writing width per scroll frame
// invalidated layout for the whole subtree every frame, and — because the panel
// is 16:9 — its height changed with it, so the document's total height moved
// while you were scrolling it. That is a bad thing to do to iOS momentum
// scroll, which is resolving against a scroll range that keeps shifting under
// it. `transform` is compositor-only: no layout, no reflow, fixed document
// height. Uniform scale is geometrically equivalent to the old width animation
// because the aspect-ratio box made height track width anyway.
//
// The trade: the panel now reserves its full-size box in layout from the start,
// so there is slightly more slack beneath it early in the transition. It is
// pinned at the top (transform-origin) and resolves identically at scale 1.
export const useScrollGrow = (ref: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Touch + reduced-motion: no grow — panel is already layout-full-width
    // with aspect-video, which is the mobile target in both orientations.
    if (
      resolveDeviceProfile().touch ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.style.transform = "none";
      return;
    }

    el.style.transformOrigin = "top center";
    el.style.willChange = "transform";

    let scale = 1;
    let written = -1;

    const measure = () => {
      const vh = window.innerHeight;
      // offsetWidth, not getBoundingClientRect().width: the rect is post-
      // transform, so reading width from it would feed our own scale back in.
      // offsetWidth is the layout width, which is what the old percentage
      // resolved against. rect.top is safe — transform-origin is the top edge,
      // so scaling never moves it.
      const containerW = Math.max(el.offsetWidth, 1);

      // 0 with the panel's top at the viewport bottom; 1 once it reaches
      // GROW_UNTIL of the viewport.
      let p = (vh - el.getBoundingClientRect().top) / (vh * (1 - GROW_UNTIL));
      p = Math.min(Math.max(p, 0), 1);
      p = p * p * (3.0 - 2.0 * p); // smoothstep easing

      // Floor the *result*, not the start: min-w-[320px] used to clamp the
      // computed width, so on narrow viewports the ramp still ran its full
      // curve and only the bottom of it got cut off.
      const floor = Math.min(MIN_PX / containerW, 1);
      const raw = GROW_FROM + (1 - GROW_FROM) * p;
      scale = Math.round(Math.min(Math.max(raw, floor), 1) * 1000) / 1000;
    };

    const apply = () => {
      if (scale === written) return;
      written = scale;
      el.style.transform = `scale(${scale})`;
    };

    return registerScrollFrame({ measure, apply });
  }, [ref]);
};
