/**
 * Reporting period and Report calls. Plain functions, no React. The server decides
 * who may read, edit or delete a Report, and which period is open; these only carry
 * the call. Endpoints E3 to E11 of openspec/changes/reports/design.md.
 */

import type { Report, ReportDraft, ReportingPeriod } from "../data/reports.ts";
import { type ApiResult, apiCall } from "./api.ts";
import { draftBody } from "./reports.ts";

export type DraftBody = ReturnType<typeof draftBody>;
export type EditBody = Omit<DraftBody, "periodId">;

const periodQuery = (workspaceId: string) =>
  `?workspaceId=${encodeURIComponent(workspaceId)}`;

export function getCurrentPeriod(
  workspaceId: string,
): Promise<ApiResult<ReportingPeriod>> {
  return apiCall(
    "GET",
    `/reporting-periods/current${periodQuery(workspaceId)}`,
    undefined,
    "We could not load the reporting period. Try again.",
  );
}

export function getOpenPeriods(
  workspaceId: string,
): Promise<ApiResult<ReportingPeriod[]>> {
  return apiCall(
    "GET",
    `/reporting-periods/open${periodQuery(workspaceId)}`,
    undefined,
    "We could not load the open reporting periods. Try again.",
  );
}

/** `data` is null when the caller has no draft for the period. */
export async function getDraft(
  periodId: string,
): Promise<ApiResult<ReportDraft | null>> {
  const result = await apiCall<ReportDraft | null | undefined>(
    "GET",
    `/reports/draft?periodId=${encodeURIComponent(periodId)}`,
    undefined,
    "We could not load your draft. Try again.",
  );
  if (!result.ok) return result;
  return { ...result, data: result.data ?? null };
}

export function saveDraft(body: DraftBody): Promise<ApiResult<ReportDraft>> {
  return apiCall(
    "PATCH",
    "/reports/draft",
    body,
    "We could not save your draft. Try again.",
  );
}

export function submitReport(id: string): Promise<ApiResult<Report>> {
  return apiCall(
    "POST",
    `/reports/${encodeURIComponent(id)}/submit`,
    undefined,
    "We could not submit your report. Try again.",
  );
}

export type ListQuery = {
  periodId?: string;
  limit?: number;
  offset?: number;
};

/** The caller's own submitted Reports, newest first. */
export function listMyReports(
  workspaceId: string,
  query: ListQuery = {},
): Promise<ApiResult<Report[]>> {
  const parts = [`workspaceId=${encodeURIComponent(workspaceId)}`];
  if (query.periodId) {
    parts.push(`periodId=${encodeURIComponent(query.periodId)}`);
  }
  if (query.limit !== undefined) parts.push(`limit=${query.limit}`);
  if (query.offset !== undefined) parts.push(`offset=${query.offset}`);
  return apiCall(
    "GET",
    `/reports?${parts.join("&")}`,
    undefined,
    "We could not load your reports. Try again.",
  );
}

export function getReport(id: string): Promise<ApiResult<Report>> {
  return apiCall(
    "GET",
    `/reports/${encodeURIComponent(id)}`,
    undefined,
    "We could not load that report. Try again.",
  );
}

export function editReport(
  id: string,
  body: EditBody,
): Promise<ApiResult<Report>> {
  return apiCall(
    "PATCH",
    `/reports/${encodeURIComponent(id)}`,
    body,
    "We could not save your changes. Try again.",
  );
}

/** A 204 has no body, so success carries no data. */
export function deleteReport(id: string): Promise<ApiResult<undefined>> {
  return apiCall(
    "DELETE",
    `/reports/${encodeURIComponent(id)}`,
    undefined,
    "We could not delete that report. Try again.",
  );
}

/** Splits a draft body into the edit body: the period is fixed once a report exists. */
export function editBody(draft: Parameters<typeof draftBody>[0]): EditBody {
  const { periodId: _periodId, ...rest } = draftBody(draft);
  return rest;
}
