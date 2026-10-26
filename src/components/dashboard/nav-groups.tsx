"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavGroup, NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

type NavGroupsProps = {
  groups: NavGroup[];
  aiFeatures: boolean;
  collapsed?: boolean;
  /** Runs after a destination is chosen, so the drawer can close itself. */
  onNavigate?: () => void;
};

/**
 * One renderer for the rail and the drawer, so the two cannot disagree about what a
 * role sees. Collapsed, each row keeps its icon and gains a tooltip; nothing is dropped.
 *
 * Group labels sit at 12px and ink/60: below that they measured under 4.5:1 on both
 * surfaces, which is unreadable for the people who need the grouping most.
 */
export function NavGroups({
  groups,
  aiFeatures,
  collapsed = false,
  onNavigate,
}: NavGroupsProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p
            className={cn(
              "px-3 font-medium text-[12px] text-ink/60 uppercase tracking-[0.12em]",
              collapsed && "sr-only",
            )}
          >
            {group.label}
          </p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {group.items.map((item) => (
              <li key={item.label}>
                <NavRow
                  item={item}
                  active={pathname === item.href}
                  disabled={item.disabledBy === "ai" && !aiFeatures}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NavRow({
  item,
  active,
  disabled,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  disabled: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (disabled) {
    const row = (
      <span
        aria-disabled="true"
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] text-ink/60",
          collapsed && "justify-center px-0",
        )}
      >
        <HugeiconsIcon
          icon={item.icon}
          strokeWidth={1.8}
          className="size-4 shrink-0"
        />
        <span className={cn("truncate", collapsed && "sr-only")}>
          {item.label}
        </span>
        <span className={cn("ml-auto text-[12px]", collapsed && "sr-only")}>
          AI off
        </span>
      </span>
    );

    if (!collapsed) return row;

    return (
      <Tooltip>
        <TooltipTrigger render={row} />
        <TooltipContent side="right">
          {item.label}: AI features are off
        </TooltipContent>
      </Tooltip>
    );
  }

  const row = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-ink/[0.05] font-medium text-ink"
          : "text-ink/70 hover:bg-ink/[0.035] hover:text-ink",
      )}
    >
      <HugeiconsIcon
        icon={item.icon}
        strokeWidth={1.8}
        className="size-4 shrink-0"
      />
      <span className={cn("truncate", collapsed && "sr-only")}>
        {item.label}
      </span>
    </Link>
  );

  if (!collapsed) return row;

  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
