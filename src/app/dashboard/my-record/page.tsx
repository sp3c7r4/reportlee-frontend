import type { Metadata } from "next";
import { AnalyticsScreen } from "@/components/analytics/analytics-screen";

export const metadata: Metadata = {
  title: "My record | Reportlee",
  description: "Your own submission record for the current period.",
};

export default function MyRecordPage() {
  return <AnalyticsScreen scope="me" />;
}
