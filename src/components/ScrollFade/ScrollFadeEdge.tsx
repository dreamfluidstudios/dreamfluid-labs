import { classNames } from "@/utils/classNames";

// Frosted leading edge for a section that scrolls over content beneath it
// (Fancy Fading Footer pattern: backdrop-filter + gradient mask). Reaches
// well into the viewport (not just a hairline at the fold) so enter/exit
// reads as a real glass dissolve rather than a hard cut.
export const ScrollFadeEdge = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={classNames(
      // Tall band, mostly seated inside the section: only a small cap peeks
      // above the top edge so frost covers content as it arrives / leaves.
      "pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(42vh,22rem)] -translate-y-[18%]",
      "bg-gradient-to-b from-transparent via-df-pure-black/45 to-df-pure-black/75",
      "backdrop-blur-2xl backdrop-brightness-75 backdrop-saturate-150",
      "[mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.35)_18%,black_55%,black_100%)]",
      className,
    )}
  />
);
