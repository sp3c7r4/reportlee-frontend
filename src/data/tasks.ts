import { SAMPLE_NOW } from "./reports.ts";

/**
 * A follow-up task. It always starts from a review comment, so a task and the
 * comment that asked for it share one conversation.
 */
export type TaskStatus = "todo" | "doing" | "done";

/** How urgent a follow-up is. Ordered, so a column can sort by it. */
export type Priority = "low" | "medium" | "high" | "critical";

export type Task = {
  id: string;
  reportId: string;
  title: string;
  assigneeMembershipId: string;
  assignedByMembershipId: string;
  /** YYYY-MM-DD, in the Workspace's timezone. Required. */
  dueAt: string;
  status: TaskStatus;
  priority: Priority;
  completionNote: string | null;
  /** Metadata only: nothing is uploaded in this build. */
  completionFile: { name: string; size: number; type: string } | null;
  completedAt: string | null;
  createdAt: string;
};

const day = (offset: number) =>
  new Date(Date.parse(SAMPLE_NOW) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);

export const SAMPLE_TASKS: Task[] = [
  {
    id: "task_1",
    reportId: "rpt_rejected",
    title: "Add the figures behind the schedule change",
    assigneeMembershipId: "mem_staff",
    assignedByMembershipId: "mem_head_platform",
    dueAt: day(2),
    priority: "high",
    status: "todo",
    completionNote: null,
    completionFile: null,
    completedAt: null,
    createdAt: SAMPLE_NOW,
  },
  {
    id: "task_2",
    reportId: "rpt_rejected",
    title: "Confirm the two training sessions ran",
    assigneeMembershipId: "mem_staff",
    assignedByMembershipId: "mem_head_platform",
    dueAt: day(-2),
    priority: "critical",
    status: "doing",
    completionNote: null,
    completionFile: null,
    completedAt: null,
    createdAt: SAMPLE_NOW,
  },
  {
    id: "task_3",
    reportId: "rpt_seen_open",
    title: "Send the incident log for closing",
    assigneeMembershipId: "mem_tunde",
    assignedByMembershipId: "mem_head_platform",
    dueAt: day(1),
    priority: "medium",
    status: "todo",
    completionNote: null,
    completionFile: null,
    completedAt: null,
    createdAt: SAMPLE_NOW,
  },
  {
    id: "task_4",
    reportId: "rpt_seen_open",
    title: "Share the vendor list with Field Operations",
    assigneeMembershipId: "mem_emeka",
    assignedByMembershipId: "mem_admin",
    dueAt: day(-1),
    priority: "low",
    status: "todo",
    completionNote: null,
    completionFile: null,
    completedAt: null,
    createdAt: SAMPLE_NOW,
  },
  {
    id: "task_5",
    reportId: "rpt_approved",
    title: "Hand the template to the next Space",
    assigneeMembershipId: "mem_staff",
    assignedByMembershipId: "mem_head_platform",
    dueAt: day(-5),
    priority: "medium",
    status: "done",
    completionNote: "Handed over on Monday.",
    completionFile: null,
    completedAt: day(-1),
    createdAt: SAMPLE_NOW,
  },
  {
    id: "task_6",
    reportId: "rpt_seen_closed",
    title: "Confirm the old cycle is closed",
    assigneeMembershipId: "mem_staff",
    assignedByMembershipId: "mem_admin",
    dueAt: day(-30),
    priority: "low",
    status: "done",
    // Past the 14 day window on purpose, so "Show older" has something to reveal.
    completionNote: null,
    completionFile: null,
    completedAt: day(-20),
    createdAt: SAMPLE_NOW,
  },
];
