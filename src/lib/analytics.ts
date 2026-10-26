import type { RosterMember } from "../data/members";
import type { Report, ReportingPeriod } from "../data/reports";
import type { Role } from "./nav";

/**
 * Analytics, with no React. Every figure states the period and the scope it counts, and
 * no figure ranks a person: ranking people turns reporting into surveillance.
 */

export type AnalyticsViewer = { membershipId: string; role: Role; space: string | null };

/** Below this many Reports a figure is flagged rather than trusted. Assumption. */
export const SMALL_SAMPLE = 5;

export type FigureCard = {
  key: "onTime" | "late" | "missing" | "decision";
  label: string;
  value: string;
  detail: string;
};

export type KpiCoverage = {
  name: string;
  unit: string;
  included: number;
  total: number;
};

export type PeopleGroup = {
  state: "on time" | "late" | "missing";
  people: string[];
};

export type AnalyticsView = {
  scope: "workspace" | "space" | "me";
  spaceFilter: string | null;
  lockedReason: string | null;
  coverage: { expected: number; submitted: number };
  cards: FigureCard[];
  kpis: KpiCoverage[];
  groups: PeopleGroup[];
  smallSample: boolean;
};

const MINUTE = 60 * 1000;

const spaceOf = (roster: RosterMember[], membershipId: string) =>
  roster.find((member) => member.membershipId === membershipId)?.space ?? null;

export function analyticsFor(input: {
  viewer: AnalyticsViewer;
  reports: Report[];
  roster: RosterMember[];
  period: ReportingPeriod;
  /** A requested filter. A Head's is forced back to their own Space. */
  spaceFilter?: string | null;
}): AnalyticsView {
  const { viewer } = input;

  const scope: AnalyticsView["scope"] =
    viewer.role === "staff" ? "me" : viewer.role === "head" ? "space" : "workspace";

  const spaceFilter =
    viewer.role === "head"
      ? viewer.space
      : scope === "me"
        ? viewer.space
        : (input.spaceFilter ?? null);

  const lockedReason =
    viewer.role === "head"
      ? "A Head of Space reads their own Space. The filter is locked."
      : null;

  const inScope = input.reports.filter((report) => {
    if (report.periodId !== input.period.id) return false;
    if (report.submissionStatus === "draft") return false;
    if (scope === "me") return report.authorMembershipId === viewer.membershipId;
    if (scope === "space") {
      return spaceOf(input.roster, report.authorMembershipId) === viewer.space;
    }
    if (spaceFilter) {
      return spaceOf(input.roster, report.authorMembershipId) === spaceFilter;
    }
    return true;
  });

  const expected = (() => {
    if (scope === "me") return 1;
    const people = input.roster.filter((member) => {
      if (member.role === "admin" || !member.active) return false;
      if (scope === "space") return member.space === viewer.space;
      if (spaceFilter) return member.space === spaceFilter;
      return true;
    });
    return people.length;
  })();

  const onTime = inScope.filter(
    (report) => report.submissionStatus === "submitted",
  ).length;
  const late = inScope.filter((report) => report.submissionStatus === "late").length;
  const submittedPeople = new Set(inScope.map((report) => report.authorMembershipId))
    .size;
  const missing = Math.max(0, expected - submittedPeople);

  const decisions = inScope
    .map((report) => {
      const decided = report.events.find(
        (event) => event.kind === "approved" || event.kind === "rejected",
      );
      if (!decided) return null;
      return (Date.parse(decided.at) - Date.parse(report.submittedAt)) / MINUTE;
    })
    .filter((value): value is number => value !== null);

  const average = decisions.length
    ? Math.round(decisions.reduce((sum, value) => sum + value, 0) / decisions.length)
    : null;

  const cards: FigureCard[] = [
    {
      key: "onTime",
      label: "On-time rate",
      value:
        expected === 0
          ? "None"
          : `${Math.round((submittedPeople / expected) * 100)}%`,
      detail: `${submittedPeople} of ${expected} expected Reports arrived`,
    },
    {
      key: "late",
      label: "Late",
      value: String(late),
      detail: `of ${expected} expected, this period`,
    },
    {
      key: "missing",
      label: "Missing",
      value: String(missing),
      detail: `of ${expected} expected, this period`,
    },
    {
      key: "decision",
      label: "Average time to decision",
      value: average === null ? "None" : formatMinutes(average),
      detail: "measured from submission to the first decision",
    },
  ];

  const kpis: KpiCoverage[] = [];
  const names = new Map<string, string>();
  for (const report of inScope) {
    for (const kpi of report.kpis) names.set(kpi.name, kpi.unit);
  }
  for (const [name, unit] of names) {
    const included = inScope.filter((report) =>
      report.kpis.some((kpi) => kpi.name === name && kpi.value !== null),
    ).length;
    kpis.push({ name, unit, included, total: inScope.length });
  }

  const groups: PeopleGroup[] = [];
  const latePeople = input.roster
    .filter((member) =>
      inScope.some(
        (report) =>
          report.authorMembershipId === member.membershipId &&
          report.submissionStatus === "late",
      ),
    )
    .map((member) => member.name);
  if (latePeople.length) groups.push({ state: "late", people: latePeople });

  const missingPeople = input.roster
    .filter((member) => {
      if (member.role === "admin" || !member.active) return false;
      if (scope === "space" && member.space !== viewer.space) return false;
      if (spaceFilter && member.space !== spaceFilter) return false;
      return !inScope.some(
        (report) => report.authorMembershipId === member.membershipId,
      );
    })
    .map((member) => member.name);
  if (missingPeople.length) groups.push({ state: "missing", people: missingPeople });

  void onTime;

  return {
    scope,
    spaceFilter,
    lockedReason,
    coverage: { expected, submitted: submittedPeople },
    cards,
    kpis,
    groups,
    smallSample: submittedPeople < SMALL_SAMPLE,
  };
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  if (hours < 24) return `${hours} h`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}
