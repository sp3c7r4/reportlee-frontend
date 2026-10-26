import type { Notification } from "@/lib/notifications";

/**
 * Sample notifications for the bell's badge.
 *
 * Notifications themselves arrive with UI-11 (`insight-screens`); until then the badge
 * reads this list so the count is a real number rather than a decorative dot. Every
 * entry is fake and none of them links anywhere yet.
 */
export const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "ntf_1",
    kind: "decision",
    title: "A Report was rejected",
    body: "Your Report for the week of 19 October came back with a reason.",
    at: "2026-10-24T14:30:00.000Z",
    read: false,
    href: "/dashboard/reports/rpt_rejected",
  },
  {
    id: "ntf_2",
    kind: "comment",
    title: "A reviewer commented",
    body: "Ask what the schedule covers and who agreed to it.",
    at: "2026-10-24T09:10:00.000Z",
    read: false,
    href: "/dashboard/reports/rpt_rejected",
  },
  {
    id: "ntf_3",
    kind: "task",
    title: "A task was assigned to you",
    body: "Add the figures for the depot count.",
    at: "2026-10-23T16:00:00.000Z",
    read: false,
    href: "/dashboard/tasks",
  },
  {
    id: "ntf_4",
    kind: "decision",
    title: "A Report was approved",
    body: "Your Report for the week of 19 October was approved.",
    at: "2026-10-22T11:00:00.000Z",
    read: true,
    href: "/dashboard/reports/rpt_approved",
  },
];
