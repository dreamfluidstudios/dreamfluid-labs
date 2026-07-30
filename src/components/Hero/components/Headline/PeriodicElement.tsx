import { useRef, type ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import { useSlamImpact } from "./hooks/useSlamImpact";

export type ElementBadge = {
  number: string;
  label: string;
};

type PeriodicElementProps = ElementBadge & {
  children: ReactNode;
};

const cardShell =
  "pointer-events-none absolute -inset-x-[0.24em] -top-[0.26em] -bottom-[0.36em] rounded-[0.14em] border border-df-white/70";

// Decorative periodic-table chrome (atomic number + element name). Purely
// visual, so it's hidden from assistive tech — the headline word itself carries
// the meaning.
const CardChrome = ({ number, label }: ElementBadge) => (
  <>
    <span
      aria-hidden="true"
      className="absolute left-[0.7em] top-[0.6em] select-none font-mono text-[0.17em] leading-none text-df-white/80"
    >
      {number}
    </span>
    <span
      aria-hidden="true"
      className="absolute bottom-[0.8em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-mono text-[0.15em] leading-none tracking-[0.08em] text-df-white/80"
    >
      {label}
    </span>
  </>
);

// Periodic-table tile around a headline word. The word stays as plain in-flow
// text (the headline never reflows) while the tile chrome enters as an
// absolutely-positioned overlay: the card falls in along the fake Z axis —
// huge, transparent and out of focus — smashes onto the word (which shudders),
// and the landing spawns a ripple in the background tile field. Reduced-motion
// users see the finished tile statically.
export const PeriodicElement = ({ number, label, children }: PeriodicElementProps) => {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  useSlamImpact(wrapperRef, true);

  return (
    <span
      ref={wrapperRef}
      className="relative mr-[0.18em] inline-block motion-safe:animate-element-shudder"
    >
      {children}
      <span aria-hidden="true" className={classNames(cardShell, "motion-safe:animate-element-slam")}>
        <CardChrome number={number} label={label} />
      </span>
    </span>
  );
};
