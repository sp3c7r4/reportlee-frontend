import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/notifications/notifications-screen";

export const metadata: Metadata = {
  title: "Notifications | Reportlee",
  description: "Decisions, comments and tasks that reached you, by day.",
};

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
