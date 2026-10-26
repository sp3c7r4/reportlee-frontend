"use client";

import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  /** Sits on the trailing edge of the label row, for a route out of the field. */
  action?: ReactNode;
  error?: string;
  /** Supplementary line under the field, for a rule the user should know. */
  hint?: string;
  /** Fixed text inside the field, ahead of what the user types. */
  prefix?: ReactNode;
  /** Fixed text inside the field, after what the user types. */
  suffix?: ReactNode;
  /** Swaps the field for one that can be read back, for password entry. */
  reveal?: boolean;
};

/**
 * One field, one surface.
 *
 * A prefix or a suffix puts the fixed part of a value inside the same border as
 * the part the user chooses, so an address reads as one value rather than as a
 * label above an input. The border and the focus treatment belong to the field
 * box, and the input inside it is borderless, so the two never double up.
 */
export function AuthField({
  label,
  action,
  error,
  hint,
  prefix,
  suffix,
  reveal,
  type = "text",
  className,
  ...props
}: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);

  const affixed = Boolean(prefix || suffix);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="font-medium text-[13.5px] text-ink">
          {label}
        </Label>
        {action}
      </div>

      <div
        className={cn(
          "relative",
          affixed &&
            "flex items-center rounded-[12px] border border-hairline bg-surface-alt transition-colors focus-within:border-ink",
          affixed && error ? "border-destructive focus-within:border-destructive" : ""
        )}
      >
        {prefix ? (
          <span className="pl-3.5 text-[15px] text-muted-foreground select-none">{prefix}</span>
        ) : null}

        <Input
          id={id}
          type={reveal ? (revealed ? "text" : "password") : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "h-11 rounded-[12px] border-hairline bg-surface-alt px-3.5 text-[15px] text-ink shadow-none",
            "transition-colors placeholder:text-ink/60",
            // Focus and error are a border colour, never a halo: a ring outside the
            // border draws a second outline, which reads as a ghost rather than as
            // the field being active.
            "focus-visible:border-ink focus-visible:ring-0",
            "aria-invalid:border-destructive aria-invalid:ring-0",
            reveal ? "pr-12" : "",
            affixed &&
              "flex-1 border-0 bg-transparent focus-visible:border-transparent focus-visible:ring-0",
            affixed && prefix ? "pl-2" : "",
            affixed && suffix ? "pr-2" : "",
            className
          )}
          {...props}
        />

        {suffix ? (
          <span className="pr-3.5 text-[15px] text-muted-foreground select-none">{suffix}</span>
        ) : null}

        {reveal ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[12px] text-ink/50 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-ink/50 focus-visible:-outline-offset-2"
          >
            <HugeiconsIcon
              icon={revealed ? ViewOffIcon : ViewIcon}
              strokeWidth={2}
              className="size-[18px]"
            />
          </button>
        ) : null}
      </div>

      {hint && !error ? (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
