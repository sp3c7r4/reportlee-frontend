import type { RosterMember } from "../data/members";
import type { Report, ReportingPeriod } from "../data/reports";
import type { Task } from "../data/tasks";
import type { Role } from "./nav";

/**
 * Home is "what needs you now", not a dashboard of everything. One function decides the
 * order, so two people on the same Workspace see the same rules.
 *
 * Nothing here is a guard: a Home card links to a screen that re-checks the role.
 */

export type HomeViewer = {
  membershipId: string;
  role: Role;
  space: string | null;
};

export type AttentionKind = "submit" | "draft" | "review" | "missing" | "tasks";

export type AttentionItem = {
  kind: AttentionKind;
  title: string;
  detail: string;
  href: string;
  count: number | null;
};

export type DecisionRow = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export type HomeSummary = {
  period: {
    label: string;
    dueAt: string;
    isOpen: boolean;
  };
  attention: AttentionItem[];
  decisions: DecisionRow[];
};

const spaceOf = (roster: RosterMember[], membershipId: string) =>
  roster.find((member) => member.membershipId === membershipId)?.space ?? null;

export function homeFor(input: {
  viewer: HomeViewer;
  reports: Report[];
  roster: RosterMember[];
  tasks: Task[];
  period: ReportingPeriod;
  now: string;
  /** The viewer's own Report for the open period, when one exists. */
  own?: Report | null;
  hasDraft?: boolean;
  readOnly?: boolean;
}): HomeSummary {
  const { viewer, period, now } = input;
  const attention: AttentionItem[] = [];
  const decisions: DecisionRow[] = [];

  const own =
    input.own === undefined
      ? (input.reports.find(
          (report) =>
            report.periodId === period.id &&
            report.authorMembershipId === viewer.membershipId &&
            report.submissionStatus !== "draft",
        ) ?? null)
      : input.own;

  const isAuthor = viewer.role !== "admin";

  // 1. An author's own Report, because it is the only thing only they can do.
  if (isAuthor && !input.readOnly) {
    if (input.hasDraft) {
      attention.push({
        kind: "draft",
        title: "Pick up your draft",
        detail: `${period.label} · saved on this device`,
        href: "/dashboard/reports/new",
        count: null,
      });
    } else if (!own) {
      attention.push({
        kind: "submit",
        title: "Submit your Report",
        detail: `${period.label} is open`,
        href: "/dashboard/reports/new",
        count: null,
      });
    }
  }

  // 2. A reviewer's queue, scoped the same way the queue is.
  if (viewer.role !== "staff") {
    const waiting = input.reports.filter((report) => {
      if (report.periodId !== period.id) return false;
      if (report.submissionStatus === "draft") return false;
      if (report.reviewStatus !== "pending") return false;
      if (report.authorMembershipId === viewer.membershipId) return false;
      if (viewer.role === "head") {
        return (
          spaceOf(input.roster, report.authorMembershipId) === viewer.space
        );
      }
      return true;
    });

    if (waiting.length > 0) {
      attention.push({
        kind: "review",
        title: "Reports waiting for a decision",
        detail: period.label,
        href: "/dashboard/review",
        count: waiting.length,
      });
    }

    const missing = input.roster.filter((member) => {
      if (member.role === "admin" || !member.active) return false;
      if (viewer.role === "head" && member.space !== viewer.space) return false;
      const submitted = input.reports.some(
        (report) =>
          report.periodId === period.id &&
          report.authorMembershipId === member.membershipId &&
          report.submissionStatus !== "draft",
      );
      return !submitted;
    });

    if (missing.length > 0) {
      attention.push({
        kind: "missing",
        title: "People who have not submitted",
        detail: missing.map((member) => member.name).join(", "),
        href: "/dashboard/review?tab=missing",
        count: missing.length,
      });
    }
  }

  // 3. The viewer's own open tasks.
  const openTasks = input.tasks.filter(
    (task) =>
      task.assigneeMembershipId === viewer.membershipId &&
      task.status !== "done",
  );
  if (openTasks.length > 0) {
    attention.push({
      kind: "tasks",
      title: "Tasks assigned to you",
      detail: openTasks
        .slice(0, 2)
        .map((task) => task.title)
        .join(" · "),
      href: "/dashboard/tasks",
      count: openTasks.length,
    });
  }

  // 4. Recent decisions on the viewer's own Reports, newest first.
  if (isAuthor && !input.readOnly) {
    for (const report of input.reports) {
      if (report.authorMembershipId !== viewer.membershipId) continue;
      const last = [...report.events]
        .reverse()
        .find(
          (event) => event.kind === "approved" || event.kind === "rejected",
        );
      if (!last) continue;
      decisions.push({
        id: report.id,
        label: last.kind === "approved" ? "Approved" : "Changes requested",
        detail: period.label,
        href: `/dashboard/reports/${report.id}`,
      });
      if (decisions.length === 3) break;
    }
  }

  return {
    period: {
      label: period.label,
      dueAt: period.dueAt,
      isOpen: Date.parse(now) <= Date.parse(period.dueAt),
    },
    attention,
    decisions,
  };
}
