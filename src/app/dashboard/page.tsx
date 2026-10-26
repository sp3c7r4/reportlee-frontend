"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { TopBarAction, useShell } from "@/components/dashboard/shell-context";
import { SubmittedNotice } from "@/components/reports/submitted-notice";
import { ROLE_LABEL } from "@/data/viewer";

/**
 * Home, as a placeholder while the screens are still ahead.
 *
 * It does one real thing: it fills the top bar's action slot. Staff and a Head of
 * Space author Reports, so they get Submit report; a Workspace Admin never does, which
 * is the rule this page exists to show.
 */
export default function DashboardHome() {
  const { user, membership, workspace } = useShell();
  const canAuthor = membership.role !== "admin";

  return (
    <DataPage>
      {canAuthor ? (
        <TopBarAction>
          <Link
            href="/dashboard/reports/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-2xl bg-ink px-3 text-[13px] text-surface"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2}
              className="size-3.5"
            />
            Submit report
          </Link>
        </TopBarAction>
      ) : null}

      <SubmittedNotice />

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-ink/40 uppercase tracking-[0.14em]">
          {ROLE_LABEL[membership.role]} · {workspace.name}
        </p>
        <h1 className="font-bold text-[24px] text-ink leading-[1.15] tracking-[-0.03em]">
          {membership.role === "admin" ? "Overview" : "Home"}
        </h1>
        <p className="max-w-[60ch] text-[14px] text-ink/60 leading-[1.6]">
          The frame is in place and running on sample data. Welcome, {user.name}
          .
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-hairline border-dashed p-8 text-center">
        <p className="font-medium text-[14px] text-ink">Nothing here yet</p>
        <p className="mt-1.5 max-w-[46ch] mx-auto text-[13px] text-ink/55 leading-[1.6]">
          The screens arrive phase by phase. This page exists so the frame has
          one real destination.
        </p>
      </div>
    </DataPage>
  );
}
