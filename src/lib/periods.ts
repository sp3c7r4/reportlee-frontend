import type { ReportingPeriod } from "../data/reports.ts";

/**
 * Which reporting period the Submit screen opens on. No React and no fetch.
 * The server decides what is open and what is late; this only chooses among the
 * periods it listed.
 */

/** Same 7 day grace the server applies (R2). Used only to hide a period that has closed. */
export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** True while a person can still submit for the period, on time or late. */
export function isOpen(period: ReportingPeriod, now: string): boolean {
  const at = Date.parse(now);
  return (
    Date.parse(period.startsAt) <= at &&
    at <= Date.parse(period.dueAt) + GRACE_MS
  );
}

/**
 * The oldest open period the caller has not submitted for, else the current one, else
 * null. `submittedPeriodIds` holds the periods the caller already has a submitted
 * report for.
 */
export function pickSubmitPeriod(
  open: ReportingPeriod[],
  current: ReportingPeriod | null,
  submittedPeriodIds: ReadonlySet<string>,
): ReportingPeriod | null {
  const waiting = open
    .filter((period) => !submittedPeriodIds.has(period.id))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  return waiting[0] ?? current;
}

/**
 * The period's label when one of the known periods matches, else a plain fallback.
 * A Report carries only its period id, so older periods have no label to show.
 */
export function periodTitle(
  periodId: string,
  known: readonly ReportingPeriod[],
): string {
  return (
    known.find((period) => period.id === periodId)?.label ?? "Reporting period"
  );
}
