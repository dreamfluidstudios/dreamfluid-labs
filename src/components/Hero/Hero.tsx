"use client";

import { useRef } from "react";
import { Button } from "@/shared/Button/Button";
import { Wordmark } from "@/components/Wordmark/Wordmark";
import { useScrollFade } from "@/components/ScrollFade/hooks/useScrollFade";
import { Headline } from "./components/Headline/Headline";
import { HeroBackdropSection } from "./components/HeroBackdropSection/HeroBackdropSection";
import { IdleTrailsCue } from "./components/IdleTrailsCue";
import { heroContent } from "./hero.content";

// The Hero owns its signature backdrop. LensField is viewport-fixed (so the
// expanding ring can sit over later sections); copy fades out via scroll-fade
// as the section scrolls away. No overflow clip here — it would trap any
// non-portaled fixed layers once a transform lands on an ancestor.
export const Hero = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // Wordmark + headline + CTAs — lens oval is fitted to this box (not the
  // idle cue), so the arcs consistently surround the intro on any viewport.
  const focusRef = useRef<HTMLDivElement | null>(null);
  // Exit only — enter is the hero's own intro choreography. Dissolve as soon
  // as the copy begins to leave; the lens has its own shader exit fade.
  useScrollFade(contentRef, { enter: false, start: 0 });

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center justify-center"
    >
      <HeroBackdropSection heroRef={sectionRef} focusRef={focusRef} />
      <div
        ref={contentRef}
        className="scroll-fade relative z-10 flex flex-col items-center gap-6 px-6 text-center"
      >
        <div
          ref={focusRef}
          className="flex flex-col items-center gap-6"
        >
          <Wordmark className="opacity-0 animate-fade-in">{heroContent.wordmark}</Wordmark>
          <Headline className="opacity-0 animate-fade-in-delay-1" words={heroContent.headline} />
          <div className="opacity-0 animate-fade-in-delay-2 mt-4 flex flex-wrap items-center justify-center gap-4">
            <Button href={heroContent.cta.href}>
              {heroContent.cta.label} &rarr;
            </Button>
            <Button href={heroContent.secondaryCta.href} variant="glass">
              {heroContent.secondaryCta.label}
            </Button>
          </div>
        </div>
        <IdleTrailsCue />
      </div>
    </section>
  );
};
