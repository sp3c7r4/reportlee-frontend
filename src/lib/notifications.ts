/**
 * The notification vocabulary, with no React, so a Node test can hold the count rule
 * and the badge's cap without a browser.
 *
 * Nothing here fetches: the samples live in `src/data/notifications.ts` and UI-11
 * replaces them with `GET /api/v1/notifications`.
 */

export type NotificationKind =
  | "decision"
  | "comment"
  | "task"
  | "invitation"
  | "security";

/** The categories a person may turn email copies off for. Two of them are fixed. */
export type NotificationCategory =
  | "decisions"
  | "comments"
  | "tasks"
  | "summaries"
  | "invitations"
  | "security";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
};

/** Categories whose email copy cannot be switched off, and the sentence that says why. */
export const FIXED_CATEGORIES: NotificationCategory[] = [
  "invitations",
  "security",
];

export function unreadCount(items: Notification[]): number {
  return items.filter((item) => !item.read).length;
}

/**
 * A badge cannot grow forever. Above 99 the count stops being a number a person reads,
 * so it collapses to a ceiling the layout can hold.
 */
export function badgeLabel(unread: number): string | null {
  if (unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}
