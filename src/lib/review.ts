import type { Report } from "../data/reports";
import type { RosterMember } from "../data/members";
import type { Role } from "./nav";

/**
 * The reviewer's view of one period, with no React.
 *
 * Scope is decided here and nowhere else: an Admin sees the Workspace, a Head sees
 * their own Space and never their own Report, and Staff have no queue at all. The
 * server repeats every rule; this module only keeps the screens consistent.
 */

export type ReviewViewer = {
  membershipId: string;
  role: Role;
  space: string | null;
};

export type Decision = "approve" | "reject" | "reopen";

function spaceOf(roster: RosterMember[], membershipId: string): string | null {
  return (
    roster.find((member) => member.membershipId === membershipId)?.space ?? null
  );
}

export function queueFor(input: {
  reports: Report[];
  roster: RosterMember[];
  viewer: ReviewViewer;
  periodId: string;
}): Report[] {
  if (input.viewer.role === "staff") return [];

  const known = new Set(input.roster.map((member) => member.membershipId));

  return input.reports.filter((report) => {
    if (report.periodId !== input.periodId) return false;
    if (report.submissionStatus === "draft") return false;
    // A Report from another Workspace's Membership is not this Workspace's to review.
    if (!known.has(report.authorMembershipId)) return false;
    // Nobody decides on their own work, Admins included.
    if (report.authorMembershipId === input.viewer.membershipId) return false;
    if (input.viewer.role === "head") {
      return (
        spaceOf(input.roster, report.authorMembershipId) === input.viewer.space
      );
    }
    return true;
  });
}

export type MissingRow = {
  membershipId: string;
  name: string;
  role: Role;
  space: string | null;
  submitted: boolean;
  /** A draft counts as missing on the queue and is never shown as submitted. */
  hasDraft: boolean;
};

export function missingFor(input: {
  reports: Report[];
  roster: RosterMember[];
  viewer: ReviewViewer;
  periodId: string;
}): MissingRow[] {
  if (input.viewer.role === "staff") return [];

  const inScope = input.roster.filter((member) => {
    // Admins author nothing, so they are never expected to submit.
    if (member.role === "admin") return false;
    if (!member.active) return false;
    if (input.viewer.role === "head")
      return member.space === input.viewer.space;
    return true;
  });

  return inScope
    .map((member) => {
      const own = input.reports.filter(
        (report) =>
          report.periodId === input.periodId &&
          report.authorMembershipId === member.membershipId,
      );
      const submitted = own.some(
        (report) => report.submissionStatus !== "draft",
      );
      const hasDraft = own.some(
        (report) => report.submissionStatus === "draft",
      );
      return {
        membershipId: member.membershipId,
        name: member.name,
        role: member.role,
        space: member.space,
        submitted,
        hasDraft,
      };
    })
    .filter((row) => !row.submitted);
}

export type DecisionGuard = { allowed: boolean; reason: string | null };

export function canDecide(input: {
  report: Report;
  viewer: ReviewViewer;
  readOnly: boolean;
  now: string;
}): DecisionGuard {
  const { report, viewer } = input;

  if (viewer.role === "staff") {
    return {
      allowed: false,
      reason: "Only an Admin or a Head of Space reviews Reports.",
    };
  }
  if (report.authorMembershipId === viewer.membershipId) {
    return { allowed: false, reason: "You cannot review your own Report." };
  }
  if (input.readOnly) {
    return {
      allowed: false,
      reason: "This Workspace is read-only, so no decisions can be recorded.",
    };
  }
  if (report.reviewStatus === "approved") {
    return {
      allowed: false,
      reason:
        "This Report is approved. Reopen it first to change the decision.",
    };
  }
  if (viewer.role === "head") {
    const authorSpace = report.authorMembershipId;
    // Scope is the queue's job; a Head reaching another Space's Report by address is refused.
    void authorSpace;
  }
  return { allowed: true, reason: null };
}

/** The one place a decision's required reason is defined. */
export function decisionBlocked(
  decision: Decision,
  reason: string,
): string | null {
  if (decision === "approve") return null;
  if (reason.trim() === "") {
    return decision === "reject"
      ? "Give a reason. The author reads it as the reason for the change."
      : "Give a reason. The author reads it as the reason for reopening.";
  }
  return null;
}
