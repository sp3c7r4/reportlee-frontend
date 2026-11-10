"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsView } from "@/lib/analytics";

/**
 * The submission breakdown as a Recharts bar chart of on time, late and missing. It reads
 * the figures the cards already show, so a bar and its card cannot disagree. It shows
 * counts by state only and names no individual. When the expected population is 0 there is
 * nothing to compute, and the area says so in words.
 */

type State = "onTime" | "late" | "missing";

const STATE_FILL: Record<State, string> = {
  onTime: "var(--success)",
  late: "var(--warning)",
  missing: "var(--destructive)",
};

const countOf = (view: AnalyticsView, key: State) => {
  if (key === "onTime") return view.coverage.submitted;
  return Number(view.cards.find((card) => card.key === key)?.value ?? 0);
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

  const data = (
    [
      { key: "onTime", name: "On time" },
      { key: "late", name: "Late" },
      { key: "missing", name: "Missing" },
    ] as const
  ).map((state) => ({ ...state, count: countOf(view, state.key) }));

  const caption = `Submission breakdown: ${data[0].count} on time, ${data[1].count} late, ${data[2].count} missing, of ${view.coverage.expected} expected.`;

  return (
    <section className="mt-6">
      <h2 className="font-medium text-[14px] text-ink">Submission breakdown</h2>
      <p className="mt-1 text-[12px] text-ink/55">{caption}</p>

      <div
        className="mt-2 h-56 min-w-0 overflow-hidden"
        role="img"
        aria-label={caption}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tick={{ fill: "var(--ink)", fillOpacity: 0.65, fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--ink)", fillOpacity: 0.5, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)" }}
              contentStyle={{
                background: "var(--surface-alt)",
                border: "1px solid var(--hairline)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--ink)" }}
              itemStyle={{ color: "var(--ink)" }}
            />
            <Bar dataKey="count" name="Reports" radius={[4, 4, 0, 0]}>
              {data.map((state) => (
                <Cell key={state.key} fill={STATE_FILL[state.key]} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                fill="var(--ink)"
                fillOpacity={0.7}
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
