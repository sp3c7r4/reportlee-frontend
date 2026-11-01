import type { AnalyticsView } from "@/lib/analytics";
import { stackedSegments } from "@/lib/chart-geometry";

/**
 * The submission breakdown as a stacked horizontal bar of on time, late and missing. It
 * reads the figures the cards already show, so a segment and its card cannot disagree. It
 * shows counts by state only and names no individual. When the expected population is 0
 * there is nothing to compute, and the area says so in words.
 */

const TRACK = 100;

const STATE_LABEL: Record<"onTime" | "late" | "missing", string> = {
  onTime: "On time",
  late: "Late",
  missing: "Missing",
};

const STATE_FILL: Record<"onTime" | "late" | "missing", string> = {
  onTime: "fill-success",
  late: "fill-warning",
  missing: "fill-destructive",
};

const STATE_DOT: Record<"onTime" | "late" | "missing", string> = {
  onTime: "bg-success",
  late: "bg-warning",
  missing: "bg-destructive",
};

export function SubmissionChart({ view }: { view: AnalyticsView }) {
  if (view.coverage.expected === 0) {
    return (
      <section className="mt-6">
        <h2 className="font-medium text-[14px] text-ink">
          Submission breakdown
        </h2>
        <p className="mt-2 rounded-md border border-hairline px-3 py-3 text-[13px] text-ink/60">
          Nothing to compute yet for this period.
        </p>
      </section>
    );
  }

  const onTime = view.coverage.submitted;
  const late = Number(
    view.cards.find((card) => card.key === "late")?.value ?? 0,
  );
  const missing = Number(
    view.cards.find((card) => card.key === "missing")?.value ?? 0,
  );

  const segments = stackedSegments({ onTime, late, missing }, TRACK);
  const caption = `Submission breakdown: ${onTime} on time, ${late} late, ${missing} missing, of ${view.coverage.expected} expected.`;

  return (
    <section className="mt-6">
      <h2 className="font-medium text-[14px] text-ink">Submission breakdown</h2>

      <svg
        viewBox={`0 0 ${TRACK} 12`}
        preserveAspectRatio="none"
        role="img"
        aria-label={caption}
        className="mt-2 h-4 w-full overflow-hidden rounded-md border border-hairline"
      >
        <rect
          x={0}
          y={0}
          width={TRACK}
          height={12}
          className="fill-surface-muted"
        />
        {segments.map((segment) => (
          <rect
            key={segment.state}
            x={segment.offset}
            y={0}
            width={segment.width}
            height={12}
            className={STATE_FILL[segment.state]}
          />
        ))}
      </svg>

      <ul className="mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12.5px]">
        {(["onTime", "late", "missing"] as const).map((state) => {
          const count =
            state === "onTime" ? onTime : state === "late" ? late : missing;
          return (
            <li key={state} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`inline-block size-2.5 rounded-full ${STATE_DOT[state]}`}
              />
              <span className="text-ink">{STATE_LABEL[state]}</span>
              <span className="text-ink/60 tabular-nums">{count}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
