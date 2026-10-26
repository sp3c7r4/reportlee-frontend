"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { labelForPath } from "@/lib/nav";
import { NotificationBell } from "./notification-bell";
import { useShell } from "./shell-context";

/**
 * Slim by design: breadcrumbs left, the bell and the page's single action right. The
 * action slot is filled by the page through TopBarAction, so the bar never guesses.
 * From md to lg this button is the one Menu control; below md the tab bar owns it,
 * and from lg the rail does.
 */
export function TopBar() {
  const { membership, openDrawer, assignActionSlot } = useShell();
  const pathname = usePathname();
  const label = labelForPath(membership.role, pathname) ?? "Dashboard";

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-hairline border-b px-3 sm:gap-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={openDrawer}
        aria-label="Open navigation"
        className="hidden md:inline-flex lg:hidden"
      >
        <HugeiconsIcon icon={Menu01Icon} strokeWidth={1.9} className="size-4" />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[12.5px]">
          <li className="text-ink/45">Dashboard</li>
          <li aria-hidden="true" className="text-ink/25">
            /
          </li>
          <li aria-current="page" className="truncate font-medium text-ink">
            {label}
          </li>
        </ol>
      </nav>

      <NotificationBell />

      {/* The page portals its single primary action in here. */}
      <div ref={assignActionSlot} className="flex items-center gap-2" />
    </div>
  );
}
