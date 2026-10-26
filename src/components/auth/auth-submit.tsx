"use client";

import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";

type AuthSubmitProps = {
  label: string;
  pendingLabel: string;
  pending: boolean;
};

export function AuthSubmit({ label, pendingLabel, pending }: AuthSubmitProps) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-4xl bg-ink font-medium text-[15px] text-on-ink transition-colors hover:bg-charcoal"
    >
      {pending ? (
        <>
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2.2}
            className="size-[18px] animate-spin"
          />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
