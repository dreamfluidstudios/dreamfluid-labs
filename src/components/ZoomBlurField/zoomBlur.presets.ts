// Taste knobs for the radial zoom-blur peephole. Blur falloff is tied to the
// same content oval as LensField (focusRef fit). Flip DEFAULT_BACKDROP in
// HeroBackdropSection, or A/B with ?backdrop=zoom|lens. Touch profiles lower
// `samples` via resolveDeviceProfile (both-mode is shelved).

export type ZoomBlurPreset = {
  // Radial sample count (baked into the shader loop at build time).
  samples: number;
  // Max q-space pull along the focus→pixel ray at full blur.
  blurStrength: number;
  // Absolute R/B radial split in q-space at the rim.
  chroma: number;
  // Peephole pad beyond the content oval (elliptical). aperture = ovalR + this.
  vignette: number;
  // Softness of the aperture edge (same units).
  vignetteSoft: number;
  // Fraction of the content oval that stays sharp (1 = sharp through the copy).
  innerSharp: number;
  // Distance past the oval edge where blur hits full strength (arcs live here).
  blurRim: number;
};

export const ZOOM_BLUR: ZoomBlurPreset = {
  samples: 10,
  blurStrength: 0.09,
  chroma: 0.01,
  vignette: 0.42,
  vignetteSoft: 0.1,
  // Keep the intro copy clear; streak starts near the oval edge.
  innerSharp: 0.9,
  // Full blur around where the lens arcs would sit.
  blurRim: 0.28,
};
