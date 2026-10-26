"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CO_LEAGUE_ROSTER, SPACES } from "@/data/members";
import { setupState } from "@/lib/people";
import { useShell } from "./shell-context";

/**
 * A Workspace that is still being set up says so, once, to the only person who can
 * finish it. Tidy, not a rule: the server decides what an unfinished Workspace may do.
 */
export function SetupBanner() {
  const { membership } = useShell();

  const state = useMemo(
    () =>
      setupState({
        spaces: SPACES,
        admins: CO_LEAGUE_ROSTER.filter(
          (member) => member.role === "admin" && member.active,
        ).length,
        invitations: 0,
      }),
    [],
  );

  if (membership.role !== "admin" || state.finished || !state.reason)
    return null;

  return (
    <div className="border-hairline border-b bg-warning/10 px-4 py-2 text-[12.5px] text-ink">
      {state.reason}{" "}
      <Link href="/onboarding?step=spaces" className="font-medium underline">
        Finish setting up
      </Link>
      .
    </div>
  );
}
