import type { Report } from "../data/reports";
import type { KpiEntry, KpiTemplateField } from "../data/reports";
import type { RosterMember, SpaceSummary } from "../data/members";
import type { Role } from "./nav";

/**
 * One Space's page, with no React. A Space is a reporting group: its figures count the
 * people in it, never the Workspace, because a Head reading their own Space must not be
 * handed the Workspace's totals.
 */

export type SpaceViewer = {
  membershipId: string;
  role: Role;
  space: string | null;
};

export function spaceById(
  spaces: SpaceSummary[],
  id: string,
): SpaceSummary | null {
  return spaces.find((space) => space.id === id) ?? null;
}

export function reportsInSpace(
  reports: Report[],
  roster: RosterMember[],
  spaceName: string,
): Report[] {
  const authors = new Set(
    roster
      .filter((member) => member.space === spaceName)
      .map((member) => member.membershipId),
  );
  return reports.filter((report) => authors.has(report.authorMembershipId));
}

export type SpaceStats = {
  people: number;
  expected: number;
  submitted: number;
  /** Distinct people who submitted, which is what "of N" is measured against. */
  peopleSubmitted: number;
  onTime: number;
  late: number;
  missing: number;
  approved: number;
  pending: number;
  rejected: number;
};

export function spaceStats(input: {
  space: SpaceSummary;
  roster: RosterMember[];
  reports: Report[];
  /** Scope the figures to one Reporting period. Omit to count every period. */
  periodId?: string;
}): SpaceStats {
  const people = input.roster.filter(
    (member) => member.space === input.space.name && member.active,
  );
  const all = reportsInSpace(input.reports, input.roster, input.space.name);
  const reports = input.periodId
    ? all.filter((report) => report.periodId === input.periodId)
    : all;

  // Admins author nothing, so only Staff and Heads are expected to report.
  const expected = people.filter((member) => member.role !== "admin").length;

  // A draft is not submitted, so it counts as missing rather than as a report.
  const submitted = reports.filter(
    (report) => report.submissionStatus !== "draft",
  );
  const onTime = submitted.filter(
    (report) => report.submissionStatus === "submitted",
  ).length;
  const late = submitted.filter(
    (report) => report.submissionStatus === "late",
  ).length;

  return {
    people: people.length,
    expected,
    submitted: submitted.length,
    peopleSubmitted: new Set(
      submitted.map((report) => report.authorMembershipId),
    ).size,
    onTime,
    late,
    missing: Math.max(
      0,
      expected -
        new Set(submitted.map((report) => report.authorMembershipId)).size,
    ),
    approved: submitted.filter((report) => report.reviewStatus === "approved")
      .length,
    pending: submitted.filter((report) => report.reviewStatus === "pending")
      .length,
    rejected: submitted.filter((report) => report.reviewStatus === "rejected")
      .length,
  };
}

export type TemplateGuard = { allowed: boolean; reason: string | null };

export function canEditTemplate(
  viewer: SpaceViewer,
  space: SpaceSummary,
): TemplateGuard {
  if (viewer.role === "admin") return { allowed: true, reason: null };
  if (viewer.role === "head" && viewer.space === space.name) {
    return { allowed: true, reason: null };
  }
  return {
    allowed: false,
    reason: `Only an Admin or the Head of ${space.name} can change these.`,
  };
}

/** A Report that already has rows keeps them: a template change is for the next one. */
export function applyTemplate(
  template: KpiTemplateField[],
  existing: KpiEntry[],
): KpiEntry[] {
  if (existing.length > 0) return existing;
  return template.map((field) => ({
    name: field.name,
    unit: field.unit,
    value: null,
  }));
}
