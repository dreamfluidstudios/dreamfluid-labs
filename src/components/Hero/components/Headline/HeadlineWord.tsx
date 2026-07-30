"use client";

import { useRef, type ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import { useWordLift } from "./hooks/useWordLift";
import { PeriodicElement, type ElementBadge } from "./PeriodicElement";

export type HeadlineWordVariant = "sans" | "pixel" | "serif";

const variantClasses: Record<HeadlineWordVariant, string> = {
  sans: "font-sans font-medium leading-[0.95] tracking-[-0.04em]",
  pixel:
    "font-pixel text-[0.92em] leading-[0.95] tracking-normal origin-top-right motion-safe:animate-word-tilt",
  serif:
    "relative top-[0.01em] font-serif text-[1.19em] italic font-medium leading-[0.88] tracking-[-0.035em] [text-shadow:0_0_18px_rgba(250,250,250,0.22),0_0_48px_rgba(250,250,250,0.10)] motion-safe:animate-vision-glow",
};

type HeadlineWordProps = {
  variant?: HeadlineWordVariant;
  element?: ElementBadge;
  children: ReactNode;
};

export const HeadlineWord = ({ variant = "sans", element, children }: HeadlineWordProps) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  useWordLift(ref, variant === "pixel");

  const word = (
    <span ref={ref} className={classNames("text-df-white", variantClasses[variant])}>
      {children}
    </span>
  );

  return element ? (
    <PeriodicElement {...element}>{word}</PeriodicElement>
  ) : (
    word
  );
};
