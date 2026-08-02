// Fullscreen zoom-blur peephole. Samples the TileField canvas and redraws the
// grid bed (same reason as LensField — WebGL can't sample the CSS grid).
// Radial zoom blur streaks toward the intro focus; falloff follows the same
// content oval as LensField. Knobs live in zoomBlur.presets.ts.
//
// Underlay mode (stacked under lens): full radial bed instead of peephole;
// lens paints fringe-only on top so soft glow edges don't pick up a black ring.

import type { ZoomBlurPreset } from "./zoomBlur.presets";

export const ZOOM_BLUR_VERTEX = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const f = (n: number) => n.toFixed(5);

export const buildZoomBlurFragment = (preset: ZoomBlurPreset) => {
  const samples = Math.max(2, Math.min(16, Math.round(preset.samples)));

  const taps: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    taps.push(`    {
      float t = ${f(t)};
      vec2 off = -dir * t * blurAmt;
      float cr = caAmt * (0.35 + 0.65 * t);
      vec2 uvG = vUv + off / vec2(aspect, 1.0);
      vec2 uvR = vUv + (off - dir * cr) / vec2(aspect, 1.0);
      vec2 uvB = vUv + (off + dir * cr) / vec2(aspect, 1.0);
      float w = 1.0 - t * 0.25;
      acc += vec3(scene(uvR).r, scene(uvG).g, scene(uvB).b) * w;
      wsum += w;
    }`);
  }

  return /* glsl */ `
  precision highp float;

  uniform sampler2D tMap;
  uniform vec2 uResolution;
  uniform vec2 uMapSize;
  uniform float uCell;
  uniform vec2 uFocusCenter;
  uniform float uFocusRadius;
  uniform float uFocusStretch;
  uniform float uBlurStrength;
  uniform float uChroma;
  uniform float uVignette;
  uniform float uVignetteSoft;
  uniform float uInnerSharp;
  uniform float uBlurRim;
  uniform float uScroll;
  // 1 when under LensField: full radial bed (no peephole cutout).
  uniform float uUnderlay;

  varying vec2 vUv;

  vec3 grid(vec2 uv) {
    vec2 px = vec2(uv.x, 1.0 - uv.y) * uMapSize;
    vec2 g = mod(px, uCell);
    float a = step(g.y, 1.0) * 0.055 + step(g.x, 1.0) * 0.0495;
    return vec3(a);
  }

  vec3 scene(vec2 uv) {
    vec2 c = clamp(uv, 0.0, 1.0);
    vec4 tile = texture2D(tMap, c);
    return grid(c) + tile.rgb * tile.a;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 q = (vUv - 0.5) * vec2(aspect, 1.0) - uFocusCenter;
    // Same ellipse as LensField — blur amount tracks the content oval,
    // streaks still pull toward the focus center in screen space.
    float stretch = max(uFocusStretch, 0.001);
    float ovalR = max(uFocusRadius, 1e-3);
    vec2 pe = vec2(q.x / stretch, q.y);
    float ovalDist = length(pe);
    float blurStart = ovalR * uInnerSharp;
    float blurEnd = ovalR + max(uBlurRim, 1e-3);
    float edge = smoothstep(blurStart, blurEnd, ovalDist);
    edge = edge * edge * (3.0 - 2.0 * edge);
    float blurAmt = uBlurStrength * edge;
    float caAmt = uChroma * pow(edge, 0.75);

    float screenDist = length(q);
    vec2 dir = screenDist > 1e-5 ? q / screenDist : vec2(0.0);

    vec3 acc = vec3(0.0);
    float wsum = 0.0;
${taps.join("\n")}

    vec3 col = acc / max(wsum, 1e-4);

    {
      float rimCa = uChroma * 1.35 * pow(edge, 1.1);
      vec2 uvR = vUv + (-dir * rimCa) / vec2(aspect, 1.0);
      vec2 uvB = vUv + ( dir * rimCa) / vec2(aspect, 1.0);
      float mixCa = smoothstep(0.35, 1.0, edge) * 0.65;
      col.r = mix(col.r, scene(uvR).r, mixCa);
      col.b = mix(col.b, scene(uvB).b, mixCa);
    }

    float cornerDist = 0.5 * length(vec2(aspect, 1.0));
    float aperture = ovalR + max(uVignette, 1e-3);
    float peephole = 1.0 - smoothstep(
      aperture - uVignetteSoft,
      aperture + uVignetteSoft * 0.35,
      ovalDist
    );
    float bed = 1.0 - smoothstep(0.4, 0.95, ovalDist / max(cornerDist, 1e-3));
    float veil = mix(peephole, bed, step(0.5, uUnderlay));

    float rim = smoothstep(aperture * 0.55, aperture, ovalDist);
    col *= 1.0 - rim * mix(0.28, 0.0, step(0.5, uUnderlay));

    // Match LensField: wider exit band so the dissolve isn't abrupt.
    float exitFade = 1.0 - smoothstep(0.48, 0.98, uScroll);
    float alpha = veil * exitFade;
    float peak = max(col.r, max(col.g, col.b));
    // Solo: content-shaped alpha. Underlay: solid bed (no tile-shaped holes).
    float presence = mix(
      smoothstep(0.0, 0.004, peak) * alpha,
      alpha,
      step(0.5, uUnderlay)
    );

    gl_FragColor = vec4(col, presence);
  }
`;
};
