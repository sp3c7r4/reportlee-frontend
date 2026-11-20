/**
 * Review calls: seen, decisions, the queue and bulk approve. Plain functions, no React.
 * The server decides who may do each of these; the screens only carry the call.
 * Endpoints E12, E13, E15 and E16 of openspec/changes/review/design.md.
 */

import type { Report } from "../data/reports.ts";
import { type ApiResult, apiCall } from "./api.ts";
import type {
  ApiBulkResult,
  ApiQueue,
  ApiReport,
  ApiSeen,
} from "./api-types.ts";
import { reportFrom } from "./discussion-api.ts";
import { reportErrorMessage } from "./report-errors.ts";
import type { Decision, MissingRow } from "./review.ts";

const reportPath = (id: string) => `/reports/${encodeURIComponent(id)}`;

/** Starts the reviewer's window. A 403 or 404 is expected for anyone else and ignored. */
export function markSeen(id: string): Promise<ApiResult<ApiSeen>> {
  return apiCall(
    "POST",
    `${reportPath(id)}/seen`,
    undefined,
    "We could not record that you opened this report.",
  );
}

export async function decide(
  id: string,
  decision: Decision,
  reason?: string,
): Promise<ApiResult<Report>> {
  const trimmed = reason?.trim() ?? "";
  const result = await apiCall<ApiReport>(
    "POST",
    `${reportPath(id)}/decision`,
    { decision, ...(trimmed ? { reason: trimmed } : {}) },
    "We could not record that decision. Try again.",
  );
  if (!result.ok) return result;
  return { ...result, data: reportFrom(result.data) };
}

export type Queue = { reports: Report[]; missing: MissingRow[] };

export async function loadQueue(
  workspaceId: string,
  periodId: string,
): Promise<ApiResult<Queue>> {
  const result = await apiCall<ApiQueue>(
    "GET",
    `/review/queue?workspaceId=${encodeURIComponent(workspaceId)}&periodId=${encodeURIComponent(periodId)}`,
    undefined,
    "We could not load the review queue. Try again.",
  );
  if (!result.ok) return result;
  return {
    ...result,
    data: {
      reports: (result.data.reports ?? []).map(reportFrom),
      missing: result.data.missing ?? [],
    },
  };
}

export function bulkApprove(
  workspaceId: string,
  reportIds: string[],
): Promise<ApiResult<ApiBulkResult>> {
  return apiCall(
    "POST",
    "/review/bulk-approve",
    { workspaceId, reportIds },
    "We could not approve those reports. Try again.",
  );
}

export type BulkSummary = {
  headline: string;
  skipped: { id: string; label: string; message: string }[];
};

/** What the person reads after a bulk approve: the count, then each report left out and why. */
export function bulkSummary(
  result: ApiBulkResult,
  labelOf: (id: string) => string,
): BulkSummary {
  const skipped = result.skipped.length;
  return {
    headline:
      skipped === 0
        ? `Approved ${result.approved.length}.`
        : `Approved ${result.approved.length}. Skipped ${skipped}.`,
    skipped: result.skipped.map((row) => ({
      id: row.id,
      label: labelOf(row.id),
      message: reportErrorMessage({
        code: row.code,
        message: "This report was skipped.",
      }),
    })),
  };
}
