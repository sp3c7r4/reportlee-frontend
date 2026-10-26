"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { TopBarAction, useShell } from "@/components/dashboard/shell-context";
import { HomeScreen } from "@/components/home/home-screen";
import { SubmittedNotice } from "@/components/reports/submitted-notice";

/**
 * Home. The page owns its one action, so the top bar never guesses: Staff and a Head of
 * Space author Reports and get Submit report; a Workspace Admin never does.
 */
export default function DashboardHome() {
  const { membership } = useShell();
  const canAuthor = membership.role !== "admin";

  return (
    <>
      {canAuthor ? (
        <TopBarAction>
          <Link
            href="/dashboard/reports/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-2xl bg-ink px-3 text-[13px] text-surface"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
            Submit report
          </Link>
        </TopBarAction>
      ) : null}
      <SubmittedNotice />
      <HomeScreen />
    </>
  );
}
