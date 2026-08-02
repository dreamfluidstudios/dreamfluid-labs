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
  dprCap: 1.25,
  // Same as desktop: vsync via rAF. A 30fps cap made scroll-linked arcs lag.
  targetFps: 0,
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
