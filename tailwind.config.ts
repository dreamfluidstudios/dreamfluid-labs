import type { Config } from "tailwindcss";
import { heroAnimations, heroKeyframes } from "./src/components/Hero/hero.animations";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "df-pure-black": "#000000",
        "df-pure-white": "#FFFFFF",
        "df-black": "#0D0D0D",
        "df-midnight": "#0F1013",
        "df-obsidian": "#151515",
        "df-phantom": "#1A1A1A",
        "df-carbon": "#222222",
        "df-graphite": "#303030",
        "df-silver": "#6C6E71",
        "df-canvas": "#F5F5F5",
        "df-white": "#FAFAFA",
        "df-blue": "#1A3FBC",
        "df-violet": "#6B23B1",
        "df-starlight": "#0A6CFF",
        "df-nebula": "#9C28F1",
        "df-aqua": "#00BEFF",
        "df-electric": "#AF28FF",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "Times New Roman", "serif"],
        mono: ["Space Mono", "Courier New", "monospace"],
        pixel: ["Geist Pixel Square", "monospace"],
        "pixel-line": ["Geist Pixel Line", "monospace"],
        "pixel-grid": ["Geist Pixel Grid", "monospace"],
      },
      boxShadow: {
        // Signature Dreamfluid gradient glow: Starlight Blue inner ring +
        // Nebula Violet outer ring. The brand's primary hover/focus signal on
        // interactive elements (buttons, inputs, cards) — see DESIGN.md.
        glow:
          "0 0 12px rgba(10, 108, 255, 0.3), 0 0 24px rgba(156, 40, 241, 0.3)",
        // Neutral white bloom — a quieter hover/focus signal for light-filled
        // surfaces (e.g. the white button) where the coloured glow reads busy.
        "glow-white":
          "0 0 12px rgba(250, 250, 250, 0.3), 0 0 28px rgba(250, 250, 250, 0.12)",
      },
      keyframes: {
        // AmbientField background blobs; hero intro keyframes are owned by the
        // Hero package (see src/components/Hero/hero.animations.ts).
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
        "loading-dot": {
          "0%, 40%, 100%": { transform: "translateY(0)", color: "#6C6E71" },
          "20%":           { transform: "translateY(-0.24em)", color: "#FAFAFA" },
        },
        ...heroKeyframes,
      },
      animation: {
        "glow-drift-blue": "glow-drift-blue 18s ease-in-out infinite",
        "glow-drift-violet": "glow-drift-violet 22s ease-in-out infinite",
        "loading-dot": "loading-dot 0.9s ease-in-out infinite",
        ...heroAnimations,
      },
    },
  },
  plugins: [],
};

export default config;
