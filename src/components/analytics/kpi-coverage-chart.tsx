"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsView } from "@/lib/analytics";

/**
 * KPI coverage as one Recharts horizontal bar per KPI, included of total, read from
 * view.kpis so a bar and its table row cannot disagree. Each bar is labelled "N of M", so a
 * KPI nobody filled in reads as that, not a zero, and colour is never the only encoding.
 * When there are no KPIs the area says so in words.
 */

export function KpiCoverageChart({ view }: { view: AnalyticsView }) {
  if (view.kpis.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="font-medium text-[14px] text-ink">KPI coverage</h2>
        <p className="mt-2 rounded-md border border-hairline px-3 py-3 text-[13px] text-ink/60">
          No KPIs yet for this period.
        </p>
      </section>
    );
  }

  const data = view.kpis.map((kpi) => ({
    name: kpi.name,
    included: kpi.included,
    label: `${kpi.included} of ${kpi.total}`,
  }));
  const widest = Math.max(1, ...view.kpis.map((kpi) => kpi.total));

  return (
    <section className="mt-6">
      <h2 className="font-medium text-[14px] text-ink">KPI coverage</h2>
      <p className="mt-1 text-[12px] text-ink/55">
        Reports that included each KPI, out of the Reports in scope.
      </p>

      <div
        className="mt-2 min-w-0 overflow-hidden"
        style={{ height: Math.max(120, data.length * 38) }}
        role="img"
        aria-label={`KPI coverage: ${data
          .map((row) => `${row.name} ${row.label}`)
          .join(", ")}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
            barCategoryGap={10}
          >
            <XAxis type="number" domain={[0, widest]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--ink)", fillOpacity: 0.75, fontSize: 11.5 }}
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
            <Bar
              dataKey="included"
              name="Reports that included it"
              fill="var(--brand)"
              radius={[0, 4, 4, 0]}
              background={{ fill: "var(--surface-muted)" }}
            >
              <LabelList
                dataKey="label"
                position="right"
                fill="var(--ink)"
                fillOpacity={0.6}
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
