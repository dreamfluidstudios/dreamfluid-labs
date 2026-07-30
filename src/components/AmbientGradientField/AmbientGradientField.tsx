// The ambient bed. Currently the subtle dark vertical gradient only — the
// colourful brand-blue / violet radial washes and the two drifting glow blobs
// are temporarily disabled while the ambient treatment is being reworked.
// Purely atmospheric and non-interactive, fully decoupled from the interactive
// TileField. Absolutely positioned to fill its nearest positioned ancestor.
// See DESIGN.md → Components → Signature: Ambient Field.
export const AmbientGradientField = () => (
  <>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 bg-df-black"
      style={{
        // Subtle dark vertical gradient. To restore the colourful washes,
        // prepend these two layers (comma-separated) before the linear one:
        //   radial-gradient(60rem 60rem at 72% 8%, rgba(10,108,255,0.18), transparent 58%),
        //   radial-gradient(65rem 65rem at 14% 72%, rgba(156,40,241,0.15), transparent 68%),
        backgroundImage: "linear-gradient(180deg, #0D0D0D, #0F1013 42%, #09090A 100%)",
      }}
    />
    {/* Drifting brand-colour blobs — temporarily disabled (ambient rework):
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-40 -top-40 z-[1] h-[600px] w-[600px] rounded-full bg-df-starlight opacity-[0.12] blur-[160px] animate-glow-drift-blue"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-32 -right-32 z-[1] h-[500px] w-[500px] rounded-full bg-df-nebula opacity-[0.10] blur-[140px] animate-glow-drift-violet"
    />
    */}
  </>
);
