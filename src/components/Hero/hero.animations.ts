// The Hero owns its entrance animations here; tailwind.config.ts imports and
// spreads these so the utility classes (animate-engine-drop, animate-element-
// slam, …) are generated. Keep hero-only animations in this file so nothing
// outside the hero reaches for them or redefines them.
//
// Intro choreography — this is the single place to retune the entrance timing.
// Beat order (by delay): fade-in → word-tilt → vision-glow → element-slam
// (card falls in) with its element-shudder + impact ripple at touchdown.
// To move the slam, keep element-shudder's delay = slam delay + touchdown
// offset (0.7·0.65s). Durations encode physics feel — retune delays, not
// durations.
//
// Keyframe names here must match the animationName checks in the hooks:
// useWordLift → "word-tilt", useSlamImpact → "element-slam". "word-tilt" stays
// generic (it's the reusable word-lift mechanic, not "engine"-specific).

export const heroKeyframes = {
  "fade-in": {
    "0%": { opacity: "0", transform: "translateY(8px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  // A word dropping like a broken sign: overshoot then settle at -3°. Paired
  // with the generic useWordLift hook, so the name stays mechanic-descriptive.
  "word-tilt": {
    "0%":   { transform: "rotate(0deg) translateY(0)" },
    "40%":  { transform: "rotate(-4.5deg) translateY(0.02em)" },
    "65%":  { transform: "rotate(-2.4deg) translateY(0.02em)" },
    "85%":  { transform: "rotate(-3.4deg) translateY(0.02em)" },
    "100%": { transform: "rotate(-3deg) translateY(0.02em)" },
  },
  // "vision" word: flare bright then breathe down to a resting halo.
  "vision-glow": {
    "0%": {
      textShadow:
        "0 0 18px rgba(250,250,250,0), 0 0 48px rgba(250,250,250,0)",
    },
    "22%": {
      textShadow:
        "0 0 22px rgba(250,250,250,0.48), 0 0 58px rgba(250,250,250,0.26)",
    },
    "100%": {
      textShadow:
        "0 0 18px rgba(250,250,250,0.22), 0 0 48px rgba(250,250,250,0.10)",
    },
  },
  // Card entrance: scale waypoints follow s = 6 - 5·(t/T)^2.6
  // so that, under linear timing, the fall reads as a heavy mass under gravity —
  // a long near-still hang up high, then a violent rush into a deep squash at
  // impact. Touchdown at 70%, then squash + rebound settle.
  "element-slam": {
    "0%":   { opacity: "0", transform: "scale(6)", filter: "blur(8px)" },
    "17%":  { opacity: "0.1", transform: "scale(5.85)", filter: "blur(7px)" },
    "35%":  { opacity: "0.28", transform: "scale(5.18)", filter: "blur(5px)" },
    "52%":  { opacity: "0.58", transform: "scale(3.68)", filter: "blur(2.5px)" },
    "70%":  { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
    "81%":  { opacity: "1", transform: "scale(0.93)", filter: "blur(0px)" },
    "90%":  { opacity: "1", transform: "scale(1.02)", filter: "blur(0px)" },
    "100%": { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
  },
  // The word takes the hit at slam touchdown, then snaps back to place.
  "element-shudder": {
    "0%":   { transform: "translate(0, 0)" },
    "30%":  { transform: "translate(-0.026em, 0.018em)" },
    "60%":  { transform: "translate(0.02em, -0.012em)" },
    "100%": { transform: "translate(0, 0)" },
  },
};

// When the entrance is fully settled — the last beat is the slam landing at
// ~3.85s plus its impact ripple washing out. The hero cues the ambient field's
// idle trails at this point so they never compete with the intro.
export const HERO_INTRO_MS = 4200;

export const heroAnimations = {
  "fade-in": "fade-in 1s ease-out forwards",
  "fade-in-delay-1": "fade-in 1s ease-out 0.2s forwards",
  "fade-in-delay-2": "fade-in 1s ease-out 0.4s forwards",
  "word-tilt": "word-tilt 0.9s ease-in-out 1.4s forwards",
  "vision-glow": "vision-glow 2s ease-out 2.4s both",
  "element-slam": "element-slam 0.65s linear 3.2s both",
  "element-shudder": "element-shudder 0.12s steps(1, end) 3.655s both",
};
