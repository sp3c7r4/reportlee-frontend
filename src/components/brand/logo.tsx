import { cn } from "@/lib/utils";
import { Monogram } from "./monogram";
import { Wordmark } from "./wordmark";

type LogoProps = {
  className?: string;
  tone?: "light" | "dark";
  showWordmark?: boolean;
};

/**
 * Reportlee lockup for the site header. The tile runs larger here than the ratio in
 * the source lockup file: at header size the drawn proportion reads as too quiet,
 * so the mark is scaled up to hold its own against the wordmark.
 */
export function Logo({ className, tone = "light", showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex w-fit items-center gap-[3px]", className)}>
      <Monogram className={cn("h-[27px] w-[27px] shrink-0", !showWordmark && "h-9 w-9")} />
      {showWordmark ? (
        <Wordmark className={cn("text-[30px]", tone === "dark" ? "text-white" : "text-ink")} />
      ) : null}
    </span>
  );
}
