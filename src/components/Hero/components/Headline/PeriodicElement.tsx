import { useRef, type ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import { useSlamImpact } from "./hooks/useSlamImpact";

export type ElementEntrance = "slam" | "ghost";

export type ElementBadge = {
  number: string;
  label: string;
  entrance?: ElementEntrance;
};

type PeriodicElementProps = ElementBadge & {
  // Raw word text re-rendered inside the ghost tile (children carries a ref
  // and must only be mounted once, in flow).
  symbol: ReactNode;
  children: ReactNode;
};

const cardShell =
  "pointer-events-none absolute -inset-x-[0.24em] -top-[0.26em] -bottom-[0.36em] rounded-[0.14em] border border-df-white/70";

const CardChrome = ({ number, label }: Pick<ElementBadge, "number" | "label">) => (
  <>
    <span className="absolute left-[0.7em] top-[0.6em] select-none font-mono text-[0.17em] leading-none text-df-white/80">
      {number}
    </span>
    <span className="absolute bottom-[0.8em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-mono text-[0.15em] leading-none tracking-[0.08em] text-df-white/80">
      {label}
    </span>
  </>
);

// Periodic-table tile around a headline word. The word stays as plain in-flow
// text (the headline never reflows) while the tile chrome enters as an
// absolutely-positioned overlay, in one of two ways:
// - "slam": the card falls in along the fake Z axis — huge, transparent and
//   out of focus — smashes onto the word (which shudders), and the landing
//   spawns a ripple in the background tile field.
// - "ghost": a free-floating copy of the full tile flashes around the word at
//   different offsets/scales, then the real chrome locks in.
// Reduced-motion users see the finished tile statically in both modes.
export const PeriodicElement = ({
  number,
  label,
  entrance = "slam",
  symbol,
  children,
}: PeriodicElementProps) => {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  useSlamImpact(wrapperRef, entrance === "slam");

  return (
    <span
      ref={wrapperRef}
      className={classNames(
        "relative inline-block mr-[0.18em]",
        entrance === "slam" && "motion-safe:animate-element-shudder",
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={classNames(
          cardShell,
          entrance === "slam"
            ? "motion-safe:animate-element-slam"
            : "motion-safe:animate-element-lock",
        )}
      >
        <CardChrome number={number} label={label} />
      </span>
      {entrance === "ghost" && (
        <span
          aria-hidden="true"
          className={classNames(cardShell, "opacity-0 motion-safe:animate-element-ghost")}
        >
          <CardChrome number={number} label={label} />
          <span className="absolute left-1/2 top-[0.26em] -translate-x-1/2 font-sans font-medium leading-[0.95] tracking-[-0.04em] text-df-white">
            {symbol}
          </span>
        </span>
      )}
    </span>
  );
};
