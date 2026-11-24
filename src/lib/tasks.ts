import type { RosterMember } from "../data/members";
import {
  type Priority,
  SAMPLE_TASKS,
  type Task,
  type TaskStatus,
} from "../data/tasks.ts";
import type { Role } from "./nav";

/**
 * The board's rules, with no React. One move function serves the drag, the phone menu
 * and the completion dialog, because three ideas of what a move does is three bugs.
 */

export type TaskViewer = {
  membershipId: string;
  role: Role;
  space: string | null;
};

export type View = "mine" | "by" | "space" | "all";

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/** The tone the chip takes. Priority is severity, so it never borrows the brand colour. */
export const PRIORITY_TONE: Record<
  Priority,
  "neutral" | "info" | "warning" | "danger"
> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** A task saved before priority existed reads as Medium rather than vanishing. */
export function priorityOf(task: Task): Priority {
  const stored = (task as { priority?: Priority }).priority;
  return stored && stored in PRIORITY_ORDER ? stored : "medium";
}

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (left, right) =>
      PRIORITY_ORDER[priorityOf(left)] - PRIORITY_ORDER[priorityOf(right)],
  );
}

export const VIEW_LABEL: Record<View, string> = {
  mine: "Assigned to me",
  by: "Assigned by me",
  space: "My Space",
  all: "Everyone",
};

export function viewsFor(viewer: TaskViewer): View[] {
  if (viewer.role === "staff") return ["mine"];
  if (viewer.role === "head") return ["mine", "by", "space"];
  // An Admin authors no Reports, so "Assigned to me" would read as their own work.
  return ["by", "all"];
}

export function effectiveView(viewer: TaskViewer, requested: View): View {
  const allowed = viewsFor(viewer);
  return allowed.includes(requested) ? requested : (allowed[0] ?? "mine");
}

/** Whether a press on a card lifts it for a drag. */
export function startsDrag(input: {
  canMove: boolean;
  pointerType: string;
  /** The press began on a button, link or field inside the card. */
  onControl: boolean;
}): boolean {
  if (!input.canMove) return false;
  /* @info - A drag takes the pointer and turns the card's hit testing off, so a press
     on "Move to" or "Show report" never became a click. Controls keep their press. */
  if (input.onControl) return false;
  return input.pointerType !== "touch";
}

/** The selector a card's press is checked against for `onControl`. */
export const CARD_CONTROLS = "button, a, input, select, textarea, label";

const VIEW_EMPTY: Record<View, string> = {
  mine: "Nothing is assigned to you.",
  by: "You have not assigned any tasks.",
  space: "Nobody in your Space has a task.",
  all: "There are no tasks in this Workspace.",
};

export type EmptyBoard = {
  message: string;
  /** How to get a task onto this board, with where to start. */
  hint: { text: string; href: string; label: string } | null;
  /** Where this person's own tasks live when this Workspace cannot hold any. */
  elsewhere: string | null;
};

/** What an empty board says. */
export function emptyBoard(input: {
  view: View;
  overdueOnly: boolean;
  role: Role;
  /** Names of other Workspaces where this person is Staff or Head. */
  assignableIn: string[];
}): EmptyBoard {
  if (input.overdueOnly) {
    return { message: "Nothing is overdue.", hint: null, elsewhere: null };
  }
  /* @info - A task is only made from a comment on a report (design D14), so an assigner
     looking at an empty board is told where that starts. */
  const assigner = input.view === "by" || input.view === "all";
  const hint = assigner
    ? {
        text: "To assign a task, open a report and add a follow-up from a comment.",
        href: "/dashboard/review",
        label: "Open Review",
      }
    : null;
  /* @info - An Admin is never an assignee, so someone who is Staff elsewhere and lands
     here as Admin would otherwise read the board as having lost their tasks. */
  const elsewhere =
    input.role === "admin" && input.assignableIn.length > 0
      ? `You are an Admin in this Workspace, so no task is assigned to you here. Tasks assigned to you are in ${input.assignableIn.join(", ")}. Switch Workspace to see them.`
      : null;
  return { message: VIEW_EMPTY[input.view], hint, elsewhere };
}

function spaceOf(roster: RosterMember[], membershipId: string): string | null {
  return (
    roster.find((member) => member.membershipId === membershipId)?.space ?? null
  );
}

export type TaskFilter = { overdue: boolean };

export function visibleTasks(input: {
  tasks: Task[];
  roster: RosterMember[];
  viewer: TaskViewer;
  view: View;
  filter?: TaskFilter;
  now?: string;
}): Task[] {
  const view = effectiveView(input.viewer, input.view);

  const rows = input.tasks.filter((task) => {
    if (view === "mine")
      return task.assigneeMembershipId === input.viewer.membershipId;
    if (view === "by")
      return task.assignedByMembershipId === input.viewer.membershipId;
    if (view === "space") {
      return (
        spaceOf(input.roster, task.assigneeMembershipId) === input.viewer.space
      );
    }
    return true;
  });

  if (!input.filter?.overdue || !input.now) return rows;
  return rows.filter((task) => overdue(task, input.now as string));
}

/** Done is a 14 day window; `showOlder` reveals the rest on purpose. */
export const DONE_DAYS = 14;

export function inDoneWindow(
  task: Task,
  now: string,
  showOlder: boolean,
): boolean {
  if (task.status !== "done") return true;
  if (showOlder) return true;
  if (!task.completedAt) return true;
  const completed = Date.parse(task.completedAt);
  return Date.parse(now) - completed <= DONE_DAYS * 86_400_000;
}

export function overdue(task: Task, now: string): boolean {
  if (task.status === "done") return false;
  return Date.parse(task.dueAt) < Date.parse(now.slice(0, 10));
}

export function dueProblem(date: string, now: string): string | null {
  if (date.trim() === "") return "A due date is required.";
  const today = now.slice(0, 10);
  if (Date.parse(date) < Date.parse(today)) {
    return `Choose today or later. ${today} is the earliest allowed.`;
  }
  return null;
}

export function assigneeProblem(
  task: Task,
  roster: RosterMember[],
): string | null {
  const assignee = roster.find(
    (member) => member.membershipId === task.assigneeMembershipId,
  );
  if (!assignee) return "The assignee has left. Reassign this task.";
  if (!assignee.active) {
    return "The assignee was deactivated. An Admin can reassign this task.";
  }
  return null;
}

export type MoveResult =
  | { ok: true; task: Task; reason: null }
  | { ok: false; task: Task; reason: string };

export function moveTask(input: {
  task: Task;
  status: TaskStatus;
  viewer: TaskViewer;
  view: View;
  now: string;
  note?: string | null;
  file?: Task["completionFile"];
  readOnly?: boolean;
}): MoveResult {
  const { task, viewer } = input;

  if (input.readOnly) {
    return {
      ok: false,
      task,
      reason: "This Workspace is read-only, so the board cannot be changed.",
    };
  }
  if (effectiveView(viewer, input.view) !== "mine") {
    return {
      ok: false,
      task,
      reason:
        "Only the assignee moves this card. Open Assigned to me to move it.",
    };
  }
  if (task.assigneeMembershipId !== viewer.membershipId) {
    return {
      ok: false,
      task,
      reason: "Only the assignee moves this card.",
    };
  }

  const leavingDone = task.status === "done" && input.status !== "done";

  return {
    ok: true,
    task: {
      ...task,
      status: input.status,
      completedAt: input.status === "done" ? input.now : null,
      completionNote: leavingDone
        ? null
        : input.status === "done"
          ? (input.note ?? task.completionNote)
          : null,
      completionFile: leavingDone
        ? null
        : input.status === "done"
          ? (input.file ?? task.completionFile)
          : null,
    },
    reason: null,
  };
}

/** A task starts from a review comment, so the caller passes the comment's report. */
export function newTask(input: {
  reportId: string;
  title: string;
  assigneeMembershipId: string;
  assignedByMembershipId: string;
  dueAt: string;
  priority: Priority;
  now: string;
  id: string;
}): Task {
  return {
    id: input.id,
    reportId: input.reportId,
    title: input.title,
    assigneeMembershipId: input.assigneeMembershipId,
    assignedByMembershipId: input.assignedByMembershipId,
    dueAt: input.dueAt,
    status: "todo",
    priority: input.priority,
    completionNote: null,
    completionFile: null,
    completedAt: null,
    createdAt: input.now,
  };
}

export { SAMPLE_TASKS };
