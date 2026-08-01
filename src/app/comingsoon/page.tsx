import type { Metadata } from "next";
// Grain disabled for now — crisper without it. Restore this import + the
// <GrainOverlay /> below to bring it back.
// import { GrainOverlay } from "@/components/GrainOverlay/GrainOverlay";
import { Button } from "@/shared/Button/Button";
import { TileField } from "@/components/TileField/TileField";

export const metadata: Metadata = {
  title: "Coming soon · Dreamfluid Labs",
  description: "Dreamfluid Labs is under construction — tools are on the way.",
};

export default function ComingSoonPage() {
  return (
    <main className="fixed inset-0 z-0 overflow-hidden">
      <TileField rippleShape="round" />
      {/* <GrainOverlay /> — disabled for now (crisper without grain) */}

      <Button href="/" variant="ghost" className="fixed left-6 top-6 z-20">
        &larr; Back
      </Button>

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="whitespace-nowrap text-[clamp(1.25rem,4.5vw,3rem)] font-medium leading-tight tracking-[-0.03em] text-df-white">
          Site under construction
          <span aria-hidden="true" className="ml-[0.15em] text-df-silver">
            <span className="inline-block motion-safe:animate-loading-dot">.</span>
            <span
              className="inline-block motion-safe:animate-loading-dot"
              style={{ animationDelay: "250ms" }}
            >
              .
            </span>
            <span
              className="inline-block motion-safe:animate-loading-dot"
              style={{ animationDelay: "500ms" }}
            >
              .
            </span>
          </span>
        </h1>
      </div>
    </main>
  );
}
