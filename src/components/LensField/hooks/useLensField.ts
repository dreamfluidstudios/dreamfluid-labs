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

// Drives the lens canvas: a viewport-fixed OGL pass (portaled to body).
// Desktop samples TileField's cell-state scoreboard and draws the full bed.
// Touch is arcs-only (uOverlay) — DOM TileField keeps the grid/tiles, GL only
// paints the fringe so we skip per-pixel scene() on phones.
//
// Scroll progress from the hero spins/expands the ring; arc radii track an
// oval fitted to focusRef. Budgets (DPR, drift, cheap shaders) come from
// resolveDeviceProfile.
//
// onActiveChange(true) fires only once WebGL is actually up, so the caller can
// keep TileField's DOM layers visible as the no-WebGL / arcs-only bed.
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
    // overlay=true: arcs-only (touch hero bed, or stacked zoom). Caller owns
    // the flag so DOM visibility and the shader path can't disagree.
    const arcsOnly = overlay;
    const blend = resolveLensBlend(arcsOnly);
    // Arcs-only: no extra warp halo (bulge 1 = same width as fringe).
    const bulge = arcsOnly ? 1 : preset.bulge;
    const chroma = arcsOnly || profile.cheapShaders ? 0 : preset.chroma;
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
        uChroma: { value: chroma },
        uTintOuter: { value: preset.tintOuter },
        uTintInner: { value: preset.tintInner },
        // Arcs-only has no in-shader bed under the ridge — lift the fringe
        // a touch so it matches the desktop solo read.
        uTintStrength: {
          value: arcsOnly ? preset.tintStrength * 1.25 : preset.tintStrength,
        },
        uScroll: { value: 0 },
        // Touch: gentler exit so compositor/JS desync is less obvious.
        uScrollRotate: {
          value: profile.touch ? LENS_SCROLL.rotate * 0.55 : LENS_SCROLL.rotate,
        },
        uScrollExpand: {
          value: profile.touch ? LENS_SCROLL.expand * 0.65 : LENS_SCROLL.expand,
        },
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
    // Arcs-only + add: write unpremultiplied fringe with ONE,ZERO so the
    // browser's source-over soft-composites over the DOM bed (SRC_ALPHA,ONE
    // into the FB stored dark×high-alpha skirts → black rims on the page).
    if (blend === "add" && arcsOnly) {
      program.setBlendFunc(gl.ONE, gl.ZERO);
    } else if (blend === "add") {
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

    // Document-space layout, refreshed on resize — scroll frames only read
    // window.scrollY (no getBoundingClientRect thrash on the hot path).
    const layout = {
      heroTop: 0,
      heroHeight: 1,
      focusCx: 0,
      focusCy: 0,
      focusW: 0,
      focusH: 0,
      vw: 1,
      vh: 1,
      stretch: LENS_FOCUS.stretch,
      padding: LENS_FOCUS.padding,
    };

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

    const captureLayout = () => {
      const sy = window.scrollY;
      const sx = window.scrollX;
      const heroRect = hero.getBoundingClientRect();
      const focusRect = focus.getBoundingClientRect();
      layout.heroTop = heroRect.top + sy;
      layout.heroHeight = Math.max(heroRect.height, 1);
      layout.focusW = focusRect.width;
      layout.focusH = focusRect.height;
      layout.focusCx = focusRect.left + sx + focusRect.width * 0.5;
      layout.focusCy = focusRect.top + sy + focusRect.height * 0.5;
      layout.vw = Math.max(window.innerWidth, 1);
      layout.vh = Math.max(window.innerHeight, 1);
      const aspect = layout.vw / layout.vh;
      const stretchT = Math.min(
        1,
        Math.max(
          0,
          (aspect - LENS_FOCUS.stretchAspectFrom) /
            (LENS_FOCUS.stretchAspectTo - LENS_FOCUS.stretchAspectFrom),
        ),
      );
      layout.stretch =
        LENS_FOCUS.stretchNarrow +
        (LENS_FOCUS.stretch - LENS_FOCUS.stretchNarrow) * stretchT;
      layout.padding = LENS_FOCUS.padding * (0.65 + 0.35 * stretchT);
    };

    // Fit the content oval from cached document coords + current scroll.
    const updateFocus = () => {
      if (layout.focusW <= 0 || layout.focusH <= 0) return;
      const { vw, vh, stretch, padding, focusW, focusH } = layout;
      const cx = layout.focusCx - window.scrollX;
      const cy = layout.focusCy - window.scrollY;
      const qcx = (cx - vw * 0.5) / vh;
      const qcy = (vh * 0.5 - cy) / vh;
      const halfW = focusW * 0.5 / vh + padding;
      const halfH = focusH * 0.5 / vh + padding;
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

    // scrollY vs cached hero top — avoids layout reads every rAF.
    // Returns raw 0..1 progress before smoothstep (for off-screen pause).
    const sampleScroll = () => {
      const raw = Math.min(
        Math.max((window.scrollY - layout.heroTop) / layout.heroHeight, 0),
        1,
      );
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
      // a resize can't leave a transparent flash until the next tick.
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
      syncMapSize();
      captureLayout();
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
    const focusObserver = new ResizeObserver(() => {
      captureLayout();
      updateFocus();
    });
    focusObserver.observe(focus);
    // Hero height can change with URL-bar / dynamic type — keep scroll math honest.
    const heroObserver = new ResizeObserver(() => {
      captureLayout();
    });
    heroObserver.observe(hero);
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
      heroObserver.disconnect();
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
