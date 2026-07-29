import type { ReactNode } from "react";
import { classNames } from "@/utils/classNames";

type WordmarkProps = {
  children: ReactNode;
  className?: string;
};

export const Wordmark = ({ children, className }: WordmarkProps) => (
  <h1
    className={classNames(
      "text-base font-semibold tracking-[0.04em] text-df-white sm:text-lg",
      className,
    )}
  >
    {children}
  </h1>
);
