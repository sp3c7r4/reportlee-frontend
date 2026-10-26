import type { ReactNode } from "react";
import { SplitHeadline } from "@/components/motion/split-headline";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

type SectionHeadingProps = {
  eyebrow?: string;
  eyebrowIcon?: typeof import("@hugeicons/core-free-icons").AiMagicIcon;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  /** Optional trailing control, e.g. the "Get Started" pill. */
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
};

export function SectionHeading({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  align = "left",
  tone = "light",
  action,
  className,
  titleClassName,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        action && !centered ? "lg:flex-row lg:items-end lg:justify-between" : "",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-5",
          centered ? "items-center text-center" : "items-start",
          centered ? "mx-auto max-w-3xl" : "max-w-2xl"
        )}
      >
        {eyebrow ? (
          <Eyebrow icon={eyebrowIcon} tone={tone}>
            {eyebrow}
          </Eyebrow>
        ) : null}
        <SplitHeadline
          text={title}
          className={cn(
            "font-bold text-[34px] leading-[1.08] tracking-[-0.025em] sm:text-[44px] lg:text-[56px]",
            tone === "dark" ? "text-white" : "text-ink",
            titleClassName
          )}
        />
        {description ? (
          <p
            className={cn(
              "text-[17px] leading-[1.6]",
              centered ? "max-w-2xl" : "max-w-xl",
              tone === "dark" ? "text-white/60" : "text-muted-foreground"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
    </div>
  );
}
