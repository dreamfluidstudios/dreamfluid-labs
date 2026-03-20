import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "df-black": "#0D0D0D",
        "df-blue": "#1A3FBC",
        "df-violet": "#6B23B1",
        "df-white": "#FAFAFA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-drift-blue": {
          "0%":   { transform: "translate(0, 0) scale(1)" },
          "25%":  { transform: "translate(80px, 40px) scale(1.08)" },
          "50%":  { transform: "translate(40px, -60px) scale(0.95)" },
          "75%":  { transform: "translate(-50px, 30px) scale(1.04)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
        "glow-drift-violet": {
          "0%":   { transform: "translate(0, 0) scale(1)" },
          "25%":  { transform: "translate(-60px, -40px) scale(1.06)" },
          "50%":  { transform: "translate(50px, 50px) scale(0.97)" },
          "75%":  { transform: "translate(30px, -70px) scale(1.03)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 1s ease-out forwards",
        "fade-in-delay-1": "fade-in 1s ease-out 0.2s forwards",
        "fade-in-delay-2": "fade-in 1s ease-out 0.4s forwards",
        "glow-drift-blue": "glow-drift-blue 18s ease-in-out infinite",
        "glow-drift-violet": "glow-drift-violet 22s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
