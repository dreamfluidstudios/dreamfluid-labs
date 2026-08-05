// Every taste knob for the lens lives here — tune this file, not the shader.
// Flip DEFAULT_LENS_PRESET, or A/B with
// ?lens=neutral|dispersion|secondary|brand|mono|rgb
// and ?blend=normal|soft|add|screen.
//
// (neutral/brand/mono/rgb share names with the CRT footer's set, but the two
// are independent — dispersion/secondary exist here only.)

export type LensPresetName =
  | "neutral"
  | "dispersion"
  | "secondary"
  | "brand"
  | "mono"
  | "rgb";

export type LensPreset = {
  // Max UV pull under a band's bulge — how hard the grid/tiles bend where a
  // band crosses them.
  warp: number;
  // How much wider the warp is than the colored fringe (1 = same width as the
  // glow; ~2 = soft halo around the arc). Keep modest so the copy stays clear.
  bulge: number;
  // Relative spread between the R/G/B scene samples inside a bulge — a subtle
  // secondary fringe on the warped content itself.
  chroma: number;
  // Band spectrum: each band grades from tintInner on its inner edge through
  // a pale core to tintOuter outside — like real chromatic aberration, where
  // the warm and cool halves of the spectrum split around focus.
  tintOuter: [number, number, number];
  tintInner: [number, number, number];
  // Overall band brightness. Soft glows, not lines — keep this modest.
  tintStrength: number;
};

const STARLIGHT: [number, number, number] = [10 / 255, 108 / 255, 255 / 255];
const NEBULA: [number, number, number] = [156 / 255, 40 / 255, 241 / 255];
const WHITE: [number, number, number] = [250 / 255, 250 / 255, 250 / 255];
const RGB_RED: [number, number, number] = [255 / 255, 56 / 255, 56 / 255];
const RGB_CYAN: [number, number, number] = [56 / 255, 220 / 255, 255 / 255];

// The warm/cool halves of a dispersion split, named so `neutral` and
// `dispersion` can use the same pair in opposite order — the only difference
// between those two presets is which side each lands on.
const CA_WARM: [number, number, number] = [1.0, 0.42, 0.3];
const CA_COOL: [number, number, number] = [0.45, 0.65, 1.0];

// Secondary spectrum: what a corrected (achromatic) lens actually leaves behind
// once red and blue have been brought to a common focus. Green is the
// uncorrected outlier, and the residual reads green against magenta — magenta
// being what red+blue look like together. Green is tempered rather than run to
// full, because at equal numbers it reads far brighter than the magenta.
const SECONDARY_GREEN: [number, number, number] = [0.45, 0.9, 0.5];
const SECONDARY_MAGENTA: [number, number, number] = [1.0, 0.42, 0.85];

const BASE = { warp: 0.04, bulge: 2.8, chroma: 0.35 } as const;

export const LENS_PRESETS: Record<LensPresetName, LensPreset> = {
  // Warm red-orange inner, cool blue outer — real-lens chromatic split.
  neutral: {
    ...BASE,
    tintOuter: CA_COOL,
    tintInner: CA_WARM,
    tintStrength: 0.9,
  },
  // neutral with the split the other way up: cool inside, warm outside.
  //
  // This is the direction a simple uncorrected positive lens actually gives
  // you. Shorter wavelengths refract harder, so blue is deflected more and
  // lands at a smaller image height — on a bright band against black that puts
  // blue on the inner edge and red trailing outside it. neutral does the
  // reverse, so this is the textbook-dispersion answer to it.
  //
  // Whether it looks *better* is a separate question from whether it is more
  // literal: real corrected glass over- or under-corrects and shows the fringe
  // either way round, so both directions occur in actual photographs.
  //
  // Same tintStrength as neutral on purpose — the only variable between the two
  // is which side each half of the spectrum sits on.
  dispersion: {
    ...BASE,
    tintOuter: CA_WARM,
    tintInner: CA_COOL,
    tintStrength: 0.9,
  },
  // Green inner, magenta outer — the achromat residual rather than a raw
  // dispersion split, and arguably the most "real modern lens" of the set:
  // it is what you get from glass that has already been corrected, which is
  // every lens anyone actually shoots with.
  //
  // Green sits inside because in a doublet corrected for red and blue, green is
  // the wavelength left focusing short, which puts it at the smaller image
  // height. Swap the two fields to test the opposite handedness.
  //
  // Also worth noting it avoids the blue/violet vocabulary entirely.
  secondary: {
    ...BASE,
    tintOuter: SECONDARY_MAGENTA,
    tintInner: SECONDARY_GREEN,
    tintStrength: 0.9,
  },
  // Brand-graded: Nebula inner, Starlight outer.
  brand: {
    ...BASE,
    tintOuter: STARLIGHT,
    tintInner: NEBULA,
    tintStrength: 1.0,
  },
  // White glow only — no color fringe (shader still lifts a pale core).
  mono: {
    ...BASE,
    chroma: 0.15,
    tintOuter: WHITE,
    tintInner: WHITE,
    tintStrength: 0.85,
  },
  // White-leaning bloom with classic CRT red / cyan fringe.
  rgb: {
    ...BASE,
    tintOuter: RGB_CYAN,
    tintInner: RGB_RED,
    tintStrength: 0.95,
  },
};

export const DEFAULT_LENS_PRESET: LensPresetName = "dispersion";

// How far the focus ring spins and grows as the hero scrolls out of view.
// Progress is 0 at the page top and 1 once the hero's bottom clears the
// viewport top — see useLensField. expand is added to 1, so 0.6 → 1.6× radius.
//
// This was 1.4 (2.4× radius). That much growth put the ring a long way below
// the showcase card on anything narrower than a laptop: the card is
// aspect-video so its height follows viewport *width*, while the ring follows
// hero *height*, and on a tall phone the ring outruns it by ~470px. Growth is
// also the expensive direction — every unit of expand has to be paid for in
// LensField's BOX height, which is canvas the GPU fills and composites.
export const LENS_SCROLL = {
  rotate: Math.PI * 0.42, // ~76° counter-clockwise at full exit
  expand: 0.6,
};

// Mouse-follow perspective on the arcs (fine pointers only). pointer is
// smoothed -1..1 from viewport center; parallax slides the ring toward the
// cursor, tilt foreshortens the ellipse as if the plane is leaning.
export const LENS_POINTER = {
  parallax: 0.006,
  tilt: 0.008,
  // Max spin at full vertical pointer (radians), same axis as LENS_SCROLL.rotate.
  rotate: 0.012,
  // Seconds for the ring to roughly catch up to the cursor (higher = more lag).
  catchUp: 0.45,
  // Ignore samples this close to the viewport edge (px) — stops leave spikes.
  edgePad: 4,
  // 1 = follow the cursor, -1 = anti-follow (ring moves opposite).
  follow: -1 as 1 | -1,
};

// Ambient Lissajous on the same pointer channel while the cursor is still.
// Feeds the catch-up target (not the live pose), so idle yields with the
// same lag as the cursor coming back from off-screen.
export const LENS_DRIFT = {
  // Seconds of stillness before idle motion begins.
  idleAfter: 0.5,
  // Mix ease — ring lag itself comes from LENS_POINTER.catchUp.
  blendIn: 0.8,
  blendOut: 0.45,
  // Peak pointer-space amplitude (softer than a full swim).
  amplitude: 1.05,
  // Incommensurate Hz so the path doesn't loop on itself.
  freqX: 0.08,
  freqY: 0.12,
  phaseY: 1.7,
};

// Procedural film grain on the arc fringe only (void stays black). amount is
// the ± modulation depth; scale is noise frequency in screen space; fps is
// how often the grain pattern reshuffles (0 = static).
export const LENS_GRAIN = {
  amount: 0.075, // keep low — suggestion of texture, not a visible noise layer
  scale: 0.85, // lower = thicker / chunkier grain
  fps: 0, // static texture — no reshuffle
};

// Content oval the arcs orbit. Measured from the intro focus element (wordmark
// + headline + CTAs) each frame. Arc gap/thickness are authored at refRadius
// and scaled with the fitted oval (like type), so mobile rings shrink with the
// copy. Narrow viewports also ease stretch down so the oval doesn't over-widen.
export const LENS_FOCUS = {
  stretch: 1.5,
  // Phone / tall portrait — less horizontal overshoot.
  stretchNarrow: 1.2,
  // Viewport width/height where stretchNarrow ↔ stretch blend.
  stretchAspectFrom: 0.55,
  stretchAspectTo: 1.15,
  padding: 0.025,
  minRadius: 0.12,
  // Oval radius at which LENS_ARCS gap/thickness were tuned (desktop).
  refRadius: 0.28,
  // Clamp on (fittedRadius / refRadius) for gap + thickness scaling.
  scaleMin: 0.55,
  scaleMax: 1.1,
};

// The focus-ring bands: soft prismatic segments sitting just outside the
// content oval. gap is distance beyond that oval (same UV units as radius).
//
//  - angle:     degrees around the ring; 0 = right (3 o'clock), counter-
//               clockwise positive (90 = top, 180 = left, -90 = bottom)
//  - arcLength: total angular span in degrees
//  - gap:       how far outside the fitted content oval the band sits
//               (authored at LENS_FOCUS.refRadius; scaled by uArcScale)
//  - thickness: half-width of the soft band (UV units) — bands are gaussian,
//               so this is a blur radius more than a line width (also scaled)
//  - intensity: per-band brightness multiplier on top of tintStrength
export type LensArc = {
  angle: number;
  arcLength: number;
  gap: number;
  thickness: number;
  intensity: number;
};

export const LENS_ARCS: LensArc[] = [
  // Main sweep over the upper-left of the copy.
  { angle: 148, arcLength: 75, gap: 0.04, thickness: 0.045, intensity: 0.9 }, // Upper Left Arc
  // Answering sweep under the lower-right, kept above the showcase panel.
  { angle: -32, arcLength: 60, gap: 0.035, thickness: 0.05, intensity: 0.8 }, // Lower Right Arc
  // Small accents completing the broken ring.
  { angle: 62, arcLength: 30, gap: 0.04, thickness: 0.03, intensity: 0.6 }, // Upper Right Arc
  { angle: -135, arcLength: 35, gap: 0.055, thickness: 0.035, intensity: 0.55 }, // Lower Left Arc
];

export const resolveLensPreset = (): LensPreset => {
  if (typeof window === "undefined") return LENS_PRESETS[DEFAULT_LENS_PRESET];
  const q = new URLSearchParams(window.location.search).get("lens");
  return q && q in LENS_PRESETS
    ? LENS_PRESETS[q as LensPresetName]
    : LENS_PRESETS[DEFAULT_LENS_PRESET];
};

// How the fringe composites over what's underneath. A/B with
// ?blend=normal|soft|add|screen. "auto" → normal (solo bed + arcs in one pass).
export type LensBlendName = "normal" | "soft" | "add" | "screen";
export type LensBlendOption = LensBlendName | "auto";

export const DEFAULT_LENS_BLEND: LensBlendOption = "auto";

// Shader uBlend codes — keep in sync with lensField.shaders.ts.
export const LENS_BLEND_CODE: Record<LensBlendName, number> = {
  normal: 0,
  soft: 1,
  add: 2,
  screen: 3,
};

export const resolveLensBlend = (_arcsOnly: boolean): LensBlendName => {
  let choice: LensBlendOption = DEFAULT_LENS_BLEND;
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("blend");
    if (
      q === "normal" ||
      q === "soft" ||
      q === "add" ||
      q === "screen" ||
      q === "auto"
    ) {
      choice = q;
    }
  }
  if (choice === "auto") return "normal";
  return choice;
};
