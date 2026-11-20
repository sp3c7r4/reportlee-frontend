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
import { Button } from "@/components/ui/button";
import { CO_LEAGUE_ROSTER } from "@/data/members";
import {
  type Report,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
} from "@/data/reports";
import type { Task } from "@/data/tasks";
import { type HomeViewer, homeFor } from "@/lib/home";
import { reportErrorMessage } from "@/lib/report-errors";
import { savedReports } from "@/lib/reports";
import { loadOwnReports, type OwnReports } from "@/lib/reports-api";
import { viewsFor } from "@/lib/tasks";
import { listTasks } from "@/lib/tasks-api";
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
  const viewer: HomeViewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const [reports, setReports] = useState<Report[] | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksFailure, setTasksFailure] = useState<string | null>(null);
  const [tasksVersion, setTasksVersion] = useState(0);
  const [mine, setMine] = useState<(OwnReports & { now: string }) | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  /* @info - The viewer's own Report and the current period come from the server. The
     reviewer cards still read the sample data until the review slice. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the retry trigger
  useEffect(() => {
    let cancelled = false;
    setMine(null);
    setFailure(null);
    void loadOwnReports(workspace.id, {
      drafts: membership.role !== "admin",
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setFailure(reportErrorMessage(result));
        return;
      }
      setMine({ ...result.data, now: new Date().toISOString() });
    });
    return () => {
      cancelled = true;
    };
  }, [membership.role, version, workspace.id]);

  useEffect(() => {
    const saved = savedReports(window.localStorage, membership.id);
    setReports(SAMPLE_REPORTS.map((report) => saved[report.id] ?? report));
  }, [membership.id]);

  /* @info - Tasks come from the server in the viewer's first allowed view: Staff and
     Heads see what is assigned to them, Admins what they assigned. A failure shows one
     inline line and never blocks the rest of Home. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: tasksVersion is the retry trigger
  useEffect(() => {
    let cancelled = false;
    setTasksFailure(null);
    void listTasks(workspace.id, viewsFor(viewer)[0] ?? "mine").then(
      (result) => {
        if (cancelled) return;
        if (result.ok) {
          setTasks(result.data);
        } else {
          setTasks([]);
          setTasksFailure(reportErrorMessage(result));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [viewer, tasksVersion, workspace.id]);

  const home = useMemo(
    () =>
      homeFor({
        viewer,
        reports: reports ?? [],
        roster: CO_LEAGUE_ROSTER,
        tasks,
        period: SAMPLE_PERIOD,
        now: SAMPLE_NOW,
        readOnly: workspace.readOnly,
        mine: mine ?? undefined,
      }),
    [viewer, reports, tasks, mine, workspace.readOnly],
  );

  const firstName = user.name.split(" ")[0];
  const loading = reports === null || (mine === null && failure === null);

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            {greeting()}, {firstName}
          </h1>
          {mine ? (
            <p className="mt-1 text-[13px] text-ink/60">
              {home.period.label} · due{" "}
              {formatDeadline(home.period.dueAt, workspace.timeZone)}
              {home.period.isOpen ? "" : " · closed"}
            </p>
          ) : null}
        </div>
        <p className="text-[12px] text-ink/50">{workspace.name}</p>
      </header>

      {workspace.readOnly ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          This Workspace is read-only. You can read everything and change
          nothing.
        </p>
      ) : null}

      {tasksFailure ? (
        <p
          role="alert"
          className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink/70"
        >
          {tasksFailure}
          <button
            type="button"
            onClick={() => setTasksVersion((current) => current + 1)}
            className="min-h-11 text-ink underline sm:min-h-8"
          >
            Retry
          </button>
        </p>
      ) : null}

      {failure ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-hairline p-4"
        >
          <p className="text-[13.5px] text-ink">{failure}</p>
          <Button
            variant="outline"
            onClick={() => setVersion((current) => current + 1)}
            className="mt-2 min-h-11 rounded-md px-3 text-[13px] sm:min-h-9"
          >
            Retry
          </Button>
        </div>
      ) : loading ? (
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

      {mine && home.decisions.length > 0 ? (
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
