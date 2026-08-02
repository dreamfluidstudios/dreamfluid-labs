import { useEffect, type RefObject } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import {
  buildZoomBlurFragment,
  ZOOM_BLUR_VERTEX,
} from "../zoomBlur.shaders";
import { ZOOM_BLUR } from "../zoomBlur.presets";
import { CELL } from "@/components/TileField/hooks/useTileField";
import { LENS_FOCUS } from "@/components/LensField/lensField.presets";
import { resolveDeviceProfile } from "@/utils/deviceProfile";

// Viewport-fixed OGL pass (portaled to body) that samples the TileField canvas
// and applies a radial zoom blur + edge CA around the intro focus. Same
// handoff contract as useLensField: onActiveChange(true) only after WebGL is up.
//
// Focus oval matches LensField so blur falloff lines up with the copy.
// Budgets (DPR, FPS, samples) follow resolveDeviceProfile.
export const useZoomBlurField = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  sourceRef: RefObject<HTMLCanvasElement | null>,
  heroRef: RefObject<HTMLElement | null>,
  focusRef: RefObject<HTMLElement | null>,
  onActiveChange?: (active: boolean) => void,
  // Kept for a future stacked lens path; unused while both-mode is shelved.
  underlay = false,
  sourceDirtyRef?: RefObject<boolean>,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    const hero = heroRef.current;
    const focus = focusRef.current;
    if (!canvas || !source || !hero || !focus) return;

    const profile = resolveDeviceProfile();
    const reduced = profile.reducedMotion;
    const dpr = Math.min(window.devicePixelRatio || 1, profile.dprCap);
    const frameInterval = 1000 / Math.max(profile.targetFps, 1);
    const preset = {
      ...ZOOM_BLUR,
      samples: profile.zoomSamples,
      chroma: profile.cheapShaders ? 0 : ZOOM_BLUR.chroma,
    };

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        canvas,
        dpr,
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

    const texture = new Texture(gl, {
      generateMipmaps: false,
      premultiplyAlpha: false,
    });
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: ZOOM_BLUR_VERTEX,
      fragment: buildZoomBlurFragment(preset),
      uniforms: {
        tMap: { value: texture },
        uResolution: { value: [1, 1] },
        uMapSize: { value: [1, 1] },
        uCell: { value: CELL },
        uFocusCenter: { value: [0, 0] },
        uFocusRadius: { value: LENS_FOCUS.minRadius },
        uFocusStretch: { value: LENS_FOCUS.stretch },
        uBlurStrength: { value: reduced ? 0 : preset.blurStrength },
        uChroma: { value: reduced ? 0 : preset.chroma },
        uVignette: { value: preset.vignette },
        uVignetteSoft: { value: preset.vignetteSoft },
        uInnerSharp: { value: preset.innerSharp },
        uBlurRim: { value: preset.blurRim },
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
    let lastDraw = 0;
    let heroOffscreen = false;

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

    const sampleScroll = () => {
      const rect = hero.getBoundingClientRect();
      const h = Math.max(rect.height, 1);
      const raw = Math.min(Math.max(-rect.top / h, 0), 1);
      const eased = raw * raw * (3.0 - 2.0 * raw);
      program.uniforms.uScroll.value = reduced ? 0 : eased;
      return raw;
    };

    const render = () => {
      updateFocus();
      if (source.width > 0 && source.height > 0) {
        const dirty = !sourceDirtyRef || sourceDirtyRef.current;
        if (dirty) {
          texture.image = source;
          texture.needsUpdate = true;
          if (sourceDirtyRef) sourceDirtyRef.current = false;
        }
      }
      renderer.render({ scene: mesh });
    };

    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const loop = () => {
      raf = 0;
      if (document.hidden) return;

      const raw = sampleScroll();
      if (!reduced && raw >= 1) {
        if (!heroOffscreen) {
          heroOffscreen = true;
          render();
        }
        return;
      }
      heroOffscreen = false;

      const now = performance.now();
      if (now - lastDraw >= frameInterval) {
        lastDraw = now;
        render();
      }
      raf = requestAnimationFrame(loop);
    };

    const ensureLoop = () => {
      if (reduced || document.hidden || raf) return;
      lastDraw = 0;
      raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      if (heroOffscreen || !raf) ensureLoop();
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // setSize clears the drawing buffer — paint immediately (see useLensField).
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
      syncMapSize();
      sampleScroll();
      updateFocus();
      lastDraw = performance.now();
      render();
      if (!reduced) ensureLoop();
    };

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else ensureLoop();
    };

    resize();
    const sourceObserver = new ResizeObserver(syncMapSize);
    sourceObserver.observe(source);
    const focusObserver = new ResizeObserver(updateFocus);
    focusObserver.observe(focus);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduced) ensureLoop();
    else render();
    onActiveChange?.(true);

    return () => {
      stopLoop();
      sourceObserver.disconnect();
      focusObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      onActiveChange?.(false);
      program.remove();
      geometry.remove();
      if (texture.texture) gl.deleteTexture(texture.texture);
    };
  }, [
    canvasRef,
    sourceRef,
    heroRef,
    focusRef,
    onActiveChange,
    underlay,
    sourceDirtyRef,
  ]);
};
