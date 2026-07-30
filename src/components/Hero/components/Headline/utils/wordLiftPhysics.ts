// Physics for the "broken sign" pixel word: hinged at its top-right corner,
// hanging at REST_ANGLE_DEG. The cursor can support it from below and lift it
// back toward horizontal (0°); angles here are the *dropped* amount, rendered
// as rotate(-angle).

export const REST_ANGLE_DEG = 3;
// Lets the release bounce overshoot like the entrance keyframes' 4.5° swing.
export const MAX_ANGLE_DEG = 4.6;
// Keeps the lever arm from vanishing (and atan blowing up) right at the hinge.
const HINGE_INSET_PX = 8;
// How much of the word's height (measured up from the underside) still counts
// as supporting it; above that line the cursor drops it / can't grab it.
const LIFTABLE_RATIO = 1;

export type SpringMode = "supported" | "released";

// supported: near-critically damped so the word tracks the cursor without
// wobble. released: underdamped (ζ ≈ 0.4) so the fall rocks once and settles.
const SPRINGS: Record<SpringMode, { stiffness: number; damping: number }> = {
  supported: { stiffness: 400, damping: 40 },
  released: { stiffness: 140, damping: 9.5 },
};

export type SpringState = { angle: number; velocity: number };

// The element's un-rotated layout box (CSS transforms excluded) — the physics
// runs against this, never against the live rotated bounding box, so lifting
// the sign doesn't move its own reference frame.
export type LayoutRect = { left: number; right: number; top: number; bottom: number };

export type SupportResult = {
  // Dropped-angle the cursor would hold the sign at, or null when the cursor
  // is not supporting it.
  target: number | null;
  armed: boolean;
};

// `armed` is the caller-held history bit that enforces lifting-from-below: it
// re-arms only while the cursor is under the word's underside plane, and
// disarms above the liftable band or beside the word at word height — so
// neither descending from the top nor sliding in from the side engages
// support. The bottom LIFTABLE_RATIO of the word is a grace band — a cursor
// inside it keeps holding the word fully horizontal instead of dropping it
// the instant it crosses the underside.
export const supportTarget = (
  rect: LayoutRect,
  mx: number,
  my: number,
  armed: boolean,
): SupportResult => {
  const hingeX = rect.right - HINGE_INSET_PX;
  const releaseY = rect.bottom - (rect.bottom - rect.top) * LIFTABLE_RATIO;
  if (mx < rect.left || mx > hingeX) return { target: null, armed: my > rect.bottom };
  if (my <= releaseY) return { target: null, armed: false };
  if (my <= rect.bottom) return { target: armed ? 0 : null, armed };
  const cursorDeg =
    (Math.atan((my - rect.bottom) / (hingeX - mx)) * 180) / Math.PI;
  if (cursorDeg >= REST_ANGLE_DEG) return { target: null, armed: true };
  return { target: armed ? Math.max(cursorDeg, 0) : null, armed };
};

// A click below the word within this vertical band (px, measured down from the
// underside) shoves it upward — as if the click's shockwave hit it from below.
const PUSH_BAND_PX = 148;
// Peak upward velocity impulse (deg/s) for a click right at the underside,
// falling to zero across the band. Tuned to hop it up a couple degrees before
// the released spring rocks it back to rest.
const PUSH_IMPULSE = 54;

// Upward-impulse magnitude for a click at (mx, my): non-zero only within the
// word's horizontal span and within PUSH_BAND_PX below its underside, scaling
// up the closer the click lands. The caller lifts by subtracting this from the
// spring velocity (a smaller dropped angle reads as more horizontal).
export const pushImpulse = (rect: LayoutRect, mx: number, my: number): number => {
  if (mx < rect.left || mx > rect.right) return 0;
  const below = my - rect.bottom;
  if (below <= 0 || below > PUSH_BAND_PX) return 0;
  return PUSH_IMPULSE * (1 - below / PUSH_BAND_PX);
};

export const springStep = (
  state: SpringState,
  targetDeg: number,
  dtMs: number,
  mode: SpringMode,
): SpringState => {
  const { stiffness, damping } = SPRINGS[mode];
  const dt = Math.min(dtMs, 32) / 1000;
  const accel = stiffness * (targetDeg - state.angle) - damping * state.velocity;
  let velocity = state.velocity + accel * dt;
  let angle = state.angle + velocity * dt;
  if (angle < 0) {
    angle = 0;
    velocity = 0;
  } else if (angle > MAX_ANGLE_DEG) {
    angle = MAX_ANGLE_DEG;
    velocity = 0;
  }
  return { angle, velocity };
};

export const isSettled = (state: SpringState, targetDeg: number) =>
  Math.abs(state.angle - targetDeg) < 0.02 && Math.abs(state.velocity) < 0.05;
