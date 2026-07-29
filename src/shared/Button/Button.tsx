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

// Shared pill shape; the hover/focus signal lives per-variant. Fills/colours
// stay put across states — the signal is a glow (primary) or a border/fill
// shift (ghost), never an opacity drop. See DESIGN.md → Buttons.
const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium tracking-wide transition duration-300 focus-visible:outline-none";

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
