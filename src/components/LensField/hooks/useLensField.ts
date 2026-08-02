import { useEffect, type RefObject } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import { buildLensFragment, LENS_VERTEX } from "../lensField.shaders";
import {
  LENS_ARCS,
  LENS_BLEND_CODE,
  LENS_DRIFT,
  LENS_FOCUS,
  LENS_GRAIN,
  LENS_POINTER,
  LENS_SCROLL,
  resolveLensBlend,
  resolveLensPreset,
} from "../lensField.presets";
import {
  CELL,
  type TileStateMap,
} from "@/components/TileField/hooks/useTileField";
import { resolveDeviceProfile } from "@/utils/deviceProfile";

// Drives the lens canvas: a viewport-fixed OGL pass (portaled to body) that
// samples TileField's compact cell-state scoreboard. Sized from the window;
// scroll progress from the hero section so the ring can spin/expand until that
// section leaves the viewport. Arc radii track an oval fitted to focusRef
// (intro copy + CTAs) so the ring surrounds the text on any viewport.
//
// Cell-map uploads are versioned — the GPU keeps the last scoreboard while
// TileField is static; only sim changes trigger a re-upload. Budgets (DPR,
// FPS, drift) come from resolveDeviceProfile.
//
// onActiveChange(true) fires only once WebGL is actually up, so the caller can
// keep TileField's DOM layers visible as the no-WebGL fallback until then.
export const useLensField = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  sourceRef: RefObject<HTMLCanvasElement | null>,
  heroRef: RefObject<HTMLElement | null>,
  focusRef: RefObject<HTMLElement | null>,
  onActiveChange?: (active: boolean) => void,
  // Kept for a future stacked zoom path; unused while both-mode is shelved.
  overlay = false,
  tileStateRef?: RefObject<TileStateMap | null>,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    const hero = heroRef.current;
    const focus = focusRef.current;
    if (!canvas || !source || !hero || !focus) return;

    const profile = resolveDeviceProfile();
    const reduced = profile.reducedMotion;
    const finePointer = profile.enablePointerParallax;
    const idleDrift = profile.enableIdleDrift;
    const dpr = Math.min(window.devicePixelRatio || 1, profile.dprCap);
    // 0 = every rAF (match display). Positive values throttle for budgets.
    const frameInterval =
      profile.targetFps > 0 ? 1000 / profile.targetFps : 0;

    // Transparent clear so empty lens areas composite over later sections.
    // Straight (non-premultiplied) alpha: OGL's transparent programs blend with
    // SRC_ALPHA / ONE_MINUS_SRC_ALPHA, which would square a premultiplied
    // output and crush the fringe brightness.
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

    const preset = resolveLensPreset();
    // Same full lens pass on mobile and desktop. Touch still gets cheaper
    // budgets via profile (DPR/FPS, grain off, no pointer/drift). Chroma stays
    // on — the tiny cell-state upload makes the extra samples affordable.
    const arcsOnly = overlay;
    const blend = resolveLensBlend(arcsOnly);
    // Stacked with zoom: no extra warp halo (bulge 1 = same width as fringe).
    const bulge = arcsOnly ? 1 : preset.bulge;
    const tileTexture = new Texture(gl, {
      generateMipmaps: false,
      premultiplyAlpha: false,
      flipY: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      width: 1,
      height: 1,
      image: new Uint8Array([0, 0, 0, 0]),
    });
    let uploadedVersion = -1;
    let uploadedCols = 1;
    let uploadedRows = 1;
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: LENS_VERTEX,
      fragment: buildLensFragment(LENS_ARCS),
      uniforms: {
        tTileState: { value: tileTexture },
        uTileStateSize: { value: [1, 1] },
        uResolution: { value: [1, 1] },
        uMapSize: { value: [1, 1] },
        uCell: { value: CELL },
        uWarp: { value: arcsOnly ? 0 : preset.warp },
        uBulge: { value: bulge },
        uChroma: {
          value: arcsOnly ? 0 : preset.chroma,
        },
        uTintOuter: { value: preset.tintOuter },
        uTintInner: { value: preset.tintInner },
        uTintStrength: { value: preset.tintStrength },
        uScroll: { value: 0 },
        uScrollRotate: { value: LENS_SCROLL.rotate },
        uScrollExpand: { value: LENS_SCROLL.expand },
        uPointer: { value: [0, 0] },
        uPointerParallax: {
          value: finePointer ? LENS_POINTER.parallax : 0,
        },
        uPointerTilt: { value: finePointer ? LENS_POINTER.tilt : 0 },
        uPointerRotate: { value: finePointer ? LENS_POINTER.rotate : 0 },
        uGrainAmount: {
          value: arcsOnly || profile.cheapShaders ? 0 : LENS_GRAIN.amount,
        },
        uGrainScale: { value: LENS_GRAIN.scale },
        uTime: { value: 0 },
        uFocusCenter: { value: [0, 0] },
        uFocusRadius: { value: LENS_FOCUS.minRadius },
        uFocusStretch: { value: LENS_FOCUS.stretch },
        uArcScale: { value: 1 },
        uOverlay: { value: arcsOnly ? 1 : 0 },
        uBlend: { value: LENS_BLEND_CODE[blend] },
      },
      transparent: true,
    });
    // OGL leaves uniformLocations unset when the program fails to link (it only
    // console.warns) and then throws inside every render — bail to the DOM
    // fallback instead. In practice this only trips on a lost/dead context.
    if (!program.uniformLocations) {
      program.remove();
      geometry.remove();
      return;
    }

    // Fringe as light over a surface — see ?blend= and resolveLensBlend.
    // normal/soft: standard alpha over. add: light pile-up. screen: ONE /
    // ONE_MINUS_SRC_COLOR approximation of CSS screen.
    if (blend === "add") {
      program.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
    } else if (blend === "screen") {
      program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    } else {
      program.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    program.depthTest = false;

    const mesh = new Mesh(gl, { geometry, program });

    let raf = 0;
    let lastDraw = 0;
    let heroOffscreen = false;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let pointerTime = performance.now();
    let lastPointerMove = performance.now();
    let driftMix = 0;
    const grainStarted = performance.now();

    // CSS px of the TileField box — must match the sim's cell phase, not any
    // device-pixel bitmap size (state-only mode uses a 1×1 canvas).
    const syncMapSize = () => {
      const w = source.clientWidth || source.getBoundingClientRect().width;
      const h = source.clientHeight || source.getBoundingClientRect().height;
      if (w > 0 && h > 0) program.uniforms.uMapSize.value = [w, h];
    };

    const syncTileState = () => {
      const map = tileStateRef?.current;
      if (!map || map.cols <= 0 || map.rows <= 0) return;
      program.uniforms.uTileStateSize.value = [map.cols, map.rows];
      if (map.version === uploadedVersion) return;
      // Reallocate GPU storage when the grid dimensions change.
      if (map.cols !== uploadedCols || map.rows !== uploadedRows) {
        tileTexture.width = map.cols;
        tileTexture.height = map.rows;
        uploadedCols = map.cols;
        uploadedRows = map.rows;
      }
      tileTexture.image = map.data;
      tileTexture.needsUpdate = true;
      uploadedVersion = map.version;
    };

    // Fit the content oval to the intro focus box in the same q-space the
    // shader uses: q = ((px - vw/2) / vh, (vh/2 - py) / vh). Stretch eases
    // down on tall/narrow viewports; arc gap/thickness scale with radius.
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
      const arcScale = Math.min(
        LENS_FOCUS.scaleMax,
        Math.max(LENS_FOCUS.scaleMin, radius / LENS_FOCUS.refRadius),
      );

      program.uniforms.uFocusCenter.value = [qcx, qcy];
      program.uniforms.uFocusRadius.value = radius;
      program.uniforms.uFocusStretch.value = stretch;
      program.uniforms.uArcScale.value = arcScale;
    };

    // Sample every frame (not only on scroll events) so fixed WebGL stays
    // locked to the page on phones where scroll events lag the compositor.
    // Returns raw 0..1 progress before smoothstep (for off-screen pause).
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
      const now = performance.now();
      const dt = Math.min(0.05, (now - pointerTime) / 1000);
      pointerTime = now;

      // Idle Lissajous folds into the catch-up *target*, so the ring yields
      // into drift (and back to the mouse) with the same lag as a cursor
      // re-entering from off-screen. Desktop / fine-pointer only.
      let driftX = 0;
      let driftY = 0;
      if (!reduced && idleDrift && LENS_DRIFT.amplitude > 0) {
        const idleSec = (now - lastPointerMove) / 1000;
        const want = idleSec > LENS_DRIFT.idleAfter ? 1 : 0;
        const tau = want > driftMix ? LENS_DRIFT.blendIn : LENS_DRIFT.blendOut;
        driftMix +=
          (want - driftMix) * (1 - Math.exp(-dt / Math.max(tau, 0.001)));
        if (driftMix > 0.001) {
          const t = (now - grainStarted) / 1000;
          const a = LENS_DRIFT.amplitude * driftMix;
          driftX = Math.sin(t * Math.PI * 2 * LENS_DRIFT.freqX) * a;
          driftY =
            Math.sin(t * Math.PI * 2 * LENS_DRIFT.freqY + LENS_DRIFT.phaseY) *
            a;
        }
      }

      if (!reduced) {
        const s = finePointer ? LENS_POINTER.follow : 0;
        const targetX = pointer.tx * s + driftX;
        const targetY = pointer.ty * s + driftY;
        const k =
          1 - Math.exp(-dt / Math.max(LENS_POINTER.catchUp, 0.001));
        pointer.x += (targetX - pointer.x) * k;
        pointer.y += (targetY - pointer.y) * k;
        program.uniforms.uPointer.value = [pointer.x, pointer.y];
      }

      if (!reduced && !profile.cheapShaders && LENS_GRAIN.fps > 0) {
        program.uniforms.uTime.value =
          ((now - grainStarted) / 1000) * LENS_GRAIN.fps;
      }
      // Arcs-only never samples the bed — skip scoreboard uploads there.
      if (!arcsOnly) syncTileState();
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
      if (frameInterval <= 0 || now - lastDraw >= frameInterval) {
        lastDraw = now;
        render();
      }
      raf = requestAnimationFrame(loop);
    };

    const ensureLoop = () => {
      if (reduced || document.hidden || raf) return;
      pointerTime = performance.now();
      lastDraw = 0;
      raf = requestAnimationFrame(loop);
    };

    const onPointerMove = (e: PointerEvent) => {
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      const pad = LENS_POINTER.edgePad;
      // Drop leave-edge samples so the target doesn't spike when the cursor
      // exits; the ring keeps easing toward the last in-bounds pose.
      if (
        e.clientX < pad ||
        e.clientY < pad ||
        e.clientX > w - pad ||
        e.clientY > h - pad
      ) {
        return;
      }
      pointer.tx = (e.clientX / w) * 2 - 1;
      pointer.ty = -((e.clientY / h) * 2 - 1);
      lastPointerMove = performance.now();
    };

    const onScroll = () => {
      // Wake the loop when the hero re-enters after an off-screen pause.
      // Live sampling still happens inside rAF while the loop is running.
      if (heroOffscreen || !raf) ensureLoop();
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // setSize clears the drawing buffer — paint this frame immediately so
      // touch's 30fps budget can't leave a transparent flash until the next tick.
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
    // Hold the last pointer pose when the cursor leaves the page — no snap
    // back to center.
    if (finePointer && !reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
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
      window.removeEventListener("pointermove", onPointerMove);
      onActiveChange?.(false);
      // Delete the GL resources but keep the context alive: React StrictMode
      // remounts reuse the same canvas, and a deliberately-lost context would
      // poison the second mount (getContext returns the dead context, shaders
      // silently fail to link). A truly unmounted canvas takes its context
      // with it when collected.
      program.remove();
      geometry.remove();
      if (tileTexture.texture) gl.deleteTexture(tileTexture.texture);
    };
  }, [
    canvasRef,
    sourceRef,
    heroRef,
    focusRef,
    onActiveChange,
    overlay,
    tileStateRef,
  ]);
};
