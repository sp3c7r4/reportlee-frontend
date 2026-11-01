# Design: analytics-charts

| Area | Choice |
|---|---|
| Capability | `analytics`, existing, not new. The capability was built under `insight-screens` (UI-13). The delta uses ADDED requirements only, because that main spec is not archived yet and a MODIFIED delta cannot resolve against a missing base spec |
| Screen | the existing `src/components/analytics/analytics-screen.tsx`; an enhancement, not a new screen |
| Charts | two inline SVG components in `src/components/analytics/`: `SubmissionChart` and `KpiCoverageChart` |
| Chart library | none; two simple shapes do not justify a dependency the spec would have to stop for |
| Geometry | pure functions in `src/lib/chart-geometry.ts`, tested with `node --test`; the SVG components stay thin |
| Data source | the `AnalyticsView` that `analyticsFor` already returns; no new data, no change to `src/data/` |
| Submission shape | a horizontal stacked bar of on time, late and missing, each segment labelled in text |
| KPI shape | one horizontal bar per KPI, included of total, each labelled with the KPI name and "N of M" |
| Text equivalent | the existing Table view stays as the keyboard-reachable text for every number |
| Default | charts are the default visual; the Table view toggle is the fallback |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Target the existing `analytics` capability, not a new one, with an ADDED-only delta | The screen, the figures and the table view already exist, so this is a delta on `analytics`; but the `analytics` main spec is not archived into `openspec/specs/` yet, and `openspec` refuses a MODIFIED or RENAMED delta against a base spec that does not exist, so every requirement here is ADDED and layers onto the capability |
| D2 | Hand-rolled inline SVG, no chart library | Two static shapes with no interaction; a dependency here is the kind of thing the spec is meant to stop, and AGENTS.md requires naming any new dependency first |
| D3 | Chart math lives in `src/lib/chart-geometry.ts`, the SVG components stay thin | Plain functions with no React are unit-testable with `node --test`; an SVG component is not |
| D4 | Both charts read `analyticsFor` output, never the raw Reports | The cards and the table already read that output; sharing the source is what guarantees a segment and its card cannot disagree |
| D5 | Submission breakdown is a stacked bar, not a donut | A bar labels three segments in reading order and degrades to a plain row of counts; a donut needs arc-path geometry and more care to label, for no extra meaning at three segments |
| D6 | KPI coverage is horizontal bars, one per KPI | A horizontal bar takes a long KPI name on its own line and reads top to bottom like the existing KPI list |
| D7 | Charts are the default, the table is the fallback | The task fixes this: charts are the default visual and the table stays as the accessible text equivalent |
| D8 | Every segment and bar carries a text label with its count | Colour is not the only encoding, and the number is readable without the table |
| D9 | Each chart carries an accessible name (image role with a label or a visually hidden caption) | An assistive technology must be told what the chart is; the values themselves are reachable in the table |
| D10 | Empty states are worded, never a dash | AGENTS.md forbids a dash for an empty value; "nothing to compute yet" and "no KPIs yet" are sentences |
| D11 | Preserve every existing invariant | Nothing ranks a person, the small-sample banner still shows and figures below five are shown not trusted, the Head filter stays locked, times stay in `workspace.timeZone`, and the me/space/workspace scope is unchanged |

## Rejected

- A chart library (Recharts, Chart.js, visx, or similar): two static shapes do not need a dependency, a
  dependency must be named and approved first per AGENTS.md, and `insight-screens` already rejected a chart
  library for this screen for the same reason.
- A donut for the submission breakdown: arc-path geometry and segment labelling buy nothing over a stacked
  bar at three segments, and a bar degrades more gracefully to a labelled row.
- A trend line over periods: there is still no period comparison and no backend, so a trend would be
  decoration; `insight-screens` left it out for this reason and this change does not add it.
- Recomputing the figures inside the chart from raw Reports: it would let a chart drift from the cards; the
  charts read the single `AnalyticsView`.

## Known ceiling

Still simulated. `analyticsFor` computes on `SAMPLE_REPORTS` on this device; there is no backend and this
change adds none. The chart geometry and the fact that a chart matches the cards are real logic and are
tested; the underlying numbers are the same sample numbers the screen already shows. When the backend lands,
the charts need no change: they read whatever `analyticsFor` returns.

## Backend

No backend change. There is no backend repo yet, and this change does not need one. The charts read the
existing in-memory `AnalyticsView`.

## Data

No data change. No table, column, enum or migration is touched. No shape in `src/data/` changes, and
`src/lib/analytics.ts` keeps its existing types and `analyticsFor` output. The only new types are the plain
geometry inputs and outputs in `src/lib/chart-geometry.ts`.

## Frontend

- Screen: `AnalyticsScreen` in `src/components/analytics/analytics-screen.tsx`. The charts slot in below the
  figure cards and above (or beside) the existing Table view toggle, which is unchanged.
- New components: `SubmissionChart` reads `view.cards` and `view.coverage` and draws on time, late and
  missing; `KpiCoverageChart` reads `view.kpis` and draws one bar per KPI. Both are pure presentational, take
  the already-computed `AnalyticsView` slice as props, and call nothing.
- New logic: `src/lib/chart-geometry.ts`, plain functions, no React:
  - a percentage-to-bar-length helper (a count and a total to a width in a fixed viewbox, clamped to the
    viewbox, 0 when the total is 0),
  - a stacked-segment layout (on time, late, missing counts to segment offsets and widths that sum to the
    track and never overflow).
- Validation of inputs: counts are non-negative integers from `analyticsFor`; the helpers MUST clamp a width
  to the track and MUST return an empty layout (no segments) when the total is 0, so a zero period draws
  nothing and the component shows the worded empty state instead. A KPI `total` of 0 yields a zero-length
  bar; the component shows "no KPIs yet" when the KPI list is empty.
- States: loading and error are the screen's existing states. Empty is worded per chart: "nothing to compute
  yet" when `coverage.expected` is 0, "no KPIs yet" when `view.kpis` is empty. No dash character anywhere.
- Accessibility: each chart has an accessible name (image role with an `aria-label` or a visually hidden
  caption), each segment and bar is labelled in text with its count, and the Table view remains the full text
  equivalent, reachable from the keyboard.
- Types that change: none mirrored across repos. New local types live in `src/lib/chart-geometry.ts`.

## Order of work

No migration and no backend, so the order is: the pure geometry and its failing test first, then the two SVG
components, then the wiring into `AnalyticsScreen`, then the validation pass.

1. `scripts/chart-geometry.test.ts` red, then `src/lib/chart-geometry.ts` green.
2. `SubmissionChart` and `KpiCoverageChart` reading the `AnalyticsView`.
3. Wire both into `AnalyticsScreen`, charts default, Table view the fallback, empty states worded.
4. Validation: biome and tsc on the touched files, `npm test`, `npm run build`, browser pass, em dash scan.

## Acceptance checks

- **AC1** The submission chart renders from `analyticsFor` output and shows on time, late and missing for the
  selected period and scope.
- **AC2** The KPI coverage chart renders one labelled horizontal bar per KPI from `view.kpis`, each reading
  "N of M".
- **AC3** The chart numbers match the figure cards and the Table view rows exactly, for the same period and
  scope.
- **AC4** Each chart has an accessible name, and every value a chart draws is reachable as text in the Table
  view (the chart is not the only way to read a number).
- **AC5** No chart ranks, names or orders an individual; the submission chart shows counts by state only.
- **AC6** When the submitted count is below five, the small-sample banner still shows and the charts still
  draw the figures, shown and not trusted.
- **AC7** A Head's charts are computed from their own Space only, and the Space filter stays locked with its
  reason.
- **AC8** Times stay in `workspace.timeZone` and the me, space and workspace scopes behave as before; the
  charts add no new scope.
- **AC9** The submission chart area says "nothing to compute yet" when the expected population is zero, and
  the KPI chart area says "no KPIs yet" when there are none, both in words.
- **AC10** No new dependency is added; the SVG is drawn with what is installed.
- **AC11** No em dash or en dash appears in any user-facing string the change adds.
- **AC12** `src/lib/analytics.ts` types, `analyticsFor` output, `src/data/` and every auth file are
  unchanged.
