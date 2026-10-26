"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUBMITTED_KEY } from "@/lib/reports";
import type { SubmissionStatus } from "@/lib/status";
import { SUBMISSION_STATUS } from "@/lib/status";

/* @info - Read once and cleared, so a reload does not resurrect a confirmation for a
   report the person has already seen. */
export function SubmittedNotice() {
  const [submitted, setSubmitted] = useState<{
    periodLabel: string;
    submissionStatus: SubmissionStatus;
    reportId?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SUBMITTED_KEY);
      if (!raw) return;
      window.sessionStorage.removeItem(SUBMITTED_KEY);
      setSubmitted(JSON.parse(raw));
    } catch {
      /* @info - No confirmation is better than a broken page. */
    }
  }, []);

  if (!submitted) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
      <div>
        <p className="font-medium text-[14px] text-ink">
          Submitted · {submitted.periodLabel}
        </p>
        <p className="mt-1 text-[13px] text-ink/60">
          {SUBMISSION_STATUS[submitted.submissionStatus].label}. Your reviewer
          sees it in Review.
        </p>
      </div>
      <Link
        href={
          submitted.reportId
            ? `/dashboard/reports/${submitted.reportId}`
            : "/dashboard/reports"
        }
        className="inline-flex min-h-11 items-center rounded-2xl border border-hairline px-3 text-[13px] text-ink"
      >
        View report
      </Link>
    </div>
  );
}
