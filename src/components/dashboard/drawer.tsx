"use client";

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
 * The sheet traps focus and closes on Escape on its own; choosing a destination closes
 * it too, so the page underneath is not covered by a stale drawer.
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
        className="w-[86%] max-w-[320px] p-0"
      >
        <SheetHeader className="border-hairline border-b p-3">
          <SheetTitle className="text-left text-[13px]">Navigation</SheetTitle>
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
