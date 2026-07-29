import { HeadlineWord, type HeadlineWordVariant } from "./HeadlineWord";
import type { ElementBadge } from "./PeriodicElement";
import { classNames } from "@/utils/classNames";

export type HeadlineWordContent = {
  text: string;
  variant: HeadlineWordVariant;
  element?: ElementBadge;
};

type HeadlineProps = {
  words: readonly HeadlineWordContent[];
  className?: string;
};

export const Headline = ({ words, className }: HeadlineProps) => (
  <p
    className={classNames(
      "flex flex-wrap items-baseline justify-center gap-x-[0.18em] gap-y-1 text-[clamp(2.5rem,7vw,5.5rem)]",
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
