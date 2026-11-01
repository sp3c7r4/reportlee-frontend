## Why

Analytics ships four figure cards and a table view, but no picture. The `insight-screens` design left this
open on purpose: "no SVG trend chart is drawn yet, because a chart without a period comparison would be
decoration." We do not have period comparison, so this change does not add a trend. It adds the two charts
that read the figures already on the screen: the submission breakdown (on time, late, missing) and KPI
coverage. A reader sees the shape of the period at a glance, and the table view stays as the text that says
the same numbers.

## What Changes

- Add a submission breakdown chart to `/dashboard/analytics`: on time, late and missing for the selected
  period and scope, drawn as inline SVG from the figures `analyticsFor` already returns.
- Add a KPI coverage chart: one horizontal bar per KPI, included of total, from `view.kpis`.
- Keep the four figure cards. Keep the Table view toggle as the accessible text equivalent, and make the
  charts the default visual with the table as the fallback.
- Add pure chart geometry as plain functions in `src/lib/chart-geometry.ts`, tested with `node --test`, so
  the SVG components stay thin.
- No new dependency. No chart library. No backend. No change to `src/data/` shapes or any auth file.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `analytics`: this change targets the existing `analytics` capability (built under `insight-screens`,
  UI-13), adding the two charts, their accessible names and text equivalent, their empty states, and the
  requirements that keep the existing invariants (no ranking, the small-sample banner, the locked Head
  filter). The delta uses ADDED requirements only, because the `analytics` main spec is not archived into
  `openspec/specs/` yet and a MODIFIED delta cannot resolve against a base spec that does not exist. The new
  chart requirements layer onto the capability without redefining its existing behaviour.

## Impact

- New: `src/lib/chart-geometry.ts` and `scripts/chart-geometry.test.ts`;
  `src/components/analytics/submission-chart.tsx` and
  `src/components/analytics/kpi-coverage-chart.tsx`.
- Touched: `src/components/analytics/analytics-screen.tsx` (slot the two charts in, default to charts with
  the table as fallback).
- Unchanged: `src/lib/analytics.ts` types and `analyticsFor` output, `src/data/`, every auth file. The
  charts are pure presentational components fed by the existing `AnalyticsView`.
- No chart library and no other dependency is added; the SVG is drawn with what is installed.
