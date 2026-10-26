import { cn } from "@/lib/utils";

/**
 * Reportlee wordmark: the name set in the heading face. The previous mark was the
 * drawn Yoruba word ìròyìn as SVG paths, which no rename can follow, so it is live
 * text now: selectable, translatable, and one line instead of 2.5k of paths.
 *
 * Size comes from the caller, because a wordmark has no intrinsic size. Colour is
 * `currentColor`, so the letters follow the surface the same way they used to.
 */
type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-block font-bold leading-none tracking-[-0.035em] whitespace-nowrap",
        className,
      )}
    >
      Reportlee
    </span>
  );
}
