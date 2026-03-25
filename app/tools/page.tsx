import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tools · Dreamfluid Labs",
  description: "Explore tools from Dreamfluid Labs",
};

export default function ToolsPage() {
  return (
    <main className="fixed inset-0 z-0 overflow-y-auto overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 [background-size:20px_20px] [background-image:radial-gradient(#404040_1px,transparent_1px)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-df-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-40 -top-40 z-0 h-[600px] w-[600px] rounded-full bg-df-blue opacity-[0.12] blur-[160px] animate-glow-drift-blue"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 -right-32 z-0 h-[500px] w-[500px] rounded-full bg-df-violet opacity-[0.10] blur-[140px] animate-glow-drift-violet"
      />

      <Link
        href="/"
        aria-label="Back to home"
        className="fixed left-6 top-6 z-20 text-2xl font-medium leading-none text-df-white transition-opacity duration-300 hover:opacity-80"
      >
        ←
      </Link>

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-lg flex-col items-center gap-10 px-6 py-16 text-center">
        <h1 className="text-3xl font-[450] tracking-[0.06em] sm:text-4xl">
          Tools
        </h1>

        <p className="max-w-sm text-sm font-light tracking-wide text-df-white/40">
          Nothing here yet. Check back later.
        </p>
      </div>
    </main>
  );
}
