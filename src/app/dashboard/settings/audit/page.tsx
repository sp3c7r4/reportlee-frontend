import type { Metadata } from "next";
import { AuditScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = {
  title: "Audit log | Reportlee",
  description: "Every recorded change in this Workspace, newest first.",
};

export default function AuditPage() {
  return <AuditScreen />;
}
