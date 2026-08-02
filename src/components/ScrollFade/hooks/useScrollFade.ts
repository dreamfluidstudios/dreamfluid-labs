import { useLayoutEffect, type RefObject } from "react";

type ScrollFadeOptions = {
  // Blur/dissolve as the block leaves the top of the viewport.
  exit?: boolean;
  // Blur/dissolve while the block is still rising in from below — mirrored
  // span to exit so the two feel balanced. Skip for blocks already teased
  // on-screen (e.g. the showcase peek in the hero).
  enter?: boolean;
  // Fraction of the element's height that may cross the horizon before the
  // dissolve begins (exit) / after which it finishes (enter). Lower = fade
  // starts earlier and stays visible longer in the viewport. Same value
  // keeps both directions symmetric.
  start?: number;
};

const ease = (p: number) => p * p * (3.0 - 2.0 * p);

// Drives a balanced scroll dissolve: blur-in from below, blur-out through the
// top. Writes --enter-fade / --exit-fade (and --scroll-fade = max of both)
// for the .scroll-fade CSS hook. data-fading toggles the filter so a resting
// blur(0) never flattens stacking against the fixed lens.
export const useScrollFade = (
  ref: RefObject<HTMLElement | null>,
  // Default start is low so enter/exit dissolve while a large slice of the
  // section is still on screen (pairs with the deep ScrollFadeEdge band).
  { exit = true, enter = true, start = 0.12 }: ScrollFadeOptions = {},
) => {
  // Layout effect so the first paint already has the correct enter/exit
  // values — otherwise a below-the-fold footer flashes sharp for a frame.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--enter-fade", "0");
      el.style.setProperty("--exit-fade", "0");
      el.style.setProperty("--scroll-fade", "0");
      el.dataset.fading = "false";
      return;
    }

    let raf = 0;
    const span = Math.max(1 - start, 0.15);

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const h = Math.max(rect.height, 1);
      const vh = window.innerHeight;

      let exitP = 0;
      if (exit) {
        exitP = (-rect.top / h - start) / span;
        exitP = ease(Math.min(Math.max(exitP, 0), 1));
      }

      let enterP = 0;
      if (enter) {
        // Mirror of exit against the bottom edge: 1 when the top sits at the
        // viewport bottom, 0 once the same span has risen into view.
        enterP = (rect.top - (vh - h * span)) / (h * span);
        enterP = ease(Math.min(Math.max(enterP, 0), 1));
      }

      const fade = Math.max(enterP, exitP);
      el.style.setProperty("--enter-fade", enterP.toFixed(4));
      el.style.setProperty("--exit-fade", exitP.toFixed(4));
      el.style.setProperty("--scroll-fade", fade.toFixed(4));
      el.dataset.fading = fade > 0.001 ? "true" : "false";
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
  }, [ref, exit, enter, start]);
};
