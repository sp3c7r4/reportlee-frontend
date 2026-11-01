## 1. Chart geometry and its tests (FE)

- [x] 1.1 `scripts/chart-geometry.test.ts` red: a count-and-total to a bar width clamps to the track and
      returns 0 width when the total is 0; a stacked layout of on time, late and missing returns segment
      offsets and widths that sum to the track and never overflow; a KPI with six of ten gives a bar at six
      tenths of the track.
- [x] 1.2 `src/lib/chart-geometry.ts` green: plain functions, no React, no hooks. The width helper clamps to
      the track; the stacked layout returns no segments when the total is 0.

## 2. Chart components (FE)

- [x] 2.1 `src/components/analytics/submission-chart.tsx`: a stacked horizontal bar of on time, late and
      missing, read from `view.cards` and `view.coverage`, each segment labelled in text with its count, an
      accessible name through an image role with a label or a visually hidden caption. Shows "nothing to
      compute yet" in words when `coverage.expected` is 0. Names no individual.
- [x] 2.2 `src/components/analytics/kpi-coverage-chart.tsx`: one horizontal bar per KPI from `view.kpis`, each
      labelled with the KPI name and reading "N of M", an accessible name as above. Shows "no KPIs yet" in
      words when the KPI list is empty.

## 3. Wire into the screen (FE)

- [x] 3.1 Slot both charts into `src/components/analytics/analytics-screen.tsx` below the figure cards. Charts
      are the default visual; the existing Table view toggle stays as the text equivalent and the fallback.
- [x] 3.2 Preserve every invariant: the small-sample banner still shows below five Reports and the charts
      still draw the figures; the Head `lockedReason` and locked Space filter stay; times stay in
      `workspace.timeZone`; the me, space and workspace scopes are unchanged; nothing ranks a person.
- [x] 3.3 Empty states worded, no dash character: "nothing to compute yet" when expected is 0, "no KPIs yet"
      when there are none.

## 4. Validation

Run inside `reportlee-frontend` on branch `feature/analytics-charts`.

### Tests (`npm test`, node --test, no framework added)

- RED first: `node --test scripts/chart-geometry.test.ts` before `src/lib/chart-geometry.ts` existed failed
  with `ERR_MODULE_NOT_FOUND` for `src/lib/chart-geometry.ts` (1 suite, 0 pass, 1 fail).
- GREEN after implementing: `node --test scripts/chart-geometry.test.ts` -> tests 8, pass 8, fail 0.
- Full suite before this change: tests 190, pass 190, fail 0.
- Full suite after this change: tests 198, pass 198, fail 0 (190 + 8 new geometry tests; no existing
  analytics test broke).

### `npx tsc --noEmit`

- Exit 0 after a clean `.next` rebuild. No type errors.
- Note: a stale `.next/dev/types/validator.ts` (left by a prior branch's `next dev`, referencing
  `dashboard/leads` and `capture/[token]` routes that do not exist on this branch) produced two TS2307
  errors. Those are stale generated artifacts, not source. Removing `.next` and rebuilding clears them; tsc
  then exits 0.

### `npx biome check <touched files>`

- `src/lib/chart-geometry.ts`, `scripts/chart-geometry.test.ts`,
  `src/components/analytics/submission-chart.tsx`, `src/components/analytics/kpi-coverage-chart.tsx`,
  `src/components/analytics/analytics-screen.tsx`: checked 5 files, no diagnostics. (Formatting applied with
  `npx biome format --write` on these files only.)

### `npm run build`

- Clean build succeeds: "Compiled successfully in 77s", and `/dashboard/analytics` is in the route list.

### Em dash / en dash scan

- `Select-String -Pattern "[\u2014\u2013]"` over the five touched files: NO DASH HITS. Empty states read
  "Nothing to compute yet for this period." and "No KPIs yet for this period." in words.

### Acceptance checks AC1..AC12

- AC1 met: `SubmissionChart` reads `view.coverage.submitted` (on time), the `late` card value, and the
  `missing` card value; drawn via `stackedSegments`.
- AC2 met: `KpiCoverageChart` maps `view.kpis` to one bar each, labelled with the name and "N of M" (uses
  `barWidth`). Geometry test "a KPI with six of ten" asserts 0.6 of the track.
- AC3 met: both charts read the same `AnalyticsView` the cards and Table view read; the Table view KPI rows
  and the chart both read `kpi.included`/`kpi.total`.
- AC4 met: each `<svg>` has `role="img"` + `aria-label`; every count is also in visible text beside the
  chart; the Table view remains the keyboard-reachable text equivalent.
- AC5 met: `SubmissionChart` shows counts by state (on time/late/missing) only; no person named or ordered.
- AC6 met: the small-sample banner block in `analytics-screen.tsx` is untouched and still renders when
  `view.smallSample`; charts render regardless.
- AC7 met: charts take `view` which already carries the Head's locked `spaceFilter`/`lockedReason`; the
  locked-filter paragraph is untouched. (Browser eyeball below.)
- AC8 met: no scope logic changed in `analyticsFor` or the screen; the time-zone line is untouched.
- AC9 met: worded empty states, no dash (see scan above).
- AC10 met: no dependency added; `package.json` unchanged; inline SVG only.
- AC11 met: dash scan clean.
- AC12 met: `src/lib/analytics.ts`, `src/data/`, and every auth file are untouched; only new files plus the
  screen were edited.

### Human browser pass (dev server started by the user: `npm run dev`, http://localhost:3000/dashboard/analytics)

Eyeball: the submission stacked bar and the KPI bars render below the four figure cards; the segment/bar
counts match the cards and the Table view rows; the small-sample banner still shows when the sample is
below five; a Head sees the locked Space filter and its reason; a period with no expected Reports shows
"Nothing to compute yet for this period." and a scope with no KPIs shows "No KPIs yet for this period."
