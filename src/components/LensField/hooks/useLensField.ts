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
  resolveLensScrollExit,
} from "../lensField.presets";
import {
  CELL,
  type TileStateMap,
} from "@/components/TileField/hooks/useTileField";
import { resolveDeviceProfile } from "@/utils/deviceProfile";

// Drives the lens canvas: an OGL pass that samples TileField's compact
// cell-state scoreboard and draws the full bed. Touch matches desktop arcs and
// keeps bed warp + grain; only the chroma samples are dropped (cheapShaders).
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

// Adaptive resolution. We watch the gap between consecutive draws and drop a
// DPR step when we are consistently slipping behind the display.
//
// The threshold has to be relative to the display, not absolute. This used to
// be a flat 22ms ("~45fps"), which is a 60Hz assumption: on a 120Hz phone the
// budget is 8.3ms, so a lens pinned at a solid 60fps — visibly half-rate
// against a compositor scrolling at 120 — sat at 16.7ms and never tripped it.
// The one device class most likely to need the ladder was the one that could
// never reach it.
//
// So measure the actual refresh interval and scale from there. Slipping past
// ~1.7 frames of budget means we are missing roughly every other frame, which
// is the point where it reads as stutter rather than as a hitch.
const DPR_SLIP_FACTOR = 1.7;
// 48 frames was ~1s of sustained slowness before reacting, and a flick is over
// by then. 20 still averages out single hitches but lands inside one scroll.
const DPR_SAMPLE_FRAMES = 20;
// A gap longer than this means the loop was parked, not slow — don't sample it.
const DPR_SAMPLE_MAX_GAP_MS = 200;

// Refresh estimate: the median rAF gap over a window, kept as a running
// minimum across windows.
//
// Median rather than the raw minimum because a single sample is a fragile
// thing to hang a threshold on — real hardware fires catch-up frames right
// after a long one, and one anomalously short gap would drag the estimate
// under the true refresh and make healthy frames look like slippage. Running
// minimum *across* windows because the page may be busy at load and idle
// later; the best window seen is the honest read on what the display can do.
const REFRESH_WINDOW_FRAMES = 30;
// Estimate bounds. The slow end is the load-bearing one: never assume the
// display is worse than 60Hz. Without that, a device that has been slow since
// its very first frame folds its own slowness into the estimate and gets a
// threshold it can never fail — the ladder would sit there while the thing
// stutters. Clamping at 60Hz means the worst case is still a 28ms limit, which
// a 30fps cadence trips.
//
// The fast end stops at 120Hz deliberately, rather than tracking a 165/240Hz
// panel all the way down. The ladder's only lever is resolution, so chasing
// frames above 120 means trading visible sharpness for rate nobody asked for —
// a 165Hz monitor would drop the lens to DPR 1 purely for failing to sustain
// 165fps. Clamping here caps the demand at "roughly 70fps or better".
const REFRESH_FASTEST_MS = 8.33;
const REFRESH_SLOWEST_MS = 16.7;
// uScroll at which the shader's exit fade has fully dissolved the lens. Past
// this the canvas is transparent everywhere, so it stops being drawn *and*
// stops being composited — see setHidden.
const EXIT_HIDDEN_AT = 0.98;
// Quantisation of the exit progress, in steps across the whole 0→1 range.
// Every distinct value is one full-canvas redraw, so this is a direct cap on
// how many the exit can cost. 512 puts a step at ~0.15° of ring rotation —
// sub-pixel at the arc radius, and far below what a display can resolve.
const EXIT_STEPS = 512;

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
    // Scroll-driven exit. Off on touch — see resolveLensScrollExit for why this
    // one flag is the difference between redrawing every scroll frame and
    // drawing once for the life of the page.
    const scrollExit = resolveLensScrollExit(profile.touch);

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
    // full bed — touch included — so arcs match desktop. Touch only drops the
    // chroma samples via cheapShaders.
    const arcsOnly = overlay;
    const blend = resolveLensBlend(arcsOnly);
    const bulge = arcsOnly ? 1 : preset.bulge;
    // Chroma is the only one of these three that costs fill rate: uChroma > 0
    // takes the shader's three-sample branch, so the bed is sampled 3× on every
    // fragment of the canvas — including the large majority where dispUv is
    // zero and all three samples return the same texel. Still off on touch.
    const chroma = arcsOnly || profile.cheapShaders ? 0 : preset.chroma;
    // Warp and grain are NOT gated on cheapShaders, because neither is a
    // meaningful cost:
    //
    //   warp  — arcContrib accumulates `disp` whether uWarp is 0 or not (it is
    //           a multiply either way), dispUv is derived regardless, and the
    //           bed is still one scene() call. Enabling it changes where the
    //           sample reads from, not how much work happens. Identical
    //           instruction count; the only difference is slightly less
    //           coherent texture fetches, against a cols×rows scoreboard small
    //           enough to sit in cache.
    //   grain — one hash, gated in-shader on fringePeak > 0 so it only runs on
    //           pixels the arcs actually light, and LENS_GRAIN.fps is 0 so the
    //           pattern never reshuffles.
    //
    // They were switched off with chroma because one flag covered all three,
    // not because they were measured as expensive. Warp is also the effect that
    // makes this read as a lens rather than as glowing arcs, so it is the last
    // thing that should have been traded away on the platform that shows the
    // arcs largest relative to the copy.
    const warp = arcsOnly ? 0 : preset.warp;
    const grainAmount = arcsOnly ? 0 : LENS_GRAIN.amount;
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
    // True once the shader's exit fade has bottomed out — see setHidden.
    let hidden = false;
    const grainStarted = performance.now();
    let drawGapStart = 0;
    let drawGapFrames = 0;
    let lastDrawAt = 0;
    // Display refresh estimate, sampled from the rAF cadence in loop(). This is
    // measured on *every* frame, not only frames that drew: the loop requests
    // the next rAF unconditionally, so its cadence is the display's rate even
    // while draws are being skipped. That is what makes the floor meaningful —
    // the cheapest frames are the ones that reveal the true interval.
    let refreshMs = 0;
    const refreshWindow: number[] = [];
    let lastFrameAt = 0;

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
      // Scroll distance the exit is spread over. Normally the hero's height —
      // the exit is "the hero leaving" — but capped at what the document can
      // actually scroll. See captureLayout.
      exitSpan: 1,
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

      // The exit is authored as "the hero scrolling away", so its natural span
      // is the hero's height. On a short document that span does not exist:
      // this page is ~1.7 viewports tall on a phone, so scrolling bottoms out
      // with the hero only ~73% gone. Progress then peaked around 0.82, the
      // shader's exitFade never reached zero, and the lens sat there a quarter
      // visible at the end of the page — never finishing the dissolve it was
      // written to perform, and never letting setHidden drop the canvas.
      //
      // Capping the span at the distance the document can actually scroll makes
      // the exit resolve wherever the page happens to end. On a tall page this
      // is a no-op (heroHeight is the smaller of the two).
      //
      // scrollHeight is a layout read, so it lives here — captureLayout already
      // reads rects and runs at layout rate, never on the scroll hot path.
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      layout.exitSpan = Math.max(
        Math.min(layout.heroHeight, maxScroll - layout.heroTop),
        1,
      );

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

    // Once uScroll pushes the shader's exitFade to zero the canvas paints
    // nothing — but the element is still a full-size transparent layer that the
    // compositor blends over whatever is beneath it, on every scroll frame. The
    // box overhangs the hero by 65%, so "whatever is beneath it" is most of the
    // showcase section, and the GPU has no cheap way to know the texture came
    // out empty. Hiding it drops it out of compositing entirely, and costs
    // nothing to reverse on the way back up.
    //
    // visibility, not display:none — display would collapse the box, and the
    // ResizeObserver on this canvas is what drives the backing store and the
    // ring unit. A zero-size relayout on the way out (and another on the way
    // back in) is exactly the layout thrash this file exists to avoid.
    const setHidden = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      canvas.style.visibility = next ? "hidden" : "";
      // Draws are skipped while hidden, so the buffer is stale coming back.
      if (!next) needsDraw = true;
    };

    // scrollY vs cached hero top — the only per-frame scroll read left, and the
    // only thing it drives is the slow exit spin/expand/dissolve.
    const sampleScroll = () => {
      // Exit disabled: uScroll stays pinned at 0, so nothing here can ever set
      // needsDraw and the canvas is drawn once and then only translated by the
      // compositor. Returning before the scrollY read also keeps this off the
      // scroll hot path entirely.
      if (!scrollExit) return 0;

      const raw = Math.min(
        Math.max((window.scrollY - layout.heroTop) / layout.exitSpan, 0),
        1,
      );
      const eased = reduced ? 0 : raw * raw * (3.0 - 2.0 * raw);
      // Quantise before comparing. The old test redrew whenever eased moved
      // more than 0.0002, which a single pixel of scroll clears several times
      // over — so this was a full-canvas redraw on every scroll event, forever.
      // At EXIT_STEPS the ring turns ~0.15° and grows ~0.1% per step, well
      // under a pixel of arc travel, so nothing is visibly given up.
      //
      // Honest about the ceiling: this only helps *slow* scrolling. A fast
      // flick crosses many steps per frame and still redraws every frame. The
      // win is concentrated where the eased curve is flattest — the start of
      // the hero, which is exactly where a scroll begins.
      const stepped = Math.round(eased * EXIT_STEPS) / EXIT_STEPS;
      if (stepped !== lastScroll) {
        lastScroll = stepped;
        program.uniforms.uScroll.value = stepped;
        needsDraw = true;
      }
      // Mirrors the shader's exitFade = 1 - smoothstep(0.48, 0.98, uScroll):
      // by 0.98 the lens has already fully dissolved. Under reduced motion
      // eased is pinned to 0, so the lens simply never hides — which is right,
      // because it never fades out there either.
      setHidden(eased >= EXIT_HIDDEN_AT);
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
            if (avg > slipLimitMs()) {
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

    // Track the display's refresh interval from the rAF cadence. Runs for the
    // whole session, not just a warmup: the running minimum can only improve as
    // the page settles, and a load-time estimate taken while WebGL is still
    // coming up would be the least representative one available.
    const sampleRefresh = (now: number) => {
      const gap = now - lastFrameAt;
      lastFrameAt = now;
      if (!(gap > 0 && gap < DPR_SAMPLE_MAX_GAP_MS)) return;
      refreshWindow.push(gap);
      if (refreshWindow.length < REFRESH_WINDOW_FRAMES) return;
      const median = [...refreshWindow].sort((a, b) => a - b)[
        refreshWindow.length >> 1
      ];
      refreshWindow.length = 0;
      if (refreshMs === 0 || median < refreshMs) refreshMs = median;
    };

    // Draw-gap limit above which we drop a DPR step. Before any estimate lands
    // we assume 60Hz, which is the same conservative floor the clamp enforces.
    const slipLimitMs = () =>
      (refreshMs > 0
        ? Math.min(Math.max(refreshMs, REFRESH_FASTEST_MS), REFRESH_SLOWEST_MS)
        : REFRESH_SLOWEST_MS) * DPR_SLIP_FACTOR;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      sampleRefresh(now);
      sampleScroll();
      stepMotion(now);
      // Arcs-only never samples the bed — skip scoreboard uploads there.
      if (!arcsOnly) syncTileState();
      if (needsDraw && !hidden) render();
    };

    const ensureLoop = () => {
      if (reduced || document.hidden || !onScreen || raf) return;
      const now = performance.now();
      pointerTime = now;
      lastDrawAt = now;
      drawGapFrames = 0;
      // The first frame after a park has an arbitrarily long gap — don't let it
      // through as either a draw sample or a refresh sample.
      lastFrameAt = now;
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
      // Sets `hidden` for the current scroll position before we decide to draw.
      sampleScroll();
      if (!hidden) render();
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
      // StrictMode remounts reuse this canvas — don't hand it over hidden.
      canvas.style.removeProperty("visibility");
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
