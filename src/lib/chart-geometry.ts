/**
 * Chart geometry, with no React. Pure functions that turn counts into bar and segment
 * lengths, so an SVG component stays thin and a chart can never disagree with its card.
 * Every width is clamped to the track and a zero total draws nothing.
 */

/** A count over a total as a width in the track, clamped to the track, 0 when total is 0. */
export function barWidth(count: number, total: number, track: number): number {
  if (total <= 0) return 0;
  const fraction = count / total;
  const clamped = fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
  return clamped * track;
}

export type SubmissionCounts = {
  onTime: number;
  late: number;
  missing: number;
};

export type StackedSegment = {
  state: "onTime" | "late" | "missing";
  count: number;
  offset: number;
  width: number;
};

const SEGMENT_ORDER = ["onTime", "late", "missing"] as const;

/**
 * On time, late and missing as stacked segments across the track. Widths are the share
 * each state has of the three counts and sum to the track; a zero total draws nothing, so
 * the component shows its worded empty state instead.
 */
export function stackedSegments(
  counts: SubmissionCounts,
  track: number,
): StackedSegment[] {
  const total = counts.onTime + counts.late + counts.missing;
  if (total <= 0) return [];

  const segments: StackedSegment[] = [];
  let offset = 0;
  for (const state of SEGMENT_ORDER) {
    const width = barWidth(counts[state], total, track);
    segments.push({ state, count: counts[state], offset, width });
    offset += width;
  }

  /* @info - Snap the last segment to the track so rounding can never overflow or gap. */
  const last = segments[segments.length - 1];
  last.width = track - last.offset;
  if (last.width < 0) last.width = 0;

  return segments;
}
