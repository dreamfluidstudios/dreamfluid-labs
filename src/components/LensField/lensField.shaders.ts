// Fullscreen shader pair for the focus-ring lens. The fragment shader
// draws the whole hero backdrop (procedural grid + lit cells from a compact
// cols×rows scoreboard) so the band bulges can bend all of it. TileField's
// DOM layers are hidden while the lens is active — see HeroBackdropSection.
//
// The fragment source is generated from the LENS_ARCS data (GLSL ES 1.00 has
// no const-array initializers, so the per-band calls are unrolled at build
// time). Band look/placement is tuned in lensField.presets.ts, not here.
// Arc radii are uFocusRadius + per-arc gap — the oval is fitted to the intro
// copy each frame so the ring consistently surrounds the text on any viewport.

import type { LensArc } from "./lensField.presets";

export const LENS_VERTEX = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const f = (n: number) => n.toFixed(5);
const rad = (deg: number) => (deg * Math.PI) / 180;

// Arc samples run on the scroll-rotated/expanded frame (`qr`), not raw `q`.
// Radius = fitted content oval + this band's gap.
const arcCall = (a: LensArc) =>
  `    arcContrib(qr, ${f(rad(a.angle))}, ${f(a.gap)}, ${f(a.thickness)}, ${f(
    rad(a.arcLength / 2),
  )}, ${f(a.intensity)}, disp, fringe, ridge);`;

export const buildLensFragment = (arcs: LensArc[]) => /* glsl */ `
  precision highp float;

  uniform sampler2D tTileState; // cols×rows lit-cell scoreboard (NEAREST)
  uniform vec2 uTileStateSize; // scoreboard size in cells
  uniform vec2 uResolution;    // lens canvas size in CSS px (viewport)
  uniform vec2 uMapSize;       // TileField box size in CSS px — grid phase
                               // must use this, not uResolution, or lit tiles
                               // drift when hero box ≠ window
  uniform float uCell;         // grid cell size in CSS px (TileField CELL)
  uniform float uWarp;         // max UV pull under a band's bulge
  uniform float uBulge;        // warp width vs fringe (1 = same, >1 = wider)
  uniform float uChroma;       // R/G/B sample spread inside a bulge
  uniform vec3 uTintOuter;     // band spectrum, outer (cool) edge
  uniform vec3 uTintInner;     // band spectrum, inner (warm) edge
  uniform float uTintStrength; // overall band brightness
  // Scroll exit (0 at rest → 1 once the hero has left the viewport):
  // rotates the ring and pushes its radius outward. Magnitudes come from
  // LENS_SCROLL in the presets file.
  uniform float uScroll;
  uniform float uScrollRotate;
  uniform float uScrollExpand;
  // Smoothed pointer (-1..1 from viewport center) + perspective knobs from
  // LENS_POINTER. Shifts / foreshortens / rotates the arc frame only —
  // backdrop stays put.
  uniform vec2 uPointer;
  uniform float uPointerParallax;
  uniform float uPointerTilt;
  uniform float uPointerRotate;
  // Arc-only film grain (LENS_GRAIN). Applied to fringe after bands accumulate
  // so empty pixels stay absolute black.
  uniform float uGrainAmount;
  uniform float uGrainScale;
  uniform float uTime;
  // Content oval fitted to the intro block (center + vertical radius +
  // horizontal stretch). Arcs sit at uFocusRadius + gap * uArcScale;
  // thickness also scales so bands shrink with the copy on mobile.
  uniform vec2 uFocusCenter;
  uniform float uFocusRadius;
  uniform float uFocusStretch;
  uniform float uArcScale;
  // 1 when stacked over ZoomBlurField: only paint arcs (+ local warp), so the
  // zoom peephole owns the backdrop outside the bands.
  uniform float uOverlay;
  // Fringe composite style (LENS_BLEND_CODE): 0 normal, 1 soft, 2 add, 3 screen.
  // Drives alpha falloff; GL blend func is set to match in useLensField.
  uniform float uBlend;

  varying vec2 vUv;

  float grainHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // One soft focus-ring band. q is the fragment's offset from the content
  // oval center in aspect-corrected UV. Accumulates:
  //  - disp:   gentle pull toward the focal center under the band, so
  //            grid/tiles bend as if seen through the lens ring
  //  - fringe: the band itself — a gaussian prismatic glow grading from
  //            uTintInner through a pale core to uTintOuter (real chromatic
  //            aberration character, no hard edges)
  //  - ridge:  band coverage, used to keep backdrop content visible (and
  //            warpable) under the bands despite the radial fade
  void arcContrib(
    vec2 q, float angle, float gap, float thickness,
    float halfLen, float intensity, inout vec2 disp, inout vec3 fringe,
    inout float ridge
  ) {
    float stretch = max(uFocusStretch, 0.001);
    float s = max(uArcScale, 0.001);
    float radius = uFocusRadius + gap * s;
    float th = max(thickness * s, 0.008);
    // The ring is an ellipse following the copy's wide shape: compress x so
    // distance/angle math happens on a circle.
    vec2 pe = vec2(q.x / stretch, q.y);
    float d = length(pe);
    float ang = atan(pe.y, pe.x);
    float da = abs(atan(sin(ang - angle), cos(ang - angle)));
    // Long soft tails so segments melt away rather than stopping.
    float along = 1.0 - smoothstep(halfLen * 0.4, halfLen, da);
    if (along <= 0.0) return;

    // Signed distance across the band, in thicknesses.
    float t = (d - radius) / th;

    // Gaussian envelope + spectral grade: warm inside, pale core, cool out.
    float env = exp(-t * t);
    vec3 spec = mix(uTintInner, uTintOuter, clamp(t * 0.5 + 0.5, 0.0, 1.0));
    spec = mix(spec, vec3(1.0), 0.3 * exp(-t * t * 5.0));
    float cover = env * along;
    fringe += spec * cover * intensity;

    // Warp is a bit wider than the colored fringe (uBulge), so arcs read with
    // a soft bent halo — still arc-local, not the old center-flooding bowl.
    float wt = t / max(uBulge, 1.0);
    float bulge = exp(-wt * wt) * along;
    disp += -(q / max(length(q), 1e-4)) * bulge * uWarp;
    ridge = max(ridge, bulge);
  }

  // The static grid bed, replacing TileField's CSS-gradient div: 1px lines on
  // the same 72px cells, alphas matched to the original (0.10 horizontal /
  // 0.09 vertical lines under the div's 0.55 layer opacity).
  // Drawn in the source box's CSS pixel space so cell edges share phase with
  // the lit-cell scoreboard (even if the lens viewport is a slightly
  // different size).
  vec3 grid(vec2 uv) {
    vec2 px = vec2(uv.x, 1.0 - uv.y) * uMapSize;
    vec2 g = mod(px, uCell);
    float a = step(g.y, 1.0) * 0.055 + step(g.x, 1.0) * 0.0495;
    return vec3(a);
  }

  // Lit tiles from the compact scoreboard: one texel per cell (NEAREST).
  // Alpha is fill*coverage from the JS pack; a 1px rim boosts toward the
  // old canvas strokeRect so tiles keep a faint outline.
  vec3 litTiles(vec2 uv) {
    if (uTileStateSize.x < 1.0 || uTileStateSize.y < 1.0) return vec3(0.0);
    vec2 px = vec2(uv.x, 1.0 - uv.y) * uMapSize;
    vec2 cell = floor(px / max(uCell, 1.0));
    if (cell.x < 0.0 || cell.y < 0.0 ||
        cell.x >= uTileStateSize.x || cell.y >= uTileStateSize.y) {
      return vec3(0.0);
    }
    // flipY=false: buffer row 0 = top of source = low v after our px flip.
    vec2 stateUv = (cell + 0.5) / uTileStateSize;
    vec4 tile = texture2D(tTileState, stateUv);
    if (tile.a <= 0.001) return vec3(0.0);
    vec2 local = mod(px, max(uCell, 1.0));
    float edge = min(
      min(local.x, local.y),
      min(uCell - local.x, uCell - local.y)
    );
    float stroke = 1.0 - step(1.0, edge);
    float a = tile.a * mix(1.0, 1.8, stroke);
    return tile.rgb * a;
  }

  // Full backdrop at a given (possibly warped) UV: procedural grid + lit cells.
  vec3 scene(vec2 uv) {
    return grid(uv) + litTiles(uv);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    // Fragment offset from the content oval center, aspect-corrected.
    // (q.x, q.y) = ((px - cx) / vh, (cy - py) / vh) — see updateFocus.
    vec2 q = (vUv - 0.5) * vec2(aspect, 1.0) - uFocusCenter;

    // Mouse perspective on the arc frame only (ring slides + foreshortens +
    // slight Z rotate; backdrop sampling still uses unshifted q / vUv).
    vec2 qa = q;
    qa -= uPointer * uPointerParallax * vec2(aspect, 1.0);
    qa.x *= 1.0 + uPointer.y * uPointerTilt;
    qa.y *= 1.0 - uPointer.x * uPointerTilt * 0.65;

    // Scroll exit spin + pointer Y on the same axis (up/down nudges the ring
    // the way expand rotates it). Same ang is applied to disp afterward so
    // the bulge still pulls toward the true focus center.
    float ang = uScroll * uScrollRotate + uPointer.y * uPointerRotate;
    float ca = cos(ang);
    float sa = sin(ang);
    float expand = 1.0 + uScroll * uScrollExpand;
    vec2 qr = vec2(ca * qa.x + sa * qa.y, -sa * qa.x + ca * qa.y) / expand;

    vec2 disp = vec2(0.0);
    vec3 fringe = vec3(0.0);
    float ridge = 0.0;
${arcs.map(arcCall).join("\n")}

    // Rotate disp back into screen space (it was accumulated on qr).
    disp = vec2(ca * disp.x - sa * disp.y, sa * disp.x + ca * disp.y);

    // disp was accumulated in aspect-corrected space; convert back to UV.
    vec2 dispUv = disp / vec2(aspect, 1.0);

    // Film grain on the fringe only — centered noise so average brightness
    // holds, and zero fringe means zero grain (no grey lift on the void).
    float fringePeak = max(fringe.r, max(fringe.g, fringe.b));
    if (uGrainAmount > 0.0 && fringePeak > 0.0) {
      float cell = max(uGrainScale, 0.001);
      vec2 gp = floor(gl_FragCoord.xy * cell) + floor(uTime);
      float n = grainHash(gp);
      fringe *= 1.0 + (n * 2.0 - 1.0) * uGrainAmount;
    }

    // Transparent canvas: empty edges let later sections show through.
    // Softness lives entirely in the lit color (gaussian fringe). Presence
    // snaps to 1 for any visible signal so SRC_ALPHA compositing cannot
    // dim the band bodies — that double-darkening is what made them look
    // washed out after the transparent pass landed.
    //
    // Solo: full faded scene + fringe (lens owns the bed).
    // Overlay: fringe glow only — skip scene sampling (another pass owns the bed).
    vec3 lit;
    float bedFade = 0.0;
    if (uOverlay > 0.5) {
      lit = fringe * uTintStrength;
    } else {
      // Sample the warped scene with a slight per-channel spread, so content
      // under a bulge picks up its own subtle chromatic split.
      vec3 base  = scene(vUv + dispUv);
      vec3 outer = scene(vUv + dispUv * (1.0 + uChroma));
      vec3 inner = scene(vUv + dispUv * (1.0 - uChroma));
      vec3 col = vec3(outer.r, base.g, inner.b);

      // Radial fade replacing the CSS mask, lifted under the band bulges so
      // they always have visible content to bend.
      float cornerDist = 0.5 * length(vec2(aspect, 1.0));
      bedFade = 1.0 - smoothstep(0.4, 0.95, length(q) / cornerDist);
      bedFade = max(bedFade, ridge * 0.9);
      lit = col * bedFade + fringe * uTintStrength;
    }
    // Slightly wider than the old 0.58→0.92 band so the dissolve eases
    // out instead of dropping once the hero starts leaving.
    float exitFade = 1.0 - smoothstep(0.48, 0.98, uScroll);
    float peak = max(lit.r, max(lit.g, lit.b));
    float overlayPeak = fringePeak * uTintStrength;
    float signal = mix(peak, overlayPeak, step(0.5, uOverlay));
    // Light coverage — follows intensity so fringe skirts don't occlude.
    float lightCover = clamp(signal, 0.0, 1.0) * exitFade;

    vec3 outRgb = lit;
    float presence;
    if (uBlend < 0.5) {
      // Normal SRC_ALPHA: hard snap when the scene bed lives in-shader
      // (desktop solo). Arcs-only has no bed in lit, so use light-weighted
      // alpha or the skirt punches a black rim through the DOM tiles.
      if (uOverlay > 0.5) {
        presence = lightCover;
      } else {
        presence = smoothstep(0.0, 0.004, signal) * exitFade;
      }
    } else if (uBlend < 1.5) {
      // Soft SRC_ALPHA: solid bed where the scene lives, light-weighted
      // alpha on fringe-only skirts so tiles show through.
      presence = max(bedFade * exitFade, lightCover);
    } else if (uBlend < 2.5) {
      // Additive (SRC_ALPHA, ONE): light piles on; alpha = coverage.
      presence = lightCover;
    } else {
      // Screen-ish (ONE, ONE_MINUS_SRC_COLOR): premultiply by coverage.
      outRgb = lit * lightCover;
      presence = exitFade;
    }

    gl_FragColor = vec4(outRgb, presence);
  }
`;
