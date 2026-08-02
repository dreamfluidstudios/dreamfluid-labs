import { useEffect, type RefObject } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import {
  buildZoomBlurFragment,
  ZOOM_BLUR_VERTEX,
} from "../zoomBlur.shaders";
import { ZOOM_BLUR } from "../zoomBlur.presets";
import { CELL } from "@/components/TileField/hooks/useTileField";
import { LENS_FOCUS } from "@/components/LensField/lensField.presets";

// Viewport-fixed OGL pass (portaled to body) that samples the TileField canvas
// and applies a radial zoom blur + edge CA around the intro focus. Same
// handoff contract as useLensField: onActiveChange(true) only after WebGL is up.
//
// Focus oval matches LensField so blur falloff lines up with the copy.
// Underlay = full bed for stacking under fringe-only lens arcs.
export const useZoomBlurField = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  sourceRef: RefObject<HTMLCanvasElement | null>,
  heroRef: RefObject<HTMLElement | null>,
  focusRef: RefObject<HTMLElement | null>,
  onActiveChange?: (active: boolean) => void,
  underlay = false,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    const hero = heroRef.current;
    const focus = focusRef.current;
    if (!canvas || !source || !hero || !focus) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        canvas,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      });
    } catch {
      return;
    }
    const gl = renderer.gl;
    if (!gl || gl.isContextLost()) return;
    gl.clearColor(0, 0, 0, 0);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const texture = new Texture(gl, {
      generateMipmaps: false,
      premultiplyAlpha: false,
    });
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: ZOOM_BLUR_VERTEX,
      fragment: buildZoomBlurFragment(ZOOM_BLUR),
      uniforms: {
        tMap: { value: texture },
        uResolution: { value: [1, 1] },
        uMapSize: { value: [1, 1] },
        uCell: { value: CELL },
        uFocusCenter: { value: [0, 0] },
        uFocusRadius: { value: LENS_FOCUS.minRadius },
        uFocusStretch: { value: LENS_FOCUS.stretch },
        uBlurStrength: { value: reduced ? 0 : ZOOM_BLUR.blurStrength },
        uChroma: { value: reduced ? 0 : ZOOM_BLUR.chroma },
        uVignette: { value: ZOOM_BLUR.vignette },
        uVignetteSoft: { value: ZOOM_BLUR.vignetteSoft },
        uInnerSharp: { value: ZOOM_BLUR.innerSharp },
        uBlurRim: { value: ZOOM_BLUR.blurRim },
        uScroll: { value: 0 },
        uUnderlay: { value: underlay ? 1 : 0 },
      },
      transparent: true,
    });
    if (!program.uniformLocations) {
      program.remove();
      geometry.remove();
      return;
    }
    const mesh = new Mesh(gl, { geometry, program });

    let raf = 0;

    const syncMapSize = () => {
      const w = source.clientWidth || source.getBoundingClientRect().width;
      const h = source.clientHeight || source.getBoundingClientRect().height;
      if (w > 0 && h > 0) program.uniforms.uMapSize.value = [w, h];
    };

    // Same oval fit as useLensField.
    const updateFocus = () => {
      const rect = focus.getBoundingClientRect();
      const vh = Math.max(window.innerHeight, 1);
      const vw = Math.max(window.innerWidth, 1);
      if (rect.width <= 0 || rect.height <= 0) return;

      const aspect = vw / vh;
      const stretchT = Math.min(
        1,
        Math.max(
          0,
          (aspect - LENS_FOCUS.stretchAspectFrom) /
            (LENS_FOCUS.stretchAspectTo - LENS_FOCUS.stretchAspectFrom),
        ),
      );
      const stretch =
        LENS_FOCUS.stretchNarrow +
        (LENS_FOCUS.stretch - LENS_FOCUS.stretchNarrow) * stretchT;
      const padding = LENS_FOCUS.padding * (0.65 + 0.35 * stretchT);

      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const qcx = (cx - vw * 0.5) / vh;
      const qcy = (vh * 0.5 - cy) / vh;
      const halfW = rect.width * 0.5 / vh + padding;
      const halfH = rect.height * 0.5 / vh + padding;
      const radius = Math.max(
        LENS_FOCUS.minRadius,
        Math.sqrt((halfW / stretch) ** 2 + halfH ** 2),
      );

      program.uniforms.uFocusCenter.value = [qcx, qcy];
      program.uniforms.uFocusRadius.value = radius;
      program.uniforms.uFocusStretch.value = stretch;
    };

    const render = () => {
      updateFocus();
      if (source.width > 0 && source.height > 0) {
        texture.image = source;
        texture.needsUpdate = true;
      }
      renderer.render({ scene: mesh });
    };

    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };

    const updateScroll = () => {
      const rect = hero.getBoundingClientRect();
      const h = Math.max(rect.height, 1);
      let p = -rect.top / h;
      p = Math.min(Math.max(p, 0), 1);
      p = p * p * (3.0 - 2.0 * p);
      program.uniforms.uScroll.value = reduced ? 0 : p;
      updateFocus();
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
      syncMapSize();
      updateScroll();
      if (reduced) render();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduced && !raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    const sourceObserver = new ResizeObserver(syncMapSize);
    sourceObserver.observe(source);
    const focusObserver = new ResizeObserver(updateFocus);
    focusObserver.observe(focus);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduced) raf = requestAnimationFrame(loop);
    else render();
    onActiveChange?.(true);

    return () => {
      cancelAnimationFrame(raf);
      sourceObserver.disconnect();
      focusObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      onActiveChange?.(false);
      program.remove();
      geometry.remove();
      if (texture.texture) gl.deleteTexture(texture.texture);
    };
  }, [canvasRef, sourceRef, heroRef, focusRef, onActiveChange, underlay]);
};
