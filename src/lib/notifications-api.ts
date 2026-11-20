/**
 * Notification calls and the one mapper from a server row to the screens' `Notification`.
 * Plain functions, no React. Endpoints E19 to E21 of openspec/changes/review/design.md.
 */

import { type ApiResult, apiCall } from "./api.ts";
import type { ApiNotification } from "./api-types.ts";
import type { Notification, NotificationKind } from "./notifications.ts";

const KIND: Record<string, NotificationKind> = {
  decision: "decision",
  comment: "comment",
  task: "task",
  /* @info - A new submission reads as a comment on the list: it has its own title. */
  submission: "comment",
};

/* @info - The link comes from the server, so only a path inside the dashboard is
   followed. Anything else, including a scheme or a host, falls back to the dashboard. */
function safeHref(href: string | null): string {
  if (href === "/dashboard") return href;
  return href?.startsWith("/dashboard/") ? href : "/dashboard";
}

export function notificationFrom(row: ApiNotification): Notification {
  return {
    id: String(row.id),
    kind: KIND[row.type] ?? "security",
    title: row.title,
    body: row.message,
    at: row.createdAt,
    read: row.read,
    href: safeHref(row.href),
  };
}

type Page = { data: ApiNotification[] } | ApiNotification[];

export async function listNotifications(
  workspaceId: string,
): Promise<ApiResult<Notification[]>> {
  const result = await apiCall<Page>(
    "GET",
    `/notifications?workspaceId=${encodeURIComponent(workspaceId)}&limit=50`,
    undefined,
    "We could not load your notifications. Try again.",
  );
  if (!result.ok) return result;
  const rows = Array.isArray(result.data) ? result.data : result.data.data;
  return { ...result, data: (rows ?? []).map(notificationFrom) };
}

export async function fetchUnreadCount(
  workspaceId: string,
): Promise<ApiResult<number>> {
  const result = await apiCall<{ count: number }>(
    "GET",
    `/notifications/unread-count?workspaceId=${encodeURIComponent(workspaceId)}`,
    undefined,
    "We could not load your notification count.",
  );
  if (!result.ok) return result;
  return { ...result, data: result.data.count };
}

/** A poll that fails keeps the last count: a blip must not blank the badge. */
export function countAfterPoll(
  previous: number,
  result: ApiResult<number>,
): number {
  return result.ok ? result.data : previous;
}

export async function markRead(id: string): Promise<ApiResult<boolean>> {
  const result = await apiCall<{ updated: boolean }>(
    "PATCH",
    `/notifications/${encodeURIComponent(id)}/read`,
    undefined,
    "We could not mark that notification as read.",
  );
  if (!result.ok) return result;
  return { ...result, data: result.data.updated };
}

export function markAllRead(
  workspaceId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiCall(
    "POST",
    "/notifications/read-all",
    { workspaceId },
    "We could not mark your notifications as read.",
  );
}
