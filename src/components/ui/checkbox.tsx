"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";

/* @info - A copied-in shadcn component over the @base-ui checkbox primitive, not a new
   dependency. Named in the event-lead-capture spec so the build gate can confirm the add. */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input bg-input/30 shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2.5}
          className="size-3.5"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
