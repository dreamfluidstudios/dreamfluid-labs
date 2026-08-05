"use client";

import { useRef } from "react";
import { ScrollFadeEdge } from "@/components/ScrollFade/ScrollFadeEdge";
import { useScrollGrow } from "./hooks/useScrollGrow";

// Product showcase frame — 16:9 panel with external top light. Currently wired
// to a YouTube test embed (muted autoplay; browsers block unmuted autoplay).
// Swap SHOWCASE_YOUTUBE_ID / clear it to go back to the blank placeholder.
//
// The section pulls itself up over the hero's bottom edge so the panel peeks
// above the fold. On desktop, scrolling reveals it while useScrollGrow scales
// it up from a narrow inset to full size; on touch it stays full-width 16:9
// in both orientations (no scroll resize).
//
// NO SCROLL FADE — deliberate, unlike the hero and footer. This panel holds
// playing video, and dissolving a playing video on the way out reads as a
// glitch rather than as a transition: the eye tracks moving content, so it
// follows the thing being faded instead of letting go of it. The reel stays at
// full opacity for its whole pass. ScrollFadeEdge still frosts the *incoming*
// boundary over the hero — that is about the seam between sections, not about
// dissolving this one's content.
//
// This also takes the section off the scroll-linked path entirely: no fade
// means no per-frame work and no compositor promotion (see the z-index note
// below, which is what a fade here used to break).

const SHOWCASE_YOUTUBE_ID = "";

export const ShowcaseTeaser = () => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useScrollGrow(panelRef);

  const embedSrc = SHOWCASE_YOUTUBE_ID
    ? `https://www.youtube-nocookie.com/embed/${SHOWCASE_YOUTUBE_ID}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${SHOWCASE_YOUTUBE_ID}`
    : null;

  // The z-[3] below is load-bearing, and it is about stacking contexts rather
  // than depth. The lens canvas sits at z-2 and overhangs the hero into this
  // section. The panel's z-10 beats it only because nothing between them makes
  // a stacking context, so every z-index competes at the document root (see the
  // z-order map in LensField.tsx) — an emergent property, not a stated one.
  //
  // Anything that promotes this section collapses it: the panel's z-10 gets
  // trapped inside and the section itself drops to z-auto, under the canvas,
  // which paints the backdrop's grid lines straight across the product card.
  // A fade here did exactly that (opacity < 1 promotes), and a CSS scroll
  // timeline did it permanently rather than only mid-fade.
  //
  // The fade is gone now, so nothing is promoting this today. Keeping z-[3]
  // anyway states the requirement instead of relying on the emergent version:
  // it holds whether or not something promotes the section later, and it is
  // what stops the ring bleeding through the panel's semi-transparent
  // background when there is no video filling it. Cost measured at 1/255 max
  // channel difference on touch.
  //
  // The Footer has the same shape but needs no equivalent — the canvas box
  // stops at this card's bottom edge and never reaches it.
  return (
    <section
      className="relative z-[3] -mt-[13vh] px-4 pb-36 sm:px-10 sm:pb-44 lg:px-24"
    >
      <ScrollFadeEdge className="h-[min(48vh,26rem)] via-df-pure-black/55 to-df-pure-black/85" />
      {/* Two nested nodes because two different things want `transform` here.
          The outer one is useScrollGrow's: it scales the panel up as you scroll
          in (was an animated `width`, which relayed out the subtree every
          frame and moved the document height while you scrolled). The inner one
          runs the fade-in entrance — and `fade-in` is a `forwards` animation on
          transform, so a filled animation would outrank any inline transform on
          the same element and pin the scale at 1. Keep them on separate nodes.

          z-10 keeps the panel above the lens canvas (z-2), whose overhang
          reaches into this section — the ring paints through the gutters beside
          the panel, not across it. */}
      <div ref={panelRef} className="relative z-10 mx-auto w-full">
        <div className="opacity-0 animate-fade-in-delay-3 relative rounded-2xl shadow-[0_0_20px_rgba(250,250,250,0.05),0_0_48px_rgba(250,250,250,0.025),0_18px_40px_rgba(0,0,0,0.55)]">
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
      </div>
    </section>
  );
};
