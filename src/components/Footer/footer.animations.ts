// Footer-owned animations, mirrored into tailwind.config.ts the same way the
// hero's are.
//
// crt-flicker — halo brightness dips (tube losing sync). steps() keeps them
// abrupt so it reads as electrical flicker, not a fade.
//
// crt-shake — fast, stepped jitter on the whole wordmark (unstable CRT).
// Small px offsets; steps() keeps each jump hard with no easing between.
export const footerKeyframes = {
  "crt-flicker": {
    "0%, 100%": { opacity: "1" },
    "6%": { opacity: "0.78" },
    "7%": { opacity: "0.94" },
    "8%": { opacity: "1" },
    "38%": { opacity: "0.9" },
    "39%": { opacity: "1" },
    "62%": { opacity: "0.82" },
    "63%": { opacity: "0.95" },
    "64%": { opacity: "1" },
  },
  "crt-shake": {
    "0%, 100%": { transform: "translate3d(0, 0, 0)" },
    "12%": { transform: "translate3d(-0.5px, 0.4px, 0)" },
    "28%": { transform: "translate3d(0.45px, 0, 0)" },
    "44%": { transform: "translate3d(0, -0.45px, 0)" },
    "60%": { transform: "translate3d(0.4px, 0.4px, 0)" },
    "76%": { transform: "translate3d(-0.4px, 0, 0)" },
    "88%": { transform: "translate3d(0, 0.3px, 0)" },
  },
};

export const footerAnimations = {
  "crt-flicker": "crt-flicker 4.2s steps(1, end) infinite",
  "crt-shake": "crt-shake 0.55s steps(2, end) infinite",
};
