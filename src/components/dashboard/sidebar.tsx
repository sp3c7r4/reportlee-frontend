"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Monogram } from "@/components/brand/monogram";
import { Wordmark } from "@/components/brand/wordmark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navFor } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { NavGroups } from "./nav-groups";
import { useShell } from "./shell-context";
import { SidebarFooter } from "./sidebar-footer";
import { WorkspaceSwitcher } from "./workspace-switcher";

/**
 * The rail. The mark says whose product this is, the switcher says where you are,
 * search sits above the navigation and the person sits below it.
 *
 * Collapsing keeps every destination: the mark stays, the switcher keeps its tile, the
 * search field becomes an icon, the navigation becomes icons with tooltips, and the
 * person becomes their avatar. The width animates in the shell, and the choice is
 * remembered on the device.
 */
export function Sidebar() {
  const { membership, workspace, collapsed, toggleCollapsed } = useShell();

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 p-3",
        collapsed && "items-stretch px-2",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          collapsed && "flex-col gap-1.5",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Reportlee home"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-xl px-1 py-1",
            collapsed && "px-0",
          )}
        >
          {collapsed ? (
            <Monogram className="size-7" />
          ) : (
            // The mark runs smaller here than in the site header: in a rail it competes
            // with the workspace tile right below it, so it reads as a sign-off, not a banner.
            <span className="inline-flex items-center gap-[3px]">
              <Monogram className="size-[25px]" />
              <Wordmark className="text-[30px] text-ink" />
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg text-ink/60 transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink/40 focus-visible:outline-offset-2",
            collapsed ? "mx-auto" : "ml-auto",
          )}
        >
          <HugeiconsIcon
            icon={collapsed ? ArrowRight01Icon : ArrowLeft01Icon}
            strokeWidth={2}
            className="size-3.5"
          />
        </button>
      </div>

      <WorkspaceSwitcher collapsed={collapsed} />

      <SearchField collapsed={collapsed} />

      <nav
        aria-label="Main"
        className="rail-scroll min-h-0 flex-1 overflow-y-auto px-1"
      >
        <NavGroups
          groups={navFor(membership.role).groups}
          aiFeatures={workspace.aiFeatures}
          collapsed={collapsed}
        />
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </div>
  );
}

/**
 * Search opens the overlay with Ctrl K or Cmd K. The hint names the platform's own
 * modifier, because a Mac user reading Ctrl K learns the wrong habit on the first day.
 */
function SearchField({ collapsed }: { collapsed: boolean }) {
  const { openSearch } = useShell();
  const [modifier, setModifier] = useState("Ctrl");

  useEffect(() => {
    // userAgentData is not in the DOM types yet, and platform alone misses iPads.
    const uaData = (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData;
    const platform =
      uaData?.platform ?? navigator.platform ?? navigator.userAgent;
    setModifier(/mac|iphone|ipad|ipod/i.test(platform) ? "⌘" : "Ctrl");
  }, []);

  const hint = `${modifier} K`;

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={openSearch}
                aria-label={`Search. Shortcut ${hint}`}
                className="grid size-10 place-items-center rounded-xl border border-hairline bg-surface text-ink/60"
              />
            }
          >
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={1.8}
              className="size-4"
            />
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label={`Search. Shortcut ${hint}`}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-[13px] text-ink/60 hover:bg-surface-muted"
    >
      <HugeiconsIcon icon={Search01Icon} strokeWidth={1.8} className="size-4" />
      <span className="flex-1 text-left">Search</span>
      <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[12px] text-ink/60">
        {hint}
      </kbd>
    </button>
  );
}
