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

// The tagline is exposed to assistive tech as a visually-hidden text node rather
// than an aria-label. <p> maps to role="paragraph", which the ARIA spec lists as
// "name prohibited" — aria-label is silently ignored there (as it would be on a
// div or span, both role="generic"). Real sr-only text is honoured regardless of
// role, so it's the portable fix. Everything visible is aria-hidden, which keeps
// the decorative periodic-tile chrome ("19", "Dreamfluid") out of the tree.
//
// The spoken string is derived from `words` rather than authored separately, so
// editing the headline copy can't leave a stale tagline behind.
export const Headline = ({ words, className }: HeadlineProps) => (
  <p
    className={classNames(
      "flex flex-nowrap items-baseline justify-center gap-x-[0.18em] text-[clamp(1.75rem,7vw,5.5rem)]",
      className,
    )}
  >
    <span className="sr-only">{words.map(({ text }) => text).join(" ")}</span>
    {words.map(({ text, variant, element }) => (
      <HeadlineWord key={text} variant={variant} element={element}>
        {text}
      </HeadlineWord>
    ))}
  </p>
);
