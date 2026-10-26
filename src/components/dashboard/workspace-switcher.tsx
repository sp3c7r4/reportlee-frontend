"use client";

import {
  ArrowDown01Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { useShell } from "./shell-context";

/**
 * The control under the mark. Switching is in memory only: the role, the Space and the
 * navigation change, the address does not, and a reload starts again from
 * ACTIVE_MEMBERSHIP_ID. Nothing here is a permission check.
 *
 * Collapsed, it keeps the Workspace tile and drops the name, and the list opens beside
 * the rail rather than inside it, because a 76px menu would clip every Workspace name.
 */
export function WorkspaceSwitcher({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const { membership, memberships, workspaceFor, selectMembership } =
    useShell();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const current = workspaceFor(membership);
  const initials = current.name.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={collapsed ? `${current.name}, switch workspace` : undefined}
        className={cn(
          "flex items-center gap-2.5 text-left transition-colors",
          collapsed
            ? "mx-auto size-11 justify-center rounded-full hover:bg-surface-muted"
            : "min-h-11 w-full rounded-xl border border-hairline bg-surface px-3 py-1.5 hover:bg-surface-muted",
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand font-semibold text-[12px] text-white">
          {initials}
        </span>
        <span className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
          <span className="block truncate font-medium text-[13px] text-ink">
            {current.name}
          </span>
          <span className="block text-[12px] text-ink/60">
            {current.memberCount} members
          </span>
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className={cn("size-3.5 shrink-0 text-ink/60", collapsed && "hidden")}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "z-30 rounded-2xl border border-hairline bg-popover p-1 shadow-float",
            collapsed
              ? "absolute top-0 left-full ml-2 w-[248px]"
              : "absolute inset-x-0 top-full mt-1",
          )}
        >
          {memberships.map((option) => {
            const workspace = workspaceFor(option);
            const currentOption = option.id === membership.id;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={currentOption}
                onClick={() => {
                  selectMembership(option.id);
                  setOpen(false);
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink/80 hover:bg-surface-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{workspace.name}</span>
                  <span className="block text-[12px] text-ink/60">
                    {workspace.memberCount} members ·{" "}
                    {option.space ?? "No Space"}
                  </span>
                </span>
                {currentOption ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2.2}
                    className="size-3.5 shrink-0 text-ink"
                  />
                ) : null}
              </button>
            );
          })}

          <div className="mt-1 border-hairline border-t pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink/80 hover:bg-surface-muted"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                strokeWidth={2}
                className="size-3.5"
              />
              Create workspace
            </button>
          </div>
        </div>
      ) : null}

      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
