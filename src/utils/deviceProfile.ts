// Capability-based runtime profile for phone vs desktop effect budgets.
// Prefer input media over viewport width. Overrides (config + ?device=) let
// desktop mock the touch path — including the cheaper GPU knobs.

export type DeviceKind = "touch" | "desktop";

export type DeviceProfile = {
  kind: DeviceKind;
  finePointer: boolean;
  touch: boolean;
  reducedMotion: boolean;
  dprCap: number;
  // Max WebGL draws per second; 0 = uncapped (every requestAnimationFrame).
  targetFps: number;
  enablePointerParallax: boolean;
  enableIdleDrift: boolean;
  enableScrollBlur: boolean;
  // TileField's idle auto-trails — slow sweeps that read as a cursor being
  // dragged across the field. Desktop only: with no cursor on screen to
  // motivate them, they just look like the backdrop moving on its own.
  enableIdleTrails: boolean;
  cheapShaders: boolean;
  zoomSamples: number;
};

// Sticky local override (null = follow ?device= / media). Handy while iterating
// without keeping a query string around.
export const FORCE_DEVICE: DeviceKind | null = null;

const DESKTOP_PROFILE = {
  dprCap: 2,
  // 0 = every rAF (follow display refresh). Don't undersample scroll-driven GL.
  targetFps: 0,
  cheapShaders: false,
  zoomSamples: 10,
} as const;

const TOUCH_PROFILE = {
  // Same 2× ceiling as desktop, so phones get the same crispness. This is
  // affordable now that the lens is compositor-locked and skips redundant
  // draws; useLensField also steps DPR down on its own if frames slip, which
  // is a better floor than guessing one up front. The old cap of 1 was fixing
  // the wrong problem — the phone stutter was scroll sync, not fill rate, and
  // 1× only made the arcs look soft.
  dprCap: 2,
  // 0 = every rAF (follow display refresh). Don't undersample scroll-driven GL.
  targetFps: 0,
  // Drops the chroma samples only. uChroma > 0 takes the shader's three-sample
  // branch on *every* fragment, not just the ones under a band, so it is a 3×
  // multiplier on bed sampling across the whole canvas — the one real fill-rate
  // win available here.
  //
  // This used to cover bed warp and grain too, which was over-broad: neither
  // adds work (see the notes in useLensField), so they were costing look for
  // nothing and are back on for touch. Narrowed to chroma, the flag also now
  // means the same thing in ZoomBlurField, which only ever used it for chroma.
  cheapShaders: true,
  zoomSamples: 5,
} as const;

const readForcedKind = (): DeviceKind | null => {
  if (FORCE_DEVICE === "touch" || FORCE_DEVICE === "desktop") return FORCE_DEVICE;
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("device");
  return q === "touch" || q === "desktop" ? q : null;
};

// Sync resolve for effects / one-shot reads. SSR returns a desktop-capable
// stub so server HTML doesn't assume a phone.
export const resolveDeviceProfile = (): DeviceProfile => {
  if (typeof window === "undefined") {
    return {
      kind: "desktop",
      finePointer: true,
      touch: false,
      reducedMotion: false,
      enablePointerParallax: true,
      enableIdleDrift: true,
      enableScrollBlur: true,
      enableIdleTrails: true,
      ...DESKTOP_PROFILE,
    };
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const forced = readForcedKind();

  let finePointer: boolean;
  let touch: boolean;
  if (forced === "touch") {
    touch = true;
    finePointer = false;
  } else if (forced === "desktop") {
    touch = false;
    finePointer = true;
  } else {
    finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    touch = !finePointer;
  }

  const budget = touch ? TOUCH_PROFILE : DESKTOP_PROFILE;

  return {
    kind: touch ? "touch" : "desktop",
    finePointer,
    touch,
    reducedMotion,
    dprCap: budget.dprCap,
    targetFps: budget.targetFps,
    enablePointerParallax: finePointer && !reducedMotion,
    enableIdleDrift: finePointer && !reducedMotion,
    enableScrollBlur: !touch && !reducedMotion,
    enableIdleTrails: !touch && !reducedMotion,
    cheapShaders: budget.cheapShaders,
    zoomSamples: budget.zoomSamples,
  };
};

export const applyDeviceDataset = (profile: DeviceProfile) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.device = profile.kind;
};

// Re-resolve when input / motion media changes (forced kind stays sticky).
export const subscribeDeviceProfile = (
  onChange: (profile: DeviceProfile) => void,
): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
  const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  const emit = () => onChange(resolveDeviceProfile());
  fineMq.addEventListener("change", emit);
  motionMq.addEventListener("change", emit);
  return () => {
    fineMq.removeEventListener("change", emit);
    motionMq.removeEventListener("change", emit);
  };
};
