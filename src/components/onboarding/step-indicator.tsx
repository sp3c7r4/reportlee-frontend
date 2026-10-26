"use client";

import { type OnboardingStep, STEPS } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * Where the user is in the flow, in marks and in words.
 *
 * The line is the state, not decoration: its position is driven by the same
 * timeline that moves the steps, so the two always agree. The count is stated in
 * words as well, because a user who cannot see the marks should not have to
 * infer their place from the heading alone.
 */
export function StepIndicator({ current }: { current: OnboardingStep }) {
  return (
    <div className="flex items-center gap-4">
      <ol className="flex items-center gap-2.5" aria-hidden="true">
        {STEPS.map((step) => {
          const done = step.index < current.index;
          const active = step.index === current.index;
          return (
            <li
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-300",
                active ? "w-8 bg-ink" : done ? "w-4 bg-ink/40" : "w-4 bg-hairline"
              )}
            />
          );
        })}
      </ol>

      <p className="text-[12.5px] text-muted-foreground">
        <span className="font-medium text-ink">{current.label}</span>
        <span className="mx-1.5 text-hairline">/</span>
        Step {current.index + 1} of {STEPS.length}
      </p>
    </div>
  );
}
