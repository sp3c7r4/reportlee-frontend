"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { listMembers } from "@/lib/members";
import { setupState } from "@/lib/people";
import { listSpaces } from "@/lib/spaces-api";
import { useShell } from "./shell-context";

/**
 * A Workspace that is still being set up says so, once, to the only person who can
 * finish it. Tidy, not a rule: the server decides what an unfinished Workspace may do.
 * The state is worked out here from the Spaces and the roster (no endpoint), and it
 * stays quiet while it loads or if either call fails.
 */
export function SetupBanner() {
  const { membership, workspace } = useShell();
  const pathname = usePathname();
  const [reason, setReason] = useState<string | null>(null);
  const isAdmin = membership.role === "admin";

  // biome-ignore lint/correctness/useExhaustiveDependencies: the path is a refetch trigger, so the banner clears after a Space is added
  useEffect(() => {
    if (!isAdmin) {
      setReason(null);
      return;
    }
    let cancelled = false;
    void Promise.all([
      listSpaces(workspace.id),
      listMembers(workspace.id),
    ]).then(([spaces, members]) => {
      if (cancelled) return;
      if (!spaces.ok || !members.ok) {
        setReason(null);
        return;
      }
      const state = setupState({
        spaces: spaces.data,
        admins: members.data.filter(
          (member) => member.role === "admin" && member.active,
        ).length,
        invitations: 0,
      });
      setReason(state.finished ? null : state.reason);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, workspace.id, pathname]);

  if (!isAdmin || !reason) return null;

  return (
    <div className="border-hairline border-b bg-warning/10 px-4 py-2 text-[12.5px] text-ink">
      {reason}{" "}
      <Link href="/onboarding?step=spaces" className="font-medium underline">
        Finish setting up
      </Link>
      .
    </div>
  );
}
