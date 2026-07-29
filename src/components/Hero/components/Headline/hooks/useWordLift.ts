import { useEffect, type RefObject } from "react";
import {
  isSettled,
  pushImpulse,
  REST_ANGLE_DEG,
  springStep,
  supportTarget,
  type SpringState,
} from "../utils/wordLiftPhysics";

// The CSS entrance (fade + sign-tilt keyframes) must finish before JS takes
// over the transform; this is delay + duration + margin, used as a fallback in
// case animationend never fires (e.g. remount after the animation completed).
const ENTRANCE_FALLBACK_MS = 2900;

// Lets the cursor act as a lifter on the settled sign: supporting it from
// below tilts it back toward horizontal, letting go drops it with a bounce.
export const useWordLift = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) => {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active = false;
    let armed = true;
    let supported = false;
    let target = REST_ANGLE_DEG;
    let state: SpringState = { angle: REST_ANGLE_DEG, velocity: 0 };
    let raf = 0;
    let last = 0;

    const apply = () => {
      el.style.transform = `rotate(${-state.angle}deg) translateY(0.02em)`;
    };

    const frame = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      state = springStep(state, target, dt, supported ? "supported" : "released");
      if (isSettled(state, target)) {
        state = { angle: target, velocity: 0 };
        apply();
        raf = 0;
        last = 0;
        return;
      }
      apply();
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf && !isSettled(state, target)) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    // The forwards-filling CSS animation outranks inline styles, so it has to
    // be cancelled outright before the spring can own the transform.
    const takeOver = () => {
      if (active) return;
      active = true;
      el.style.animation = "none";
      state = { angle: REST_ANGLE_DEG, velocity: 0 };
      apply();
    };

    const onAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName === "word-tilt") takeOver();
    };
    const fallback = window.setTimeout(takeOver, ENTRANCE_FALLBACK_MS);

    // Un-rotates the live bounding box using the current sim angle: the
    // top-right hinge corner stays fixed under rotation, so the layout box is
    // recoverable exactly (bounding right overshoots it by height·sin θ).
    const layoutRect = () => {
      const b = el.getBoundingClientRect();
      const rad = (state.angle * Math.PI) / 180;
      const right = b.right - el.offsetHeight * Math.sin(rad);
      return {
        left: right - el.offsetWidth,
        right,
        top: b.top,
        bottom: b.top + el.offsetHeight,
      };
    };

    const move = (e: PointerEvent) => {
      if (!active || e.pointerType !== "mouse") return;
      const result = supportTarget(layoutRect(), e.clientX, e.clientY, armed);
      armed = result.armed;
      supported = result.target !== null;
      target = supported ? result.target! : REST_ANGLE_DEG;
      wake();
    };

    const release = () => {
      if (!active) return;
      supported = false;
      target = REST_ANGLE_DEG;
      armed = true;
      wake();
    };

    // A click just below the word shoves it upward — a discrete velocity
    // impulse into whatever the spring is doing. It applies whether the word is
    // hanging or being held: the released spring lets the jolt bounce, while the
    // stiff supported spring mostly absorbs it (a firm hold barely budges).
    const push = (e: PointerEvent) => {
      if (!active || e.pointerType !== "mouse" || e.button !== 0) return;
      const strength = pushImpulse(layoutRect(), e.clientX, e.clientY);
      if (strength <= 0) return;
      state = { angle: state.angle, velocity: state.velocity - strength };
      wake();
    };

    el.addEventListener("animationend", onAnimationEnd);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", push, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    return () => {
      window.clearTimeout(fallback);
      el.removeEventListener("animationend", onAnimationEnd);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", push);
      document.documentElement.removeEventListener("pointerleave", release);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);
};
