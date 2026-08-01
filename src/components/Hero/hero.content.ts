import type { HeadlineWordContent } from "./components/Headline/Headline";

type HeroContent = {
  wordmark: string;
  headline: readonly HeadlineWordContent[];
  cta: { label: string; href: string };
};

export const heroContent = {
  wordmark: "Dreamfluid Labs",
  headline: [
    { text: "An", variant: "sans", element: { number: "25", label: "Dreamfluid" } },
    { text: "engine", variant: "pixel" },
    { text: "for", variant: "sans" },
    { text: "vision.", variant: "serif" },
  ],
  cta: { label: "Learn More", href: "/comingsoon" },
} as const satisfies HeroContent;
