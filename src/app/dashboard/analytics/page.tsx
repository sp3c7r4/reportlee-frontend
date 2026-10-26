import type { Metadata } from "next";
import { AnalyticsScreen } from "@/components/analytics/analytics-screen";

export const metadata: Metadata = {
  title: "Analytics | Reportlee",
  description:
    "On-time rate, late and missing Reports, and time to decision for one period.",
};

export default function AnalyticsPage() {
  return <AnalyticsScreen scope="workspace" />;
}
