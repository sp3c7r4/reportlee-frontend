import type { Metadata } from "next";
import { ReportList } from "@/components/reports/report-view";

export const metadata: Metadata = {
  title: "My reports | Reportlee",
  description: "Every report you have written, and what happened to it.",
};

export default function ReportsPage() {
  return <ReportList />;
}
