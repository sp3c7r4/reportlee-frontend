"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/dashboard/shell-context";
import { SAMPLE_NOTIFICATIONS } from "@/data/notifications";
import {
  type Notification,
  type NotificationCategory,
  FIXED_CATEGORIES,
  unreadCount,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

/** The bell's page. A count, never a dot: a dot cannot tell one from nine. */
export function NotificationsScreen() {
  const { membership, workspace } = useShell();
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Simulated GET /api/v1/notifications, scoped to this Membership.
    setItems(SAMPLE_NOTIFICATIONS);
    setLoaded(true);
  }, [membership.id]);

  const unread = unreadCount(items);

  const days = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const item of items) {
      const day = new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
        timeZone: workspace.timeZone,
      }).format(new Date(item.at));
      map.set(day, [...(map.get(day) ?? []), item]);
    }
    return [...map.entries()];
  }, [items, workspace.timeZone]);

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Notifications
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            {unread === 0 ? "Everything is read." : `${unread} unread`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/account/notifications"
            className="inline-flex min-h-11 items-center rounded-md border border-hairline px-3 text-[12.5px] text-ink/70 hover:bg-surface-muted sm:min-h-9"
          >
            Preferences
          </Link>
          <button
            type="button"
            onClick={() =>
              setItems((current) =>
                current.map((item) => ({ ...item, read: true })),
              )
            }
            disabled={unread === 0}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-ink px-3 text-[12.5px] text-surface disabled:opacity-40 sm:min-h-9"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
            Mark all read
          </button>
        </div>
      </header>

      {!loaded ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-surface-muted" />
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-hairline border-dashed px-4 py-8 text-center text-[13px] text-ink/60">
          Nothing has reached you yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {days.map(([day, rows]) => (
            <section key={day}>
              <h2 className="text-[11.5px] text-ink/50 uppercase tracking-wide">
                {day}
              </h2>
              <ul className="mt-1.5 flex list-none flex-col gap-1.5 p-0">
                {rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() =>
                        setItems((current) =>
                          current.map((row) =>
                            row.id === item.id ? { ...row, read: true } : row,
                          ),
                        )
                      }
                      className={cn(
                        "flex min-h-11 items-start justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5",
                        item.read
                          ? "hover:bg-surface-muted"
                          : "bg-surface-muted/50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] text-ink">{item.title}</p>
                        <p className="mt-0.5 text-[12px] text-ink/55">
                          {item.body}
                        </p>
                      </div>
                      {item.read ? null : (
                        <span
                          className="mt-1 size-2 shrink-0 rounded-full bg-ink/60"
                          aria-label="Unread"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  decisions: "Decisions",
  comments: "Comments",
  tasks: "Tasks",
  summaries: "Weekly summaries",
  invitations: "Invitations",
  security: "Security",
};

/** Preferences: the two fixed categories have no switch, because they cannot be off. */
export function NotificationPreferences() {
  const { user } = useShell();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    decisions: true,
    comments: true,
    tasks: true,
    summaries: false,
  });

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="mb-4">
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          Notification preferences
        </h1>
        <p className="mt-1 text-[13px] text-ink/60">
          These follow {user.name.split(" ")[0]} across every Workspace.
          Invitations and security notices are always on.
        </p>
      </header>

      <ul className="flex max-w-[640px] list-none flex-col gap-1.5 p-0">
        {(Object.keys(CATEGORY_LABEL) as NotificationCategory[]).map(
          (category) => {
            const fixed = FIXED_CATEGORIES.includes(category);
            const on = fixed || enabled[category];
            return (
              <li
                key={category}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-ink">
                    {CATEGORY_LABEL[category]}
                  </p>
                  {fixed ? (
                    <p className="text-[11.5px] text-ink/50">
                      Cannot be switched off.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${CATEGORY_LABEL[category]} notifications`}
                  disabled={fixed}
                  onClick={() =>
                    setEnabled((current) => ({
                      ...current,
                      [category]: !current[category],
                    }))
                  }
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    on ? "bg-ink" : "bg-ink/15",
                    fixed && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-surface transition-transform",
                      on ? "translate-x-[22px]" : "translate-x-0.5",
                    )}
                  />
                </button>
              </li>
            );
          },
        )}
      </ul>
    </div>
  );
}
