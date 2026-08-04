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

// Drives the lens canvas: an OGL pass that samples TileField's compact
// cell-state scoreboard and draws the full bed. Touch matches desktop arcs,
// but skips bed warp + chroma (cheapShaders).
//
// SCROLL LOCK — the thing this file exists to get right.
// The canvas is absolutely positioned inside the hero, in the document's
// scroll flow. It is NOT viewport-fixed. That matters because iOS scrolls the
// page on the compositor/UI thread at full display rate while JS runs on the
// main thread: anything that recomputes its on-screen position from
// window.scrollY every frame trails the DOM by however long the main thread
// took, and freezes outright whenever the main thread hitches. A fixed canvas
// drawing arcs around scrolling copy therefore *cannot* stay glued to it —
// that lag is what read as "delayed and choppy" on the phone.
//
// In flow, the compositor translates the canvas together with the copy, so the
// arcs are pixel-locked to the headline for free, at any main-thread rate.
// uFocusCenter becomes a layout-time constant (no per-frame scroll read at
// all). Only the exit spin/expand/dissolve still samples window.scrollY, and
// that one is lag-tolerant: it is a slow global transform, not a position lock,
// so a frame or two of latency is invisible.
//
// Everything else here follows from that: draws are skipped when no uniform
// actually changed, the loop is parked by IntersectionObserver when the canvas
// is off-screen, and DPR steps down on its own if frames start slipping.
//
// onActiveChange(true) fires only once WebGL is actually up, so the caller can
// keep TileField's DOM layers visible as the no-WebGL fallback until then.

// Rolling frame-gap average (ms) above which we drop a DPR step. ~45fps —
// below either a 60Hz or 120Hz target by enough to be a real problem.
const DPR_DOWNGRADE_MS = 22;
const DPR_SAMPLE_FRAMES = 48;
// A gap longer than this means the loop was parked, not slow — don't sample it.
const DPR_SAMPLE_MAX_GAP_MS = 200;

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

    // Resolution ladder. We start at the profile cap and only ever step down,
    // so a struggling device settles instead of oscillating between steps.
    const dprLadder: number[] = [];
    {
      const base = Math.min(window.devicePixelRatio || 1, profile.dprCap);
      for (const step of [base, base * 0.75, 1]) {
        const v = Math.max(1, Math.round(step * 100) / 100);
        if (!dprLadder.length || v < dprLadder[dprLadder.length - 1] - 0.01) {
          dprLadder.push(v);
        }
      }
    }
    let dprStep = 0;
    let dpr = dprLadder[0];

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
        // No depth or stencil attachment: this is one fullscreen triangle with
        // depthTest off. Skipping them saves a full-size buffer allocation,
        // which is real memory at DPR 2 on a canvas this tall.
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        // Deliberately not "high-performance" — that can force the discrete GPU
        // on dual-GPU Macs, and this is a decorative background that the
        // integrated GPU handles without noticing.
      });
    } catch {
      return;
    }
    // OGL's constructor calls setSize(300, 150), which assigns inline
    // style.width/height on our canvas. Those would beat the CSS box the
    // element is supposed to be sized by, so drop them — everything below
    // measures the element and writes only the backing store.
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");

    const gl = renderer.gl;
    if (!gl || gl.isContextLost()) return;
    gl.clearColor(0, 0, 0, 0);

    const preset = resolveLensPreset();
    // overlay=true: stacked zoom path (arcs only). Solo lens always draws the
    // full bed — touch included — so arcs match desktop. Touch only drops
    // bed warp + chroma via cheapShaders.
    const arcsOnly = overlay;
    const blend = resolveLensBlend(arcsOnly);
    const bulge = arcsOnly ? 1 : preset.bulge;
    const chroma = arcsOnly || profile.cheapShaders ? 0 : preset.chroma;
    const warp = arcsOnly || profile.cheapShaders ? 0 : preset.warp;
    const grainAmount =
      arcsOnly || profile.cheapShaders ? 0 : LENS_GRAIN.amount;
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
        uUnit: { value: 1 },
        uMapSize: { value: [1, 1] },
        uCell: { value: CELL },
        uWarp: { value: warp },
        uBulge: { value: bulge },
        uChroma: { value: chroma },
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
        uGrainAmount: { value: grainAmount },
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
    let onScreen = true;
    // Set whenever a uniform actually changes. Frames that would redraw an
    // identical image are skipped — at rest the lens costs nothing.
    let needsDraw = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let pointerTime = performance.now();
    let lastPointerMove = performance.now();
    let driftMix = 0;
    let lastScroll = -1;
    const grainStarted = performance.now();
    let drawGapStart = 0;
    let drawGapFrames = 0;
    let lastDrawAt = 0;

    // Document/box-space layout, refreshed only on resize. Nothing here is
    // scroll-dependent any more: the canvas shares the hero's containing block,
    // so the focus oval sits at a fixed offset within it.
    const layout = {
      heroTop: 0,
      heroHeight: 1,
      canvasW: 1,
      canvasH: 1,
      // CSS px per ring unit. The hero's own height, not innerHeight — on iOS
      // innerHeight shrinks when the URL bar collapses mid-scroll, which would
      // resize the ring while you scroll.
      unit: 1,
    };

    const setBackingSize = () => {
      const bw = Math.max(Math.round(layout.canvasW * dpr), 1);
      const bh = Math.max(Math.round(layout.canvasH * dpr), 1);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        // Force OGL to re-issue gl.viewport — resizing the drawing buffer does
        // not reset it, and OGL caches the last values.
        renderer.state.viewport.width = null;
        renderer.state.viewport.height = null;
      }
      // Assign directly instead of renderer.setSize(): setSize writes inline
      // style.width/height, which would fight the CSS box we measure from.
      renderer.dpr = dpr;
      renderer.width = bw / dpr;
      renderer.height = bh / dpr;
      program.uniforms.uResolution.value = [layout.canvasW, layout.canvasH];
      program.uniforms.uUnit.value = Math.max(layout.unit, 1);
      needsDraw = true;
    };

    // CSS px of the TileField box — must match the sim's cell phase, not any
    // device-pixel bitmap size (state-only mode uses a 1×1 canvas).
    const syncMapSize = () => {
      const w = source.clientWidth || source.getBoundingClientRect().width;
      const h = source.clientHeight || source.getBoundingClientRect().height;
      if (w > 0 && h > 0) {
        program.uniforms.uMapSize.value = [w, h];
        needsDraw = true;
      }
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
      needsDraw = true;
    };

    // Fit the content oval to the intro copy. Purely a layout read — the result
    // holds for every scroll position, because canvas and copy scroll together.
    const captureLayout = () => {
      const sy = window.scrollY;
      const heroRect = hero.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const focusRect = focus.getBoundingClientRect();

      layout.heroTop = heroRect.top + sy;
      layout.heroHeight = Math.max(heroRect.height, 1);
      layout.canvasW = Math.max(canvasRect.width, 1);
      layout.canvasH = Math.max(canvasRect.height, 1);
      layout.unit = Math.max(heroRect.height, 1);

      const unit = layout.unit;
      // Ring stretch still keys off the *viewport* shape — it is about how the
      // copy reads on screen, not how tall the overhanging canvas is.
      const aspect =
        Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1);
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

      if (focusRect.width <= 0 || focusRect.height <= 0) return;

      // Focus centre as an offset from the canvas centre, in ring units.
      const cx = focusRect.left - canvasRect.left + focusRect.width * 0.5;
      const cy = focusRect.top - canvasRect.top + focusRect.height * 0.5;
      const qcx = (cx - layout.canvasW * 0.5) / unit;
      const qcy = (layout.canvasH * 0.5 - cy) / unit;

      const halfW = (focusRect.width * 0.5) / unit + padding;
      const halfH = (focusRect.height * 0.5) / unit + padding;
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
      needsDraw = true;
    };

    // scrollY vs cached hero top — the only per-frame scroll read left, and the
    // only thing it drives is the slow exit spin/expand/dissolve.
    const sampleScroll = () => {
      const raw = Math.min(
        Math.max((window.scrollY - layout.heroTop) / layout.heroHeight, 0),
        1,
      );
      const eased = reduced ? 0 : raw * raw * (3.0 - 2.0 * raw);
      if (Math.abs(eased - lastScroll) > 0.0002) {
        lastScroll = eased;
        program.uniforms.uScroll.value = eased;
        needsDraw = true;
      }
      return raw;
    };

    const render = () => {
      needsDraw = false;
      renderer.render({ scene: mesh });

      // Adaptive resolution: watch the gap between consecutive draws while the
      // lens is actually animating and step DPR down if we are slipping.
      if (dprStep < dprLadder.length - 1) {
        const now = performance.now();
        const gap = now - lastDrawAt;
        lastDrawAt = now;
        if (gap > 0 && gap < DPR_SAMPLE_MAX_GAP_MS) {
          if (drawGapFrames === 0) drawGapStart = now - gap;
          drawGapFrames++;
          if (drawGapFrames >= DPR_SAMPLE_FRAMES) {
            const avg = (now - drawGapStart) / drawGapFrames;
            drawGapFrames = 0;
            if (avg > DPR_DOWNGRADE_MS) {
              dprStep++;
              dpr = dprLadder[dprStep];
              setBackingSize();
            }
          }
        } else {
          drawGapFrames = 0;
        }
      }
    };

    // Per-frame animated inputs (pointer easing, idle drift, grain). None of
    // these exist on touch, which is why the phone settles to zero draws.
    const stepMotion = (now: number) => {
      const dt = Math.min(0.05, (now - pointerTime) / 1000);
      pointerTime = now;
      if (reduced) return;

      // Idle Lissajous folds into the catch-up *target*, so the ring yields
      // into drift (and back to the mouse) with the same lag as a cursor
      // re-entering from off-screen. Desktop / fine-pointer only.
      let driftX = 0;
      let driftY = 0;
      if (idleDrift && LENS_DRIFT.amplitude > 0) {
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

      const s = finePointer ? LENS_POINTER.follow : 0;
      const targetX = pointer.tx * s + driftX;
      const targetY = pointer.ty * s + driftY;
      const k = 1 - Math.exp(-dt / Math.max(LENS_POINTER.catchUp, 0.001));
      const nextX = pointer.x + (targetX - pointer.x) * k;
      const nextY = pointer.y + (targetY - pointer.y) * k;
      if (
        Math.abs(nextX - pointer.x) > 1e-5 ||
        Math.abs(nextY - pointer.y) > 1e-5
      ) {
        pointer.x = nextX;
        pointer.y = nextY;
        program.uniforms.uPointer.value = [pointer.x, pointer.y];
        needsDraw = true;
      }

      if (grainAmount > 0 && LENS_GRAIN.fps > 0) {
        const frame = Math.floor(((now - grainStarted) / 1000) * LENS_GRAIN.fps);
        if (frame !== program.uniforms.uTime.value) {
          program.uniforms.uTime.value = frame;
          needsDraw = true;
        }
      }
    };

    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      drawGapFrames = 0;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      sampleScroll();
      stepMotion(performance.now());
      // Arcs-only never samples the bed — skip scoreboard uploads there.
      if (!arcsOnly) syncTileState();
      if (needsDraw) render();
    };

    const ensureLoop = () => {
      if (reduced || document.hidden || !onScreen || raf) return;
      pointerTime = performance.now();
      lastDrawAt = performance.now();
      drawGapFrames = 0;
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

    // Only needed to restart a loop parked by IntersectionObserver at the exact
    // moment the canvas re-enters; the running loop samples scroll itself.
    const onScroll = () => {
      if (!raf) ensureLoop();
    };

    // Box changes come from the canvas's own ResizeObserver, so this only has
    // to re-derive the focus fit. Notably it does NOT run on iOS URL-bar
    // collapse, because nothing here is keyed to window.innerHeight.
    const relayout = () => {
      syncMapSize();
      captureLayout();
      setBackingSize();
      sampleScroll();
      render();
      ensureLoop();
    };

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else ensureLoop();
    };

    relayout();

    const sourceObserver = new ResizeObserver(() => {
      syncMapSize();
      captureLayout();
    });
    sourceObserver.observe(source);
    // The canvas box drives the backing store; the hero drives the ring unit;
    // the focus box drives the oval fit. All three are layout-rate, not
    // scroll-rate.
    const canvasObserver = new ResizeObserver(relayout);
    canvasObserver.observe(canvas);
    const focusObserver = new ResizeObserver(() => {
      captureLayout();
      ensureLoop();
    });
    focusObserver.observe(focus);
    const heroObserver = new ResizeObserver(() => {
      captureLayout();
      ensureLoop();
    });
    heroObserver.observe(hero);

    // Park the loop entirely once the lens has scrolled out of range.
    const visibility = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) ensureLoop();
        else stopLoop();
      },
      { rootMargin: "20% 0px" },
    );
    visibility.observe(canvas);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    // Hold the last pointer pose when the cursor leaves the page — no snap
    // back to center.
    if (finePointer && !reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
    if (!reduced) ensureLoop();
    onActiveChange?.(true);

    return () => {
      stopLoop();
      sourceObserver.disconnect();
      canvasObserver.disconnect();
      focusObserver.disconnect();
      heroObserver.disconnect();
      visibility.disconnect();
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
