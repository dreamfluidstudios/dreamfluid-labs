"use client";

import { useRef } from "react";
import { ScrollFadeEdge } from "@/components/ScrollFade/ScrollFadeEdge";
import { useScrollFade } from "@/components/ScrollFade/hooks/useScrollFade";
import { useScrollGrow } from "./hooks/useScrollGrow";

// Product showcase frame — 16:9 panel with external top light. Currently wired
// to a YouTube test embed (muted autoplay; browsers block unmuted autoplay).
// Swap SHOWCASE_YOUTUBE_ID / clear it to go back to the blank placeholder.
//
// The section pulls itself up over the hero's bottom edge so the panel peeks
// above the fold, then scrolling reveals it while useScrollGrow widens it
// from a narrow inset to full width
// No blur-in (already teased in the hero); blur-out as the footer takes over.

const SHOWCASE_YOUTUBE_ID = "";

export const ShowcaseTeaser = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useScrollGrow(panelRef);
  // Exit early — on short viewports the CRT footer arrives while the panel
  // is still sharp; a near-zero start dissolves the showcase sooner.
  useScrollFade(sectionRef, { enter: false, start: 0 });

  const embedSrc = SHOWCASE_YOUTUBE_ID
    ? `https://www.youtube-nocookie.com/embed/${SHOWCASE_YOUTUBE_ID}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${SHOWCASE_YOUTUBE_ID}`
    : null;

  return (
    <section
      ref={sectionRef}
      className="scroll-fade relative -mt-[13vh] px-4 pb-36 sm:px-10 sm:pb-44 lg:px-24"
    >
      <ScrollFadeEdge className="h-[min(48vh,26rem)] via-df-pure-black/55 to-df-pure-black/85" />
      {/* Outer shell carries external glow (overflow would clip it).
          z-10 so the fixed lens can still paint the transparent gutters. */}
      <div
        ref={panelRef}
        className="opacity-0 animate-fade-in-delay-3 relative z-10 mx-auto w-[64%] min-w-[320px] rounded-2xl shadow-[0_0_20px_rgba(250,250,250,0.05),0_0_48px_rgba(250,250,250,0.025),0_18px_40px_rgba(0,0,0,0.55)]"
      >
        {/* External top light — full edge span, still hotter toward center. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 -translate-y-[60%]"
        >
          <div className="absolute inset-x-0 top-1/2 h-20 -translate-y-1/2 bg-[radial-gradient(ellipse_100%_90%_at_50%_50%,rgba(250,250,250,0.32)_0%,rgba(250,250,250,0.1)_42%,transparent_72%)] blur-3xl" />
          <div className="absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 bg-[radial-gradient(ellipse_100%_80%_at_50%_50%,rgba(255,255,255,0.55)_0%,rgba(250,250,250,0.22)_40%,rgba(250,250,250,0.06)_68%,transparent_85%)] blur-md" />
        </div>
        {/* Height follows width at 16:9 so a future video fits the frame. */}
        <div className="relative z-[1] aspect-video w-full overflow-hidden rounded-2xl bg-df-obsidian/80 shadow-[inset_0_18px_36px_-12px_rgba(0,0,0,0.85)]">
          {embedSrc ? (
            <iframe
              title="Showcase teaser"
              src={embedSrc}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.25)_48%,transparent_75%)]"
              />
              <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-df-silver">
                PRODUCT SHOWCASE
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
