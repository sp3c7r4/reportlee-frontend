import type { AnalyticsView } from "@/lib/analytics";
import { barWidth } from "@/lib/chart-geometry";

/**
 * KPI coverage as one horizontal bar per KPI, included of total, read from view.kpis so a
 * bar and its table row cannot disagree. Each bar is labelled with the KPI name and reads
 * "N of M", so a KPI nobody filled in reads as that, not a zero, and colour is never the
 * only encoding. When there are no KPIs the area says so in words.
 */

const TRACK = 100;

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

  return (
    <section className="mt-6">
      <h2 className="font-medium text-[14px] text-ink">KPI coverage</h2>
      <ul className="mt-2 flex list-none flex-col gap-2.5 p-0">
        {view.kpis.map((kpi) => {
          const width = barWidth(kpi.included, kpi.total, TRACK);
          const label = `${kpi.name}: ${kpi.included} of ${kpi.total} Reports included it`;
          return (
            <li key={kpi.name} className="text-[12.5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink">{kpi.name}</span>
                <span className="text-ink/60 tabular-nums">
                  {kpi.included} of {kpi.total}
                </span>
              </div>
              <svg
                viewBox={`0 0 ${TRACK} 8`}
                preserveAspectRatio="none"
                role="img"
                aria-label={label}
                className="mt-1 h-2.5 w-full overflow-hidden rounded-full border border-hairline"
              >
                <rect
                  x={0}
                  y={0}
                  width={TRACK}
                  height={8}
                  className="fill-surface-muted"
                />
                <rect
                  x={0}
                  y={0}
                  width={width}
                  height={8}
                  className="fill-brand"
                />
              </svg>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
