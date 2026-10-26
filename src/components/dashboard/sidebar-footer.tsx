"use client";

import {
  BellIcon,
  Logout01Icon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL } from "@/data/viewer";
import { clearReportStateFor } from "@/lib/reports";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

const rowClass =
  "min-h-11 cursor-pointer gap-2.5 rounded-xl px-2.5 text-[13px]";

/**
 * The person, as one compact row that opens the account menu. The Workspace name is
 * deliberately absent: the switcher directly above already says where you are, and a
 * third copy of it in the footer was noise.
 *
 * The menu is the installation's dropdown, so arrow keys, Escape and focus return work
 * without being re-implemented. Profile and Notification preferences are honest shells:
 * disabled, with the reason in the label, until their screens exist.
 */
export function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  const { user, membership, portalContainer, theme, setTheme } = useShell();
  const router = useRouter();

  function signOut() {
    // A shared device must not hand the next person someone else's draft.
    clearReportStateFor(window.localStorage, membership.id);
    clearSession();
    router.replace("/login");
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-2">
      <PlanUsage collapsed={collapsed} />

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account menu for ${user.name}`}
          className={cn(
            "flex items-center gap-2.5 text-left transition-colors",
            // Collapsed, the avatar is the control: no box around it, because a bordered
            // card holding a single circle reads as an empty slot.
            collapsed
              ? "mx-auto size-11 justify-center rounded-full hover:bg-surface-muted"
              : "min-h-11 w-full rounded-xl border border-hairline bg-surface px-2.5 py-2 hover:bg-surface-muted",
          )}
        >
          <span
            className={cn(
              // A neutral chip rather than an inverted slab: the white circle read as a card
              // fragment sitting inside the rail, and the workspace tile above already owns
              // the one filled shape in this column.
              "grid shrink-0 place-items-center rounded-full bg-surface-muted font-medium text-ink ring-1 ring-hairline",
              collapsed ? "size-9 text-[12px]" : "size-8 text-[12px]",
            )}
          >
            {initials}
          </span>
          <span className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <span className="block truncate font-medium text-[13px] text-ink">
              {user.name}
            </span>
            <span className="block truncate text-[12px] text-ink/60">
              {ROLE_LABEL[membership.role]}
              {membership.space ? ` · ${membership.space}` : ""}
            </span>
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          container={portalContainer}
          align="end"
          side="top"
          className="w-[248px] p-1.5"
        >
          {/* A plain block, not DropdownMenuLabel: base-ui's GroupLabel needs a Group
              parent, and wrapping a header in one just to satisfy it adds a role nobody
              needs. */}
          <div className="px-2.5 py-2">
            <span className="block truncate font-medium text-[13px] text-ink">
              {user.name}
            </span>
            <span className="block truncate text-[12px] text-ink/60">
              {user.email}
            </span>
            <span className="block truncate text-[12px] text-ink/60">
              {ROLE_LABEL[membership.role]}
              {membership.space ? ` · ${membership.space}` : ""}
            </span>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled className={rowClass}>
            <HugeiconsIcon
              icon={UserIcon}
              strokeWidth={1.8}
              className="size-4"
            />
            Profile
            <span className="ml-auto text-[12px] text-ink/60">Soon</span>
          </DropdownMenuItem>

          <DropdownMenuItem disabled className={rowClass}>
            <HugeiconsIcon
              icon={BellIcon}
              strokeWidth={1.8}
              className="size-4"
            />
            Notification preferences
            <span className="ml-auto text-[12px] text-ink/60">Soon</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-1 font-medium text-[12px] text-ink/60 uppercase tracking-[0.12em]">
              Theme
            </DropdownMenuLabel>
            {(["light", "dark"] as const).map((value) => (
              <DropdownMenuItem
                key={value}
                className={rowClass}
                onClick={() => setTheme(value)}
                aria-checked={theme === value}
              >
                <span className="grid size-4 place-items-center">
                  {theme === value ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2.2}
                      className="size-3.5"
                    />
                  ) : null}
                </span>
                <span className="capitalize">{value}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem className={rowClass} onClick={signOut}>
            <HugeiconsIcon
              icon={Logout01Icon}
              strokeWidth={1.8}
              className="size-4"
            />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Starter draws the bar against the limit, Team shows the count alone. At the limit the
 * line says so; from 90% the bar turns to the warning tone, because orange is the brand
 * voice here and a full bar is a different message.
 */
function PlanUsage({ collapsed = false }: { collapsed?: boolean }) {
  const { membership, workspace } = useShell();
  if (membership.role !== "admin") return null;

  const limit = workspace.memberLimit;
  const used = workspace.memberCount;
  const atLimit = limit !== null && used >= limit;
  const nearLimit = limit !== null && used / limit >= 0.9;

  if (collapsed) {
    // The count, not a mystery glyph: at 76px there is room for the number and no room
    // for a sentence, and a lone arrow icon read as an unexplained button.
    return (
      <div
        title={
          limit === null ? `${used} members` : `${used} of ${limit} members`
        }
        className="grid min-h-11 place-items-center rounded-xl border border-hairline bg-surface"
      >
        <span
          className={cn(
            "text-[12px]",
            atLimit ? "text-warning" : "text-ink/70",
          )}
        >
          {limit === null ? used : `${used}/${limit}`}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-[12px] text-ink/60 uppercase tracking-[0.12em]">
          {workspace.plan === "starter" ? "Starter" : "Team"}
        </p>
        <p className="text-[12px] text-ink/70">
          {limit === null ? `${used} members` : `${used} / ${limit}`}
        </p>
      </div>

      {limit === null ? null : (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
          aria-label="Members used"
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className={cn(
              "h-full rounded-full",
              nearLimit ? "bg-warning" : "bg-brand",
            )}
            style={{
              width: `${Math.min(100, Math.round((used / limit) * 100))}%`,
            }}
          />
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[12px]",
            atLimit ? "text-warning" : "text-ink/60",
          )}
        >
          {atLimit ? "Limit reached" : "Members"}
        </p>
        <a
          href="/dashboard/settings"
          className="text-[12px] text-ink/60 underline-offset-4 hover:text-ink hover:underline"
        >
          Upgrade
        </a>
      </div>
    </div>
  );
}
