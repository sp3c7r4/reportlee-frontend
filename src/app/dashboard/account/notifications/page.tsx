import type { Metadata } from "next";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";

export const metadata: Metadata = {
  title: "Notification preferences | Reportlee",
  description:
    "Choose which notifications reach you. Invitations and security notices cannot be switched off.",
};

export default function NotificationPreferencesPage() {
  return <NotificationPreferences />;
}
