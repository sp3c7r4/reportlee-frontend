import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EyebrowProps = {
  children: ReactNode;
  /** Section mark in the leading orange tile. Omit for a label-only pill. */
  icon?: typeof import("@hugeicons/core-free-icons").AiMagicIcon;
  /** light: tinted pill on the page. inverse: white pill on ink. dark: ink pill. */
  tone?: "light" | "inverse" | "dark";
  className?: string;
};

/** Small pill that names the section above its headline. */
export function Eyebrow({ children, icon, tone = "light", className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2.5 rounded-4xl py-1.5 pr-4",
        icon ? "pl-1.5" : "pl-4",
        tone === "dark"
          ? "bg-white/[0.06]"
          : tone === "inverse"
            ? "bg-surface-alt"
            : "bg-brand-soft",
        className
      )}
    >
      {icon ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-white">
          <HugeiconsIcon icon={icon} strokeWidth={2.2} className="size-4" />
        </span>
      ) : null}
      <span className={cn("font-medium text-[15px] tracking-[-0.01em]", "text-ink")}>
        {children}
      </span>
    </span>
  );
}
