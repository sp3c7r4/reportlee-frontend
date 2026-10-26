import type {
  Report,
  ReportAction,
  ReportEvent,
  ReportEventKind,
  ReportViewer,
} from "../data/reports.ts";
import type { Plan } from "../data/viewer.ts";
import { visibleTo } from "./entitlements.ts";

/**
 * The state table, as ordered code.
 *
 * Precedence is the whole point: approved is always locked, a rejected or reopened
 * Report is always editable, then unseen, then the window. Written once here so the
 * page, the list and the tests cannot disagree, and derived from the last decision
 * event rather than a stored flag that can drift.
 */

export type LiveContext = { workspaceReadOnly: boolean };

const DECISIONS: ReportEventKind[] = ["approved", "rejected", "reopened"];

const LABEL: Record<ReportEventKind, string> = {
  submitted: "Submitted",
  edited: "Edited",
  seen: "Seen by reviewer",
  approved: "Approved",
  rejected: "Rejected",
  reopened: "Reopened",
};

const MINUTE = 60 * 1000;

export function lastDecision(report: Report): ReportEvent | null {
  for (let index = report.events.length - 1; index >= 0; index -= 1) {
    const event = report.events[index];
    if (DECISIONS.includes(event.kind)) return event;
  }
  return null;
}

/** When the current version locks, or null when it never opened a window. */
export function lockAt(report: Report): string | null {
  if (report.windowStartedAt === null) return null;
  return new Date(
    Date.parse(report.windowStartedAt) + report.editWindowMinutes * MINUTE,
  ).toISOString();
}

export function timeLeft(now: string, lock: string | null): number | null {
  if (lock === null) return null;
  return Date.parse(lock) - Date.parse(now);
}

function isAuthor(report: Report, viewer: ReportViewer): boolean {
  return report.authorMembershipId === viewer.membershipId;
}

export function canEdit(
  report: Report,
  viewer: ReportViewer,
  now: string,
  context: LiveContext,
): boolean {
  if (!isAuthor(report, viewer)) return false;
  if (context.workspaceReadOnly) return false;

  const decision = lastDecision(report);
  if (decision?.kind === "approved") return false;
  if (decision?.kind === "rejected" || decision?.kind === "reopened")
    return true;

  if (report.reviewStatus === "approved") return false;
  if (report.reviewStatus === "rejected") return true;

  if (report.firstSeenAt === null) return true;
  if (report.windowStartedAt === null) return true;

  const lock = lockAt(report);
  return lock !== null && Date.parse(now) <= Date.parse(lock);
}

/**
 * Delete frees the period, so it is only safe while nobody has read the Report and it
 * has never been revised: a resubmitted Report is a record, not a mistake.
 */
export function canDelete(
  report: Report,
  viewer: ReportViewer,
  context: LiveContext,
): boolean {
  if (!isAuthor(report, viewer)) return false;
  if (context.workspaceReadOnly) return false;
  return report.firstSeenAt === null && report.revisions.length === 0;
}

export function primaryAction(
  report: Report,
  viewer: ReportViewer,
  now: string,
  context: LiveContext,
): ReportAction {
  if (!isAuthor(report, viewer)) {
    return {
      kind: "none",
      label: null,
      reason: "Decisions arrive with review. Nothing here changes this Report.",
    };
  }
  if (context.workspaceReadOnly) {
    return {
      kind: "none",
      label: null,
      reason: "This Workspace is read-only, so its Reports cannot be edited.",
    };
  }

  const decision = lastDecision(report);
  if (decision?.kind === "approved" || report.reviewStatus === "approved") {
    return {
      kind: "none",
      label: null,
      reason: "Approved. Locked until a reviewer reopens it.",
    };
  }

  if (canEdit(report, viewer, now, context)) {
    // "Resubmit" is a request to fix something: a rejected or reopened Report. A
    // rejected Report that has already been edited is pending again, so it reads Edit.
    const resubmit =
      report.reviewStatus === "rejected" || decision?.kind === "reopened";
    return {
      kind: resubmit ? "resubmit" : "edit",
      label: resubmit ? "Edit and resubmit" : "Edit report",
      reason: null,
    };
  }

  const lock = lockAt(report);
  return {
    kind: "none",
    label: null,
    reason: lock
      ? "This Report is locked: the edit window has closed."
      : "This Report cannot be edited.",
  };
}

export type TimelineEntry = {
  kind: ReportEventKind;
  label: string;
  at: string;
  actor: string;
  reason?: string;
};

export function timelineFor(
  report: Report,
  viewer: ReportViewer,
): TimelineEntry[] {
  return [...report.events]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((event) => {
      const reason = reasonForDecision(report, event.at);
      return {
        kind: event.kind,
        label: LABEL[event.kind],
        at: event.at,
        actor:
          event.actorMembershipId === viewer.membershipId ? "You" : "Reviewer",
        ...(reason ? { reason } : {}),
      };
    });
}

/**
 * A decision's reason is a comment, looked up by the moment it was decided, so the
 * banner and the timeline read the same sentence.
 */
export function reasonForDecision(report: Report, at: string): string | null {
  return (
    (report.comments ?? []).find(
      (comment) => comment.kind === "decision" && comment.at === at,
    )?.body ?? null
  );
}

/** The rejection or reopen reason that the author has to see, if there is one. */
export function latestReason(report: Report): string | null {
  const decision = lastDecision(report);
  if (decision?.kind === "rejected" || decision?.kind === "reopened") {
    return reasonForDecision(report, decision.at);
  }
  return null;
}

/**
 * Starter keeps the last 30 days. One rule, in `entitlements`, so lists, search,
 * analytics and the Assistant cannot disagree about an old Report.
 */
export function visibleReports(
  reports: Report[],
  plan: Plan,
  now: string,
): Report[] {
  return visibleTo(reports, plan, now);
}
