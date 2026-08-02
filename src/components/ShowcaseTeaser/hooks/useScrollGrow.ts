import { useEffect, type RefObject } from "react";

// How far the panel grows: from GROW_FROM of its container's width at the
// fold, to full width once its top has scrolled up to GROW_UNTIL of the
// viewport height
const GROW_FROM = 0.64;
const GROW_UNTIL = 0.25;

// Drives the showcase panel's scroll-linked width: measures where the panel
// sits in the viewport each scroll frame and eases its width between the
// bounds above. One element, one rAF per scroll — no library needed. With
// reduced motion the panel just stays at full width.
export const useScrollGrow = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.width = "100%";
      return;
    }

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 with the panel's top at the viewport bottom; 1 once it reaches
      // GROW_UNTIL of the viewport. Width changes don't move rect.top, so
      // this never feeds back into itself.
      let p = (vh - rect.top) / (vh * (1 - GROW_UNTIL));
      p = Math.min(Math.max(p, 0), 1);
      p = p * p * (3.0 - 2.0 * p); // smoothstep easing
      el.style.width = `${(GROW_FROM + (1 - GROW_FROM) * p) * 100}%`;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref]);
};
