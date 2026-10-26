"use client";

import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  PencilEdit01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TimelineEntry } from "@/lib/report-view";
import { cn } from "@/lib/utils";

/**
 * The timeline as a rail: one filled circle per event, a dashed connector, and the
 * latest event lifted out of the rail so the eye lands on where the Report is now.
 *
 * Colour is never the only signal: every circle carries its own glyph, and the entry
 * carries its label in words.
 */

const TONE: Record<
  TimelineEntry["kind"],
  { wrap: string; icon: typeof CheckmarkCircle02Icon }
> = {
  submitted: { wrap: "bg-success", icon: CheckmarkCircle02Icon },
  seen: { wrap: "bg-success", icon: CheckmarkCircle02Icon },
  edited: { wrap: "bg-ink/70", icon: PencilEdit01Icon },
  approved: { wrap: "bg-success", icon: CheckmarkCircle02Icon },
  rejected: { wrap: "bg-destructive", icon: Cancel01Icon },
  reopened: { wrap: "bg-notice", icon: RefreshIcon },
};

const PENDING = { wrap: "bg-warning", icon: Clock01Icon };

export function ReportTimeline({
  entries,
  when,
}: {
  entries: TimelineEntry[];
  /** Formats one instant in the Workspace's timezone. */
  when: (iso: string) => string;
}) {
  if (entries.length === 0) {
    return (
      <p className="flex items-center gap-2 text-[12.5px] text-ink/50">
        <span className="grid size-5 place-items-center rounded-full bg-warning text-surface">
          <HugeiconsIcon
            icon={Clock01Icon}
            strokeWidth={2.4}
            className="size-3"
          />
        </span>
        Nothing has happened yet.
      </p>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {entries.map((entry, index) => {
        const tone =
          entry.kind === "reopened" ? TONE.reopened : TONE[entry.kind];
        const last = index === entries.length - 1;
        const badge = last && entry.kind === "submitted" ? PENDING : tone;

        return (
          <li
            key={`${entry.kind}-${entry.at}`}
            className={cn("relative flex gap-3 pb-3", last && "pb-0")}
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  // Grows out of one spot rather than appearing whole.
                  "grid size-6 shrink-0 place-items-center rounded-full text-surface motion-reduce:animate-none",
                  "animate-in fade-in-0 zoom-in-50 duration-300 ease-out",
                  badge.wrap,
                )}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <HugeiconsIcon
                  icon={badge.icon}
                  strokeWidth={2.4}
                  className="size-3.5"
                />
              </span>
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="mt-1 w-px flex-1 border-notice/0 border-l border-dashed border-l-hairline"
                />
              )}
            </div>
            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-1")}>
              <p className="text-[12.5px] text-ink">{entry.label}</p>
              <p className="tabular-nums text-[11.5px] text-ink/50">
                {when(entry.at)} · {entry.actor}
              </p>
              {entry.reason ? (
                <p className="mt-1 text-[12px] text-ink/70 leading-[1.55]">
                  {entry.reason}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The state pair, as it was: one quiet pill, a hairline and the two words. The state
 * still carries its tone in the border and the text, without a filled badge or a glyph.
 */
export function StatePill({
  status,
  submission,
}: {
  status: "pending" | "approved" | "rejected";
  submission: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]",
        status === "approved" && "border-success/40 text-success",
        status === "rejected" && "border-destructive/40 text-destructive",
        status === "pending" && "border-hairline text-ink/70",
      )}
    >
      <span className="capitalize">{status}</span>
      <span className="text-ink/30">·</span>
      <span>{submission}</span>
    </span>
  );
}
