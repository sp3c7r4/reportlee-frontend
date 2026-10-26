import type { Metadata } from "next";
import { ReviewQueue } from "@/components/review/review-queue";

export const metadata: Metadata = {
  title: "Review | Reportlee",
  description:
    "The Reports waiting for a decision this period, and who has not submitted.",
};

export default function ReviewPage() {
  return <ReviewQueue />;
}
