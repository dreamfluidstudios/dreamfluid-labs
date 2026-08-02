import type { CSSProperties, ReactNode } from "react";
import { classNames } from "@/utils/classNames";

// Film-grain overlay. Fractal noise is generated once by an inline SVG
// feTurbulence filter, desaturated, and baked into a background-image data URI
// — pure CSS, no per-frame JS. stitchTiles + matching background-size tile it
// seamlessly; encodeURIComponent keeps the data URI valid in Firefox.
//
// Full-rect grain (default) will lift near-black areas when blend is "normal"
// — fine for dithering gradients, bad over pure black. For type on void black,
// pass clipToText + the label as children so only the glyphs get texture.
const NOISE_TILE_PX = 180;

const buildNoiseUrl = (baseFrequency: number): string => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${NOISE_TILE_PX}' height='${NOISE_TILE_PX}'>` +
    "<filter id='grain'>" +
    `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='4' stitchTiles='stitch'/>` +
    "<feColorMatrix type='saturate' values='0'/>" +
    "</filter>" +
    "<rect width='100%' height='100%' filter='url(#grain)'/>" +
    "</svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

type GrainBlend = "normal" | "overlay" | "soft-light" | "multiply";

type GrainOverlayProps = {
  // 0–1: how strongly the grain reads.
  opacity?: number;
  // feTurbulence frequency: lower = coarser; higher = finer.
  baseFrequency?: number;
  // How the noise composites with what's behind.
  blend?: GrainBlend;
  // Stepped background-position jitter — film-grain motion without JS.
  animated?: boolean;
  // Clip noise to glyph shapes (pass the same label as children). Keeps the
  // surrounding void absolute black — no grey band.
  clipToText?: boolean;
  children?: ReactNode;
  className?: string;
};

export const GrainOverlay = ({
  opacity = 0.06,
  baseFrequency = 0.8,
  blend = "normal",
  animated = false,
  clipToText = false,
  children,
  className,
}: GrainOverlayProps) => {
  const style = {
    opacity,
    backgroundImage: buildNoiseUrl(baseFrequency),
    backgroundSize: `${NOISE_TILE_PX}px ${NOISE_TILE_PX}px`,
    mixBlendMode: blend,
    ...(clipToText
      ? {
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }
      : {}),
  } satisfies CSSProperties;

  if (clipToText) {
    return (
      <span
        aria-hidden="true"
        className={classNames(
          "pointer-events-none absolute inset-0 select-none text-center font-[inherit] text-[length:inherit] leading-[inherit]",
          animated && "motion-safe:animate-grain-shift",
          className,
        )}
        style={style}
      >
        {children}
      </span>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={classNames(
        "pointer-events-none absolute inset-0",
        animated && "motion-safe:animate-grain-shift",
        className,
      )}
      style={style}
    />
  );
};
