import { useLayoutEffect, type RefObject } from "react";
import { registerScrollFrame } from "@/utils/scrollFrame";

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
// top. Writes --scroll-fade for the .scroll-fade CSS hook, and toggles
// data-fading so a resting blur(0) never costs a filter pass. Touch drops the
// blur entirely and rides opacity alone — see globals.css.
//
// Reads and writes go through the shared scroll frame so this never forces a
// layout against the other scroll-linked effects, and the write is skipped
// unless the quantised value actually moved: at three decimals the opacity
// step is already below what a display can show, so anything finer is a style
// recalc that changes nothing.
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
      el.style.setProperty("--scroll-fade", "0");
      el.dataset.fading = "false";
      return;
    }

    const span = Math.max(1 - start, 0.15);
    let fade = 0;
    let written = -1;

    const measure = () => {
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

      fade = Math.round(Math.max(enterP, exitP) * 1000) / 1000;
    };

    const apply = () => {
      if (fade === written) return;
      written = fade;
      el.style.setProperty("--scroll-fade", String(fade));
      const fading = fade > 0.001 ? "true" : "false";
      if (el.dataset.fading !== fading) el.dataset.fading = fading;
    };

    return registerScrollFrame({ measure, apply });
  }, [ref, exit, enter, start]);
};
