// Film-grain motion in the dinacoletti / DayTrip vein: large stepped jumps on a
// long loop so the texture reshuffles like analog stock, not a smooth pan.
// background-position (not transform) so it still works with
// background-clip:text. Wired into tailwind.config.ts like hero/footer.
export const grainKeyframes = {
  "grain-shift": {
    "0%, 100%": { backgroundPosition: "0% 0%" },
    "10%": { backgroundPosition: "-12% -18%" },
    "20%": { backgroundPosition: "18% 8%" },
    "30%": { backgroundPosition: "-8% 22%" },
    "40%": { backgroundPosition: "14% -16%" },
    "50%": { backgroundPosition: "-20% 6%" },
    "60%": { backgroundPosition: "10% 20%" },
    "70%": { backgroundPosition: "-6% -12%" },
    "80%": { backgroundPosition: "16% -4%" },
    "90%": { backgroundPosition: "-14% 14%" },
  },
};

export const grainAnimations = {
  "grain-shift": "grain-shift 7s steps(10) infinite",
};
