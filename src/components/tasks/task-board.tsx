"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { useShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Priority, Task, TaskStatus } from "@/data/tasks";
import type { ApiMember } from "@/lib/api-types";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { listMembers } from "@/lib/members";
import { reportErrorMessage } from "@/lib/report-errors";
import {
  assigneeProblem,
  effectiveView,
  moveTask,
  overdue,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  priorityOf,
  sortByPriority,
  type TaskViewer,
  VIEW_LABEL,
  type View,
  viewsFor,
} from "@/lib/tasks";
import { listTasks, updateTaskStatus } from "@/lib/tasks-api";
import { cn } from "@/lib/utils";

/* @info - One move function serves the menu and the completion dialog, so a card
   cannot behave differently depending on how it was moved. */

const COLUMNS: Array<[TaskStatus, string]> = [
  ["todo", "To do"],
  ["doing", "Doing"],
  ["done", "Done"],
];

const VIEW_EMPTY: Record<View, string> = {
  mine: "Nothing is assigned to you.",
  by: "You have not assigned any tasks.",
  space: "Nobody in your Space has a task.",
  all: "There are no tasks in this Workspace.",
};

export function TaskBoard() {
  const { membership, workspace } = useShell();
  // Stable identity: a fresh object every render would re-run the effect below forever.
  const viewer: TaskViewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [roster, setRoster] = useState<ApiMember[] | null>(null);
  const [view, setView] = useState<View>(() => viewsFor(viewer)[0] ?? "mine");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moving, setMoving] = useState<{
    task: Task;
    status: TaskStatus;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);

  /* @info - Motion is GSAP only, and only when the person allows it. Drag itself is
     native: a pointer lift that refuses to move is worse than no drag at all. */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (!settling) return;
        const card = board.current?.querySelector<HTMLElement>(
          `[data-card="${settling}"]`,
        );
        if (!card) return;
        gsap.fromTo(
          card,
          { y: -10, opacity: 0.55, scale: 0.99 },
          { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: "power2.out" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [settling], scope: board },
  );

  useEffect(() => {
    setView((current) => effectiveView(viewer, current));
  }, [viewer]);

  /* @info - The server filters by view and keeps Done to 14 days, so the board only
     asks again when the view, the Workspace or the retry counter changes. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the retry trigger
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setFailure(null);
    void Promise.all([
      listTasks(workspace.id, effectiveView(viewer, view)),
      listMembers(workspace.id),
    ]).then(([result, people]) => {
      if (cancelled) return;
      setRoster(people.ok ? people.data : null);
      if (!result.ok) {
        setFailure(reportErrorMessage(result));
        setTasks([]);
      } else {
        setTasks(result.data);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [view, viewer, version, workspace.id]);

  /**
   * Pointer drag, not native HTML5 drag: the native path silently refuses in some
   * browsers and gives no way to tell a person why. Touch is excluded on purpose, so a
   * finger scrolls the page and the Move to menu is the phone's way to move a card.
   */
  const startDrag = (event: React.PointerEvent<HTMLElement>, task: Task) => {
    if (!canMove(task)) return;
    if (event.pointerType === "touch") return;
    event.preventDefault();

    const card = event.currentTarget;
    const origin = { x: event.clientX, y: event.clientY };
    let target: TaskStatus | null = null;
    const follow = gsap.quickTo(card, "x", {
      duration: 0.12,
      ease: "power2.out",
    });
    const followY = gsap.quickTo(card, "y", {
      duration: 0.12,
      ease: "power2.out",
    });

    setDragging(task.id);
    // The card sits under the cursor while it moves, so it must not answer the hit
    // test, or the column it came from is the only one ever found.
    gsap.set(card, {
      zIndex: 40,
      scale: 1.02,
      rotate: 1.2,
      pointerEvents: "none",
    });
    card.style.cursor = "grabbing";
    // Window listeners, so the card keeps following even when the pointer leaves it.
    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      /* capture is a nicety, not the mechanism */
    }

    const move = (next: PointerEvent) => {
      follow(next.clientX - origin.x);
      followY(next.clientY - origin.y);
      const under = document
        .elementFromPoint(next.clientX, next.clientY)
        ?.closest<HTMLElement>("[data-column]");
      const column = (under?.dataset.column as TaskStatus | undefined) ?? null;
      // Its own column is not a target: highlighting it reads as a refusal.
      const nextTarget = column && column !== task.status ? column : null;
      target = nextTarget;
      setOverColumn(nextTarget);
    };

    const end = (next: PointerEvent) => {
      try {
        card.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      card.style.cursor = "";
      setOverColumn(null);
      setDragging(null);
      gsap.to(card, {
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        zIndex: 0,
        pointerEvents: "auto",
        duration: 0.22,
        ease: "power2.out",
      });

      const landed = target;
      if (!landed || landed === task.status) return;
      if (landed === "done") {
        setMoving({ task, status: landed });
        return;
      }
      void apply(task, landed).then((moved) => {
        if (moved) setSettling(task.id);
      });
      void next;
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const today = useMemo(() => new Date().toISOString(), []);

  const rows = useMemo(
    () => (overdueOnly ? tasks.filter((task) => overdue(task, today)) : tasks),
    [tasks, overdueOnly, today],
  );

  /* @info - A drag that ends anywhere, including outside the board, must put the card
     back down. GSAP holds the lift, React only holds which card is lifted. */
  useEffect(() => {
    if (dragging) return;
    if (!window.matchMedia(MOTION_OK).matches) return;
    const lifted = board.current?.querySelectorAll<HTMLElement>("[data-card]");
    if (!lifted) return;
    gsap.to(lifted, { scale: 1, rotate: 0, duration: 0.2, ease: "power2.out" });
  }, [dragging]);

  /* @info - The local guard answers first, so a move the server would refuse never
     leaves the page. The server answer replaces the card; a refusal leaves it where
     it was and says why. Moves are allowed in a read-only Workspace (design D21). */
  const apply = useCallback(
    async (task: Task, status: TaskStatus, note?: string): Promise<boolean> => {
      if (moveBusy) return false;
      const local = moveTask({
        task,
        status,
        viewer,
        view,
        now: new Date().toISOString(),
        note,
      });
      if (!local.ok) {
        setNotice(local.reason);
        return false;
      }
      setMoveBusy(true);
      const result = await updateTaskStatus(task.id, { status, note });
      setMoveBusy(false);
      if (!result.ok) {
        setNotice(reportErrorMessage(result));
        return false;
      }
      setTasks((current) =>
        current.map((row) => (row.id === task.id ? result.data : row)),
      );
      setNotice(
        `Moved to ${COLUMNS.find(([key]) => key === status)?.[1] ?? status}.`,
      );
      return true;
    },
    [moveBusy, view, viewer],
  );

  const nameOf = (membershipId: string) =>
    roster?.find((member) => member.membershipId === membershipId)?.name ??
    "Former member";

  const canMove = (task: Task) =>
    effectiveView(viewer, view) === "mine" &&
    task.assigneeMembershipId === viewer.membershipId;

  const columns = COLUMNS.map(([status, label]) => ({
    status,
    label,
    cards: sortByPriority(rows.filter((task) => task.status === status)),
  }));

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Tasks
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            Follow-ups raised from a review comment. Due dates are in{" "}
            {workspace.timeZone}.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {viewsFor(viewer).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            className={cn(
              "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
              view === option
                ? "border-ink bg-ink text-surface"
                : "border-hairline text-ink/70 hover:bg-surface-muted",
            )}
          >
            {VIEW_LABEL[option]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOverdueOnly((current) => !current)}
          aria-pressed={overdueOnly}
          className={cn(
            "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
            overdueOnly
              ? "border-warning/40 bg-warning/15 text-warning"
              : "border-hairline text-ink/70 hover:bg-surface-muted",
          )}
        >
          Overdue
        </button>
      </div>

      {notice ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </p>
      ) : null}

      {!loaded ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-surface-muted" />
      ) : null}

      {loaded && failure ? (
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
      ) : null}

      {loaded && !failure && rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-hairline border-dashed px-4 py-8 text-center text-[13px] text-ink/60">
          {overdueOnly ? "Nothing is overdue." : VIEW_EMPTY[view]}
        </p>
      ) : null}

      {loaded && !failure && rows.length > 0 ? (
        <div ref={board} className="mt-4 grid gap-3 lg:grid-cols-3">
          {columns.map((column) => (
            <section
              key={column.status}
              data-column={column.status}
              className={cn(
                "rounded-xl border border-hairline transition-colors",
                overColumn === column.status
                  ? "border-ink/40 bg-ink/[0.06]"
                  : "bg-surface-muted/40",
              )}
            >
              <h2 className="flex items-center gap-1.5 border-hairline border-b px-3 py-2">
                <span
                  className={cn(
                    "rounded-md px-2 py-1 font-semibold text-[11.5px]",
                    column.status === "todo" && "bg-ink text-surface",
                    column.status === "doing" &&
                      "bg-sun text-ink dark:text-white",
                    column.status === "done" && "bg-success text-surface",
                  )}
                >
                  {column.label}
                </span>
                <span className="grid min-w-5 place-items-center rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink/60 tabular-nums">
                  {column.cards.length}
                </span>
              </h2>

              <div className="flex flex-col gap-2 p-2">
                {column.cards.map((task) => {
                  const problem = roster ? assigneeProblem(task, roster) : null;
                  return (
                    <article
                      key={task.id}
                      data-card={task.id}
                      onPointerDown={(event) => startDrag(event, task)}
                      className={cn(
                        "rounded-lg border border-hairline bg-surface p-3",
                        canMove(task) && "cursor-grab select-none",
                        dragging === task.id && "opacity-60 shadow-float",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-[13px] text-ink leading-snug">
                          {task.title}
                        </p>
                        <PriorityChip priority={priorityOf(task)} />
                      </div>

                      <p className="mt-1.5 text-[11.5px] text-ink/55 leading-[1.5]">
                        {nameOf(task.assigneeMembershipId)}
                        <span className="text-ink/25"> · </span>
                        <span className="tabular-nums">
                          due {shortDate(task.dueAt)}
                        </span>
                        {overdue(task, today) ? (
                          <>
                            <span className="text-ink/25"> · </span>
                            <span className="font-medium text-destructive">
                              overdue
                            </span>
                          </>
                        ) : null}
                      </p>

                      {task.completionNote ? (
                        <p className="mt-2 rounded-md bg-surface-muted px-2 py-1.5 text-[11.5px] text-ink/65">
                          {task.completionNote}
                        </p>
                      ) : null}
                      {problem ? (
                        <p className="mt-2 text-[11.5px] text-warning">
                          {problem}
                        </p>
                      ) : null}

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-hairline border-t pt-2.5">
                        <Link
                          href={`/dashboard/reports/${task.reportId}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-md bg-brand px-2.5 text-[11.5px] font-medium text-surface hover:bg-brand-hover"
                        >
                          Show report
                        </Link>
                        <MoveMenu
                          task={task}
                          canMove={canMove(task)}
                          onMove={(status) =>
                            status === "done"
                              ? setMoving({ task, status })
                              : void apply(task, status)
                          }
                        />
                      </div>
                    </article>
                  );
                })}

                {column.cards.length === 0 ? (
                  <p className="grid min-h-[132px] place-items-center rounded-lg border border-hairline border-dashed px-2 text-center text-[12px] text-ink/45">
                    Nothing here.
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <Dialog
        open={moving !== null}
        onOpenChange={(open) => !open && setMoving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete this task</DialogTitle>
            <DialogDescription>
              A note is optional. Moving the card out of Done later clears it,
              because a completion on unfinished work is a lie.
            </DialogDescription>
          </DialogHeader>
          <CompletionForm
            onConfirm={(note) => {
              if (moving) void apply(moving.task, moving.status, note);
              setMoving(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </DataPage>
  );
}

/** Solid tags: blue for Medium as asked, amber for High, red for Critical. */
const PRIORITY_TONE_CLASS = {
  neutral: "bg-surface-muted text-ink/70",
  info: "bg-info text-surface",
  warning: "bg-sun text-ink dark:text-white",
  danger: "bg-destructive text-surface",
} as const;

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-sm px-1.5 py-0.5 font-medium text-[10.5px]",
        PRIORITY_TONE_CLASS[PRIORITY_TONE[priority]],
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function MoveMenu({
  task,
  canMove,
  onMove,
}: {
  task: Task;
  canMove: boolean;
  onMove: (status: TaskStatus) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {COLUMNS.filter(([status]) => status !== task.status).map(
        ([status, label]) => (
          <button
            key={status}
            type="button"
            disabled={!canMove}
            title={canMove ? undefined : "Only the assignee moves this card."}
            onClick={() => onMove(status)}
            className="min-h-9 rounded-md bg-surface-muted px-2 text-[11.5px] text-ink/70 disabled:opacity-40"
          >
            Move to {label}
          </button>
        ),
      )}
    </div>
  );
}

function CompletionForm({ onConfirm }: { onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");

  return (
    <>
      <label
        className="block text-[12px] text-ink/60"
        htmlFor="completion-note"
      >
        Note (optional)
        <textarea
          id="completion-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-transparent bg-surface-muted px-3 py-2 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        />
      </label>
      <DialogFooter>
        <Button
          onClick={() => onConfirm(note)}
          className="min-h-11 gap-1.5 rounded-md bg-ink px-3 text-[12.5px] text-surface"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
          Mark done
        </Button>
      </DialogFooter>
    </>
  );
}
