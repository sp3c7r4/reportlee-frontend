/**
 * Task calls. Plain functions, no React. The server decides which view a role may read
 * and that only the assignee moves a task. Endpoints E17 and E18 of
 * openspec/changes/review/design.md.
 */

import type { Task, TaskStatus } from "../data/tasks.ts";
import { type ApiResult, apiCall } from "./api.ts";
import type { View } from "./tasks.ts";

export function listTasks(
  workspaceId: string,
  view: View,
): Promise<ApiResult<Task[]>> {
  return apiCall(
    "GET",
    `/tasks?workspaceId=${encodeURIComponent(workspaceId)}&view=${view}`,
    undefined,
    "We could not load the tasks. Try again.",
  );
}

/** A note goes with Done only: the server refuses it on any other move. */
export function updateTaskStatus(
  id: string,
  input: { status: TaskStatus; note?: string },
): Promise<ApiResult<Task>> {
  const note = input.status === "done" ? (input.note?.trim() ?? "") : "";
  return apiCall(
    "PATCH",
    `/tasks/${encodeURIComponent(id)}`,
    { status: input.status, ...(note ? { completionNote: note } : {}) },
    "We could not move that task. Try again.",
  );
}
