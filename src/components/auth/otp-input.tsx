"use client";

import {
  type ClipboardEvent,
  type KeyboardEvent,
  type Ref,
  useImperativeHandle,
  useRef,
} from "react";
import {
  CODE_LENGTH,
  isCompleteCode,
  nextFocusAfterInput,
  normaliseDigit,
  parsePastedCode,
  prevFocusAfterBackspace,
} from "@/lib/otp";
import { cn } from "@/lib/utils";

export type OtpInputHandle = {
  /** A rejected code sends the user back to the first box to fix a typo. */
  focusFirst: () => void;
};

type OtpInputProps = {
  /** One entry per box, so editing the fourth box cannot shift the first three. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Fired with the whole code as soon as every box is filled. */
  onComplete?: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** Id of the line describing this group's state, for assistive technology. */
  describedBy?: string;
  ref?: Ref<OtpInputHandle>;
};

/**
 * Six single character boxes.
 *
 * Six real inputs rather than one styled field, because that is what gives paste,
 * per box announcement, backspace behaviour and the platform's one-time-code
 * autofill for free. The arithmetic behind the pleasant parts is in
 * `src/lib/otp.ts`, and it is what the checks cover.
 *
 * Geometry follows the other auth fields: 12px radius rather than the theme's
 * larger `rounded-xl`, a hairline border, and the same ink focus ring, so a code
 * box and an email field read as the same surface.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  ref,
  describedBy,
}: OtpInputProps) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (index: number) => {
    const el = boxes.current[index];
    el?.focus();
    el?.select();
  };

  useImperativeHandle(ref, () => ({ focusFirst: () => focusBox(0) }));

  const commit = (next: string[]) => {
    onChange(next);
    const code = next.join("");
    if (isCompleteCode(code)) onComplete?.(code);
  };

  const handleInput = (index: number, raw: string) => {
    const digit = normaliseDigit(raw.slice(-1));
    if (digit === null) {
      // Letters and symbols are refused rather than swallowed: the box keeps
      // whatever it held and focus does not move.
      return;
    }
    const next = [...value];
    next[index] = digit;
    commit(next);
    focusBox(nextFocusAfterInput(index));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const filled = value[index] !== "";
      const next = [...value];
      if (filled) {
        next[index] = "";
        onChange(next);
        focusBox(index);
        return;
      }
      const target = prevFocusAfterBackspace(index, false);
      next[target] = "";
      onChange(next);
      focusBox(target);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const code = parsePastedCode(event.clipboardData.getData("text"));
    if (!code) return;
    event.preventDefault();
    commit(code.split(""));
    focusBox(CODE_LENGTH - 1);
  };

  return (
    <fieldset disabled={disabled} aria-describedby={describedBy} className="min-w-0 border-0 p-0">
      <legend className="sr-only">Verification code</legend>
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: the boxes are positional by definition
            key={index}
            ref={(el) => {
              boxes.current[index] = el;
            }}
            value={value[index] ?? ""}
            onChange={(event) => handleInput(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={invalid ? true : undefined}
            maxLength={1}
            className={cn(
              "h-14 w-full rounded-[12px] border border-hairline bg-surface-alt text-center font-semibold text-[24px] text-ink",
              "transition-colors placeholder:text-ink/40",
              "focus-visible:border-ink focus-visible:ring-0 focus-visible:outline-none",
              invalid && "border-destructive",
              "disabled:opacity-60"
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
