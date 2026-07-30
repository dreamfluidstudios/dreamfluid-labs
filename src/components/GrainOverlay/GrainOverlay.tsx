import { classNames } from "@/utils/classNames";

// Static film-grain overlay. A fractal-noise texture is generated once by an
// inline SVG feTurbulence filter, desaturated to neutral grey, and baked into a
// background-image data URI — so it's a pure CSS layer with no JavaScript and no
// per-frame work. The browser rasterizes it once and composites it essentially
// for free, on desktop and mobile alike. As a bonus, the grain dithers the dark
// gradient behind it, hiding the banding you get on near-black gradients.
//
// stitchTiles='stitch' + a background-size equal to the SVG tile makes the noise
// repeat seamlessly. encodeURIComponent keeps the data URI valid across browsers
// (Firefox is strict about unescaped '#', '%', '<' in SVG data URIs).
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

type GrainOverlayProps = {
  // 0–1: how strongly the grain reads. Keep it subtle on dark surfaces — the
  // noise spans the full tonal range, so a little goes a long way.
  opacity?: number;
  // feTurbulence frequency: lower = coarser, chunkier grain; higher = finer.
  baseFrequency?: number;
  className?: string;
};

export const GrainOverlay = ({
  opacity = 0.06,
  baseFrequency = 0.8,
  className,
}: GrainOverlayProps) => (
  <div
    aria-hidden="true"
    className={classNames("pointer-events-none absolute inset-0", className)}
    style={{
      opacity,
      backgroundImage: buildNoiseUrl(baseFrequency),
      backgroundSize: `${NOISE_TILE_PX}px ${NOISE_TILE_PX}px`,
    }}
  />
);
