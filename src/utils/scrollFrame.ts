// One scroll listener and one rAF for every scroll-linked effect on the page,
// with all DOM reads batched ahead of all DOM writes.
//
// Why this exists: each of these effects used to own a scroll listener and its
// own rAF that did read → write, read → write. Independent callbacks landing in
// the same frame interleave, and every read after a write forces a synchronous
// layout. With a hero fade, a showcase fade, a showcase grow and a footer fade
// all live, that was up to four forced layouts per scroll frame on the main
// thread — the phone's momentum scroll runs on the compositor and does not wait
// for any of it, so the visual result is a page that scrolls smoothly while
// everything driven by JS lags behind it in steps.
//
// Batching measure() then apply() means at most one layout per frame, shared.
//
// Note this does NOT make scroll-linked JS frame-accurate on iOS — nothing can,
// short of taking over scrolling. It just makes it cheap. Anything that has to
// stay pixel-locked to scrolling content belongs in the scroll flow instead
// (see LensField).

export type ScrollFrameTask = {
  // Read phase: getBoundingClientRect / innerHeight / scrollY. No writes.
  measure: () => void;
  // Write phase: style + attribute changes. No reads.
  apply: () => void;
};

const tasks = new Set<ScrollFrameTask>();
let raf = 0;
let listening = false;

const run = () => {
  raf = 0;
  for (const task of tasks) task.measure();
  for (const task of tasks) task.apply();
};

const schedule = () => {
  if (!raf) raf = requestAnimationFrame(run);
};

const listen = () => {
  if (listening) return;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  listening = true;
};

const unlisten = () => {
  if (!listening || tasks.size > 0) return;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  listening = false;
};

// Registers a task and runs it once immediately, so the first paint already
// has correct values (callers use useLayoutEffect for the same reason).
export const registerScrollFrame = (task: ScrollFrameTask) => {
  tasks.add(task);
  listen();
  task.measure();
  task.apply();
  return () => {
    tasks.delete(task);
    unlisten();
  };
};
