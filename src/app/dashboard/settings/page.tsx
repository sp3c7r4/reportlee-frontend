import type { Metadata } from "next";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = {
  title: "Settings | Reportlee",
  description:
    "The reporting schedule, AI features and data exports for one Workspace.",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
