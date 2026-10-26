import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Form-level failure: what went wrong, and what to do about it. */
export function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-3.5 py-3 text-[13.5px] text-destructive leading-[1.5]"
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="mt-px size-4 shrink-0" />
      {message}
    </p>
  );
}
