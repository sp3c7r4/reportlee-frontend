"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

/**
 * The phone's own list, read from the nav module and never derived from the rail:
 * five destinations plus Menu, which opens the drawer the rail becomes below lg.
 *
 * Hidden from md up, where the top bar's Menu control takes over, so the frame
 * never shows two Menu controls at once. The inset padding keeps the last row
 * clear of a phone's home indicator.
 */
export function TabBar() {
  const { membership, workspace, openDrawer } = useShell();
  const pathname = usePathname();
  const tabs = navFor(membership.role).tabs;
  const aiOff = !workspace.aiFeatures;

  return (
    <nav
      aria-label="Primary"
      // `bg-popover` is the lifted surface: white on the light page, one step above the
      // dark page. On `bg-surface` the card dissolved into the page it floats over.
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-[20px] bg-popover shadow-float md:hidden"
    >
      <ul className="m-0 flex list-none items-stretch px-1.5 py-1.5">
        {tabs.map((tab) => {
          const disabled = tab.disabledBy === "ai" && aiOff;
          const active = !disabled && tab.href === pathname;
          const icon = (
            <HugeiconsIcon
              icon={tab.icon}
              strokeWidth={1.9}
              className="size-[22px]"
            />
          );

          return (
            <li key={tab.label} className="flex-1">
              {tab.opens === "drawer" || disabled ? (
                <button
                  type="button"
                  onClick={tab.opens === "drawer" ? openDrawer : undefined}
                  aria-disabled={disabled || undefined}
                  aria-label={
                    disabled
                      ? `${tab.label}, AI is off on this plan`
                      : undefined
                  }
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center justify-center gap-1.5 rounded-3xl px-1 py-1.5",
                    disabled
                      ? "cursor-not-allowed text-ink/30"
                      : "text-ink/60 hover:bg-surface-muted",
                  )}
                >
                  {icon}
                  <span className="text-[11.5px] leading-none">
                    {tab.label}
                  </span>
                </button>
              ) : (
                <Link
                  href={tab.href ?? "/dashboard"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center justify-center gap-1.5 rounded-[14px] px-1 py-1.5 transition-colors",
                    active ? "text-ink" : "text-ink/60 hover:bg-surface-muted",
                  )}
                >
                  {icon}
                  <span
                    className={cn(
                      "text-[11.5px] leading-none tracking-[0.01em]",
                      active && "font-medium",
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
