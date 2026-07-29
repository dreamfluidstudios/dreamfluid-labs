// The ambient radial-gradient glow bed: a dark gradient base plus two slowly
// drifting brand-colour blobs. Purely atmospheric and non-interactive — fully
// decoupled from the interactive TileField so either layer can be swapped or
// reused on its own. Absolutely positioned to fill its nearest positioned
// ancestor. See DESIGN.md → Components → Signature: Ambient Field.
export const AmbientGradientField = () => (
  <>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 bg-df-black"
      style={{
        backgroundImage:
          "radial-gradient(60rem 60rem at 72% 8%, rgba(10,108,255,0.18), transparent 58%), radial-gradient(65rem 65rem at 14% 72%, rgba(156,40,241,0.15), transparent 68%), linear-gradient(180deg, #0D0D0D, #0F1013 42%, #09090A 100%)",
      }}
    />
    {/* Blobs sit above the tile grid (z-[1]) so their colour washes over it. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-40 -top-40 z-[1] h-[600px] w-[600px] rounded-full bg-df-starlight opacity-[0.12] blur-[160px] animate-glow-drift-blue"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-32 -right-32 z-[1] h-[500px] w-[500px] rounded-full bg-df-nebula opacity-[0.10] blur-[140px] animate-glow-drift-violet"
    />
  </>
);
