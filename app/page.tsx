import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Dot grid texture (Aceternity-style) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 [background-size:20px_20px] [background-image:radial-gradient(#404040_1px,transparent_1px)]"
      />
      {/* Radial fade mask — dots fade out toward edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-df-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
      />

      {/* Ambient glow — blue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-df-blue opacity-[0.12] blur-[160px] animate-glow-drift-blue"
      />

      {/* Ambient glow — violet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-df-violet opacity-[0.10] blur-[140px] animate-glow-drift-violet"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <h1 className="opacity-0 animate-fade-in text-5xl font-[450] tracking-[0.06em] sm:text-6xl md:text-7xl">
          Dreamfluid Labs
        </h1>

        <p className="opacity-0 animate-fade-in-delay-1 text-sm font-light tracking-widest text-df-white/75 uppercase">
          An engine for vision
        </p>

        <Link
          href="/tools"
          className="opacity-0 animate-fade-in-delay-2 mt-6 text-xs tracking-wider text-df-white/40 transition-colors duration-500 hover:text-df-white/80"
        >
          Explore Tools →
        </Link>
      </div>
    </main>
  );
}
