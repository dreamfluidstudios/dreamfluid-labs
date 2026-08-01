import Link from "next/link";
import type { ReactNode } from "react";
import { classNames } from "@/utils/classNames";

export type ButtonVariant = "white" | "ghost";

type ButtonProps = {
  children: ReactNode;
  // When set, renders as a Next.js Link; otherwise a native <button>.
  href?: string;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
};

// Shared pill shape; the hover signal lives per-variant. Fills/colours stay put
// across states — the signal is a glow (primary) or a border/fill shift
// (ghost), never an opacity drop. See DESIGN.md → Buttons.
//
// Keyboard focus adds a solid white outline on top of the per-variant signal,
// as a reliable, high-contrast focus indicator (a glow alone is too easy to
// miss). The offset keeps the ring visible even on the white fill by leaving a
// gap of the dark backdrop between the button and the outline.
// Size scales fluidly with the viewport rather than stepping at a breakpoint,
// matching the headline's clamp() treatment. Each axis grows from its phone
// floor (~375px: 13px text, 16/8px padding) to its ceiling at ~1120px, where
// all four land together on the full desktop size (16px text, 24/12px padding).
//
// The visible pill is allowed to shrink below the 44px touch minimum on phones;
// the tap target doesn't. An invisible centred ::after overlay holds the hit
// area at >=44px independent of the pill, so small screens keep the tighter look
// without becoming hard to hit. It's centred+translated rather than inset so it
// can overflow the pill on both axes.
const baseClasses =
  "relative inline-flex items-center justify-center gap-[clamp(0.375rem,0.3rem_+_0.3vw,0.5rem)] rounded-full px-[clamp(1rem,0.8rem_+_1vw,1.5rem)] py-[clamp(0.5rem,0.4rem_+_0.5vw,0.75rem)] text-[clamp(0.8125rem,0.72rem_+_0.4vw,1rem)] font-medium tracking-wide transition duration-300 after:absolute after:left-1/2 after:top-1/2 after:h-full after:w-full after:min-h-[44px] after:min-w-[44px] after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-df-white";

const variantClasses: Record<ButtonVariant, string> = {
  // Primary CTA: solid fill, neutral white bloom on hover/focus.
  white:
    "bg-df-white text-df-black hover:shadow-glow-white focus-visible:shadow-glow-white",
  // Secondary / nav: transparent with a hairline Silver Veil border that
  // brightens and picks up a faint fill on hover/focus — quieter, no glow.
  ghost:
    "border border-df-silver/40 text-df-white hover:border-df-white/70 hover:bg-df-white/[0.06] focus-visible:border-df-white/70 focus-visible:bg-df-white/[0.06]",
};

export const Button = ({
  children,
  href,
  variant = "white",
  onClick,
  className,
}: ButtonProps) => {
  const classes = classNames(baseClasses, variantClasses[variant], className);

  return href ? (
    <Link href={href} className={classes}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
};
