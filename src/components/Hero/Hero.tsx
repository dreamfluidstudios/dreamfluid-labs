import { Button } from "@/shared/Button/Button";
import { Wordmark } from "@/components/Wordmark/Wordmark";
import { Headline } from "./components/Headline/Headline";
import { HeroBackdropSection } from "./components/HeroBackdropSection/HeroBackdropSection";
import { IdleTrailsCue } from "./components/IdleTrailsCue";
import { heroContent } from "./hero.content";

// The Hero owns its signature backdrop: HeroBackdropSection is scoped to this
// full-screen section (absolutely positioned within it) rather than living as a
// viewport-fixed site background, so it never bleeds behind later sections.
export const Hero = () => (
  <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
    <HeroBackdropSection />
    <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
      <Wordmark className="opacity-0 animate-fade-in">{heroContent.wordmark}</Wordmark>
      <Headline className="opacity-0 animate-fade-in-delay-1" words={heroContent.headline} />
      <Button
        href={heroContent.cta.href}
        className="opacity-0 animate-fade-in-delay-2 mt-4"
      >
        {heroContent.cta.label} &rarr;
      </Button>
      <IdleTrailsCue />
    </div>
  </section>
);
