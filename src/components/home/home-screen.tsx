"use client";

import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Comment01Icon,
  FileEditIcon,
  SentIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/dashboard/shell-context";
import { CO_LEAGUE_ROSTER } from "@/data/members";
import {
  type Report,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
} from "@/data/reports";
import { SAMPLE_TASKS, type Task } from "@/data/tasks";
import { homeFor, type HomeViewer } from "@/lib/home";
import { draftKey, readDraft, savedReports } from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * Home answers one question: what needs you now, in this Workspace, this week. The
 * order is decided in `homeFor`, so a card cannot outrank the thing only you can do.
 */

const KIND_ICON = {
  submit: SentIcon,
  draft: FileEditIcon,
  review: Clock01Icon,
  missing: Comment01Icon,
  tasks: Task01Icon,
} as const;

export function HomeScreen() {
  const { membership, workspace, user } = useShell();
  const viewer: HomeViewer = {
    membershipId: membership.id,
    role: membership.role,
    space: membership.space,
  };

  const [reports, setReports] = useState<Report[] | null>(null);
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const saved = savedReports(window.localStorage, membership.id);
    setReports(SAMPLE_REPORTS.map((report) => saved[report.id] ?? report));
    setHasDraft(
      readDraft(
        window.localStorage,
        draftKey(membership.id, SAMPLE_PERIOD.id),
      ) !== null,
    );
    try {
      const raw = window.localStorage.getItem("reportlee.tasks");
      setTasks(raw ? (JSON.parse(raw) as Task[]) : SAMPLE_TASKS);
    } catch {
      setTasks(SAMPLE_TASKS);
    }
  }, [membership.id]);

  const home = useMemo(
    () =>
      homeFor({
        viewer,
        reports: reports ?? [],
        roster: CO_LEAGUE_ROSTER,
        tasks,
        period: SAMPLE_PERIOD,
        now: SAMPLE_NOW,
        hasDraft,
        readOnly: workspace.readOnly,
      }),
    [viewer, reports, tasks, hasDraft, workspace.readOnly],
  );

  const firstName = user.name.split(" ")[0];
  const loading = reports === null;

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            {home.period.label} · due{" "}
            {formatDeadline(home.period.dueAt, workspace.timeZone)}
            {home.period.isOpen ? "" : " · closed"}
          </p>
        </div>
        <p className="text-[12px] text-ink/50">{workspace.name}</p>
      </header>

      {workspace.readOnly ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          This Workspace is read-only. You can read everything and change
          nothing.
        </p>
      ) : null}

      {loading ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ) : home.attention.length === 0 ? (
        <div className="mt-4 rounded-lg border border-hairline border-dashed px-4 py-8 text-center">
          <p className="flex items-center justify-center gap-2 text-[13.5px] text-ink">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="size-4 text-success"
            />
            Nothing needs you right now.
          </p>
          <p className="mt-1 text-[12.5px] text-ink/55">
            {home.period.label} is in progress. New Reports appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid list-none gap-2 p-0 sm:grid-cols-2">
          {home.attention.map((item, index) => (
            <li key={item.kind}>
              <Link
                href={item.href}
                className={cn(
                  "group flex min-h-[92px] w-full flex-col justify-between gap-3 rounded-lg border border-hairline p-3.5 transition-colors hover:bg-surface-muted",
                  index === 0 && "sm:col-span-2",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md",
                      item.kind === "review" || item.kind === "missing"
                        ? "bg-warning/12 text-warning"
                        : item.kind === "tasks"
                          ? "bg-info/12 text-info"
                          : "bg-ink/[0.06] text-ink/70",
                    )}
                  >
                    <HugeiconsIcon
                      icon={KIND_ICON[item.kind]}
                      className="size-4"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-[13.5px] text-ink">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-ink/55">
                      {item.detail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  {item.count !== null ? (
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-medium text-[11.5px] text-ink/70 tabular-nums">
                      {item.count}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="inline-flex items-center gap-1 text-[12px] text-ink/60 group-hover:text-ink">
                    Open
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="size-3.5"
                    />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {home.decisions.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-medium text-[14px] text-ink">Recent decisions</h2>
          <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
            {home.decisions.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2 text-[13px] text-ink hover:bg-surface-muted"
                >
                  <span className="min-w-0 truncate">
                    {row.label}
                    <span className="ml-2 text-[11.5px] text-ink/50">
                      {row.detail}
                    </span>
                  </span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-3.5 shrink-0 text-ink/40"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDeadline(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}
