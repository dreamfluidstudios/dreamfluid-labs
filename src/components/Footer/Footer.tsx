"use client";

import { useEffect, useRef, useState } from "react";
import { GrainOverlay } from "@/components/GrainOverlay/GrainOverlay";
import { ScrollFadeEdge } from "@/components/ScrollFade/ScrollFadeEdge";
import { useScrollFade } from "@/components/ScrollFade/hooks/useScrollFade";
import { classNames } from "@/utils/classNames";
import {
  CRT_PRESETS,
  DEFAULT_CRT_PRESET,
  resolveCrtPreset,
  type CrtPreset,
} from "./footer.presets";

const BRAND = "DREAMFLUID";
// Fast CRT shake on the wordmark — flip false for a locked mark.
const CRT_WORDMARK_MOTION = true;

// Retro-CRT treatment for the giant wordmark. Two
// stacked copies of the text:
//   1. Halo layer — transparent glyphs whose text-shadow carries the phosphor
//      glow. It sits unmasked behind everything so the bloom stays smooth, and
//      flickers like a tube losing sync.
//   2. Sharp layer — the readable white glyphs, sliced into horizontal bands
//      by a repeating scanline mask, with a 2px chromatic split.
//
// Color: brand / neutral / mono / rgb — flip DEFAULT_CRT_PRESET in
// footer.presets.ts, or ?crt=neutral|brand|mono|rgb.
// Wordmark shake: CRT_WORDMARK_MOTION above, or ?wordmark=off / ?wordmark=on.
//
// Balanced scroll-fade: blur-in from below, blur-out through the top.
// ScrollFadeEdge adds the frosted glass leading edge on arrival.
export const Footer = () => {
  const ref = useRef<HTMLElement | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);
  const [preset, setPreset] = useState<CrtPreset>(
    () => CRT_PRESETS[DEFAULT_CRT_PRESET],
  );
  const [wordmarkMotion, setWordmarkMotion] = useState(CRT_WORDMARK_MOTION);
  // True when the tagline wraps under the copyright — center both lines.
  const [metaStacked, setMetaStacked] = useState(false);
  // Enter earlier / stay dissolved longer so short viewports don't stack a
  // sharp CRT under a still-readable showcase.
  useScrollFade(ref, { start: 0.04 });

  useEffect(() => {
    setPreset(resolveCrtPreset());
    const q = new URLSearchParams(window.location.search).get("wordmark");
    if (q === "off" || q === "0" || q === "static") setWordmarkMotion(false);
    if (q === "on" || q === "1" || q === "motion") setWordmarkMotion(true);
  }, []);

  useEffect(() => {
    const el = metaRef.current;
    if (!el) return;

    const update = () => {
      const [left, right] = el.children;
      if (!(left instanceof HTMLElement) || !(right instanceof HTMLElement)) {
        return;
      }
      // Width check (not offsetTop): flex-col would otherwise keep us stacked
      // forever after the first narrow pass.
      const styles = getComputedStyle(el);
      const gap = parseFloat(styles.columnGap || styles.gap || "0") || 12;
      const fits =
        left.getBoundingClientRect().width +
          right.getBoundingClientRect().width +
          gap <=
        el.clientWidth + 1;
      setMetaStacked(!fits);
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  return (
    <footer
      ref={ref}
      className="scroll-fade relative overflow-hidden px-4 pt-40 sm:px-10 sm:pt-48 lg:px-24"
    >
      <ScrollFadeEdge className="h-[min(52vh,28rem)] via-df-pure-black/60 to-df-pure-black/90" />
      <div className="relative z-10">
        <p
          className={classNames(
            "relative select-none text-center font-pixel text-[clamp(3.25rem,12.5vw,11.5rem)] leading-none",
            wordmarkMotion && "motion-safe:animate-crt-shake",
          )}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 text-transparent motion-safe:animate-crt-flicker"
            style={{ textShadow: preset.haloShadow }}
          >
            {BRAND}
          </span>
          <span
            className="relative text-df-white [mask-image:repeating-linear-gradient(to_bottom,rgba(0,0,0,1)_0px,rgba(0,0,0,1)_2.5px,rgba(0,0,0,0.45)_2.5px,rgba(0,0,0,0.45)_4px)]"
            style={{ textShadow: preset.chromaShadow }}
          >
            {BRAND}
          </span>
          {/* Grain clipped to glyphs only — void stays absolute black. */}
          <GrainOverlay
            className="z-[2]"
            opacity={0.55}
            blend="soft-light"
            clipToText
            animated
          >
            {BRAND}
          </GrainOverlay>
        </p>
        <div
          ref={metaRef}
          className={classNames(
            "mt-20 flex border-t border-df-white/10 py-6 text-xs leading-none text-df-silver",
            metaStacked
              ? "flex-col items-center justify-center gap-2 text-center"
              : "flex-row flex-wrap items-center justify-between gap-3",
          )}
        >
          <span className="uppercase leading-none">
            &copy; 2026 Dreamfluid Creative Studios, LLC. All rights reserved.
          </span>
          <span className="uppercase leading-none tracking-[0.18em]">
            Where dreams take substance
          </span>
        </div>
      </div>
    </footer>
  );
};
