"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AuthField } from "@/components/auth/auth-field";
import { SPACE_LIMIT } from "@/lib/onboarding";

type SpaceStepProps = {
  rows: string[];
  onRow: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

/**
 * The first Space is the one that matters; the rest are generosity. Adding a
 * row is a text link rather than a button so it never competes with Continue, and
 * removal only appears once there is something to remove.
 */
export function SpaceStep({ rows, onRow, onAdd, onRemove }: SpaceStepProps) {
  return (
    <>
      {rows.map((value, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and reordering is removal plus re-add
        <div key={index} data-step-field className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <AuthField
              label={index === 0 ? "Space name" : `Space ${index + 1}`}
              name={`space-${index}`}
              placeholder={index === 0 ? "Engineering" : "Design"}
              value={value}
              onChange={(event) => onRow(index, event.target.value)}
            />
          </div>
          {index > 0 ? (
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove Space ${index + 1}`}
              className="mb-[1px] grid size-11 shrink-0 place-items-center rounded-[12px] text-muted-foreground transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} className="size-[18px]" />
            </button>
          ) : null}
        </div>
      ))}

      {rows.length < SPACE_LIMIT ? (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex w-fit items-center gap-1.5 font-medium text-[13.5px] text-ink transition-colors hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          Add another Space
        </button>
      ) : null}
    </>
  );
}
