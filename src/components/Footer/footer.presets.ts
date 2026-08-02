// CRT wordmark color presets — flip DEFAULT_CRT_PRESET, or A/B in the
// browser with ?crt=neutral|brand|mono|rgb (see resolveCrtPreset).
// brand = Nebula/Starlight, neutral = warm/cool split, mono = white glow only,
// rgb = white glow + classic red/cyan fringe.

export type CrtPresetName = "neutral" | "brand" | "mono" | "rgb";

export type CrtPreset = {
  // Halo layer text-shadow (phosphor bloom behind the glyphs).
  haloShadow: string;
  // Sharp-layer chromatic split (left / right fringe). Mono uses a faint
  // white ghost instead of color.
  chromaShadow: string;
};

export const CRT_PRESETS: Record<CrtPresetName, CrtPreset> = {
  // Warm red-orange left, cool blue right — same split as the lens neutral arcs.
  neutral: {
    haloShadow:
      "0 0 24px rgba(250,250,250,0.35),0 0 70px rgba(255,107,77,0.22),0 0 130px rgba(115,166,255,0.2)",
    chromaShadow: "-2px 0 rgba(255,107,77,0.32),2px 0 rgba(115,166,255,0.32)",
  },
  // Brand-graded: Starlight / Nebula (Nebula-leaning bloom).
  brand: {
    haloShadow:
      "0 0 24px rgba(250,250,250,0.35),0 0 70px rgba(156,40,241,0.30),0 0 130px rgba(10,108,255,0.22)",
    chromaShadow: "-2px 0 rgba(0,190,255,0.28),2px 0 rgba(175,40,255,0.28)",
  },
  // Monochrome: white phosphor bloom only, no color fringe.
  mono: {
    haloShadow:
      "0 0 24px rgba(250,250,250,0.4),0 0 70px rgba(250,250,250,0.22),0 0 130px rgba(250,250,250,0.12)",
    chromaShadow: "-1px 0 rgba(250,250,250,0.18),1px 0 rgba(250,250,250,0.12)",
  },
  // White bloom + classic CRT RGB fringe (red left / cyan right).
  rgb: {
    haloShadow:
      "0 0 24px rgba(250,250,250,0.4),0 0 70px rgba(250,250,250,0.22),0 0 130px rgba(250,250,250,0.12)",
    chromaShadow: "-2px 0 rgba(255,56,56,0.38),2px 0 rgba(56,220,255,0.38)",
  },
};

export const DEFAULT_CRT_PRESET: CrtPresetName = "rgb";

export const resolveCrtPreset = (): CrtPreset => {
  if (typeof window === "undefined") return CRT_PRESETS[DEFAULT_CRT_PRESET];
  const q = new URLSearchParams(window.location.search).get("crt");
  return q && q in CRT_PRESETS
    ? CRT_PRESETS[q as CrtPresetName]
    : CRT_PRESETS[DEFAULT_CRT_PRESET];
};
