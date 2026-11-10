"use client";

import Link from "next/link";
import { Monogram } from "@/components/brand/monogram";
import { Wordmark } from "@/components/brand/wordmark";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { navFor } from "@/lib/nav";
import { NavGroups } from "./nav-groups";
import { useShell } from "./shell-context";
import { WorkspaceSwitcher } from "./workspace-switcher";

/**
 * The rail on a narrow screen. One Menu control opens it, never two: it lives in the
 * top bar below the large breakpoint, which is exactly where the rail is gone.
 *
 * It carries the same mark the rail heads with, so the drawer reads as the rail moved
 * rather than a different surface. There is no close control: the backdrop, Escape and
 * choosing a destination all dismiss it, and a second way to leave the nav only competes
 * with the mark for the same corner.
 */
export function ShellDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { membership, workspace, portalContainer } = useShell();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        container={portalContainer}
        showCloseButton={false}
        className="w-[86%] max-w-[320px] p-0"
      >
        <SheetHeader className="flex-row items-center gap-2 border-hairline border-b px-3 py-2.5">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Link
            href="/dashboard"
            aria-label="Reportlee home"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-w-0 items-center gap-[3px] rounded-lg px-1 py-1"
          >
            <Monogram className="size-[25px]" />
            <Wordmark className="text-[30px] text-ink" />
          </Link>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
          <WorkspaceSwitcher collapsed={false} />
          <nav aria-label="Main">
            <NavGroups
              groups={navFor(membership.role).groups}
              aiFeatures={workspace.aiFeatures}
              onNavigate={() => onOpenChange(false)}
            />
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
