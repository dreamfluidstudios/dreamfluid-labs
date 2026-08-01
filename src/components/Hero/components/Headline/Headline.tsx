import { HeadlineWord, type HeadlineWordVariant } from "./HeadlineWord";
import type { ElementBadge } from "./PeriodicElement";
import { classNames } from "@/utils/classNames";

export type HeadlineWordContent = {
  text: string;
  variant: HeadlineWordVariant;
  element?: ElementBadge;
};

type HeadlineProps = {
  taglineAriaLabel: string;
  words: readonly HeadlineWordContent[];
  className?: string;
};

export const Headline = ({ taglineAriaLabel, words, className }: HeadlineProps) => (
  <p
    aria-label={taglineAriaLabel}
    className={classNames(
      "flex flex-nowrap items-baseline justify-center gap-x-[0.18em] text-[clamp(1.75rem,7vw,5.5rem)]",
      className,
    )}
  >
    {words.map(({ text, variant, element }) => (
      <HeadlineWord key={text} variant={variant} element={element}>
        {text}
      </HeadlineWord>
    ))}
  </p>
);
