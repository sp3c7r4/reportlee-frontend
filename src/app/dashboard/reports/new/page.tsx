import type { Metadata } from "next";
import { SubmitReport } from "@/components/reports/submit-report";

export const metadata: Metadata = {
  title: "Submit report | Reportlee",
  description: "Write this period's report and send it to review.",
};

export default function SubmitReportPage() {
  return <SubmitReport />;
}
