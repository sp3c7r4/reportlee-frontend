/** Schedule calls. The form rules stay in `settings.ts` (`scheduleProblem`). */

import { type ApiResult, apiCall } from "./api.ts";
import type { ApiSchedule, ApiScheduleSaved } from "./api-types.ts";
import type { Schedule } from "./settings.ts";

const path = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/schedule`;

export function getSchedule(
  workspaceId: string,
): Promise<ApiResult<ApiSchedule>> {
  return apiCall(
    "GET",
    path(workspaceId),
    undefined,
    "We could not load the schedule. Try again.",
  );
}

/** Admin only. The change applies from `appliesFrom`, never to a running period. */
export function putSchedule(
  workspaceId: string,
  schedule: Schedule,
): Promise<ApiResult<ApiScheduleSaved>> {
  return apiCall(
    "PUT",
    path(workspaceId),
    {
      cadence: schedule.cadence,
      weekday: schedule.weekday,
      time: schedule.time,
      timeZone: schedule.timeZone,
      dayOfMonth: schedule.dayOfMonth,
      lastDay: schedule.lastDay,
    },
    "We could not save the schedule. Try again.",
  );
}
