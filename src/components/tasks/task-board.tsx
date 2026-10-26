"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { CO_LEAGUE_ROSTER } from "@/data/members";
import { SAMPLE_NOW } from "@/data/reports";
import { type Task, SAMPLE_TASKS, type TaskStatus } from "@/data/tasks";
import { recordAudit } from "@/lib/audit";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import {
  assigneeProblem,
  DONE_DAYS,
  effectiveView,
  inDoneWindow,
  moveTask,
  overdue,
  type TaskViewer,
  type View,
  VIEW_LABEL,
  viewsFor,
  visibleTasks,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

/* @info - One move function serves the menu and the completion dialog, so a card
   cannot behave differently depending on how it was moved. */

const COLUMNS: Array<[TaskStatus, string]> = [
  ["todo", "To do"],
  ["doing", "Doing"],
  ["done", "Done"],
];

const TASKS_KEY = "reportlee.tasks";

function loadTasks(): Task[] {
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : SAMPLE_TASKS;
  } catch {
    return SAMPLE_TASKS;
  }
}

export function TaskBoard() {
  const { membership, workspace } = useShell();
  const viewer: TaskViewer = {
    membershipId: membership.id,
    role: membership.role,
    space: membership.space,
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>(() => viewsFor(viewer)[0] ?? "mine");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
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
    setTasks(loadTasks());
    setView((current) => effectiveView(viewer, current));
    setLoaded(true);
  }, [viewer]);

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
    gsap.set(card, { zIndex: 40, scale: 1.02, rotate: 1.2 });
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
      target = column;
      setOverColumn(column);
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
        duration: 0.22,
        ease: "power2.out",
      });

      const landed = target;
      if (!landed || landed === task.status) return;
      if (landed === "done") {
        setMoving({ task, status: landed });
        return;
      }
      apply(task, landed);
      setSettling(task.id);
      void next;
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const persist = (next: Task[]) => {
    setTasks(next);
    try {
      window.localStorage.setItem(TASKS_KEY, JSON.stringify(next));
    } catch {
      setNotice("That move could not be saved on this device.");
    }
  };

  const rows = useMemo(
    () =>
      visibleTasks({
        tasks,
        roster: CO_LEAGUE_ROSTER,
        viewer,
        view,
        filter: { overdue: overdueOnly },
        now: SAMPLE_NOW,
      }),
    [tasks, view, viewer, overdueOnly],
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

  const apply = (task: Task, status: TaskStatus, note?: string) => {
    const result = moveTask({
      task,
      status,
      viewer,
      view,
      now: new Date().toISOString(),
      note,
      readOnly: workspace.readOnly,
    });
    if (!result.ok) {
      setNotice(result.reason);
      return;
    }
    persist(tasks.map((row) => (row.id === task.id ? result.task : row)));
    recordAudit(window.localStorage, membership.id, {
      at: SAMPLE_NOW,
      actorMembershipId: membership.id,
      action: "task.moved",
      target: task.id,
      summary: `${COLUMNS.find(([key]) => key === status)?.[1] ?? status}`,
    });
    setNotice(
      `Moved to ${COLUMNS.find(([key]) => key === status)?.[1] ?? status}.`,
    );
  };

  const nameOf = (membershipId: string) =>
    CO_LEAGUE_ROSTER.find((member) => member.membershipId === membershipId)
      ?.name ?? "Former member";

  const canMove = (task: Task) =>
    effectiveView(viewer, view) === "mine" &&
    task.assigneeMembershipId === viewer.membershipId &&
    !workspace.readOnly;

  const columns = COLUMNS.map(([status, label]) => ({
    status,
    label,
    cards: rows.filter(
      (task) =>
        task.status === status && inDoneWindow(task, SAMPLE_NOW, showOlder),
    ),
    hidden:
      status === "done"
        ? rows.filter(
            (task) =>
              task.status === "done" &&
              !inDoneWindow(task, SAMPLE_NOW, showOlder),
          ).length
        : 0,
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

      {loaded ? (
        <div ref={board} className="mt-4 grid gap-3 lg:grid-cols-3">
          {columns.map((column) => (
            <section
              key={column.status}
              data-column={column.status}
              className={cn(
                "rounded-lg border border-hairline transition-colors",
                overColumn === column.status &&
                  "border-ink/40 bg-surface-muted",
              )}
            >
              <h2 className="flex items-center justify-between bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide">
                {column.label}
                <span className="tabular-nums">{column.cards.length}</span>
              </h2>

              <div className="flex flex-col gap-2 p-2">
                {column.cards.map((task) => {
                  const problem = assigneeProblem(task, CO_LEAGUE_ROSTER);
                  return (
                    <article
                      key={task.id}
                      data-card={task.id}
                      onPointerDown={(event) => startDrag(event, task)}
                      className={cn(
                        "rounded-md border border-hairline bg-surface p-3",
                        canMove(task) && "cursor-grab select-none",
                        dragging === task.id && "opacity-60 shadow-float",
                      )}
                    >
                      <p className="text-[13px] text-ink">{task.title}</p>
                      <p className="mt-1 text-[11.5px] text-ink/50">
                        {nameOf(task.assigneeMembershipId)} · due {task.dueAt}
                        {overdue(task, SAMPLE_NOW) ? " · overdue" : ""}
                      </p>
                      {task.completionNote ? (
                        <p className="mt-1 text-[11.5px] text-ink/60">
                          {task.completionNote}
                        </p>
                      ) : null}
                      {problem ? (
                        <p className="mt-1 text-[11.5px] text-warning">
                          {problem}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/dashboard/reports/${task.reportId}`}
                          className="min-h-9 rounded-md px-2 text-[11.5px] text-ink/60 leading-[2.25] hover:bg-surface-muted"
                        >
                          Its Report
                        </Link>
                        <MoveMenu
                          task={task}
                          canMove={canMove(task)}
                          onMove={(status) =>
                            status === "done"
                              ? setMoving({ task, status })
                              : apply(task, status)
                          }
                        />
                      </div>
                    </article>
                  );
                })}

                {column.cards.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[12.5px] text-ink/50">
                    Nothing here.
                  </p>
                ) : null}

                {column.hidden > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowOlder(true)}
                    className="min-h-11 rounded-md text-[12px] text-ink/60 underline"
                  >
                    Show {column.hidden} older (Done keeps {DONE_DAYS} days)
                  </button>
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
              if (moving) apply(moving.task, moving.status, note);
              setMoving(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </DataPage>
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
