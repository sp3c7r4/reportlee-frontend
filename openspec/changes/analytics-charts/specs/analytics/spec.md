# analytics

## ADDED Requirements

### Requirement: The submission breakdown is shown as a chart

Analytics MUST show a submission breakdown chart for the selected period and scope, covering on time, late
and missing. The chart MUST be drawn from the same figures the cards show, so a segment and its card can
never disagree. On time MUST be the submitted people, late MUST be the late Reports, and missing MUST be the
expected population minus the people who submitted. Each segment MUST carry a text label with its count, so
colour is never the only encoding. The chart MUST NOT rank, name or order individuals; it shows totals by
state only.

#### Scenario: The chart matches the cards

- **WHEN** the cards read 18 of 24 submitted, 3 late and 6 missing for the period
- **THEN** the submission chart shows those same three counts, each labelled in text, for the same period and
  scope

#### Scenario: The chart never ranks a person

- **WHEN** the submission breakdown is shown
- **THEN** it displays counts by state and names no individual and orders no person against another

### Requirement: KPI coverage is shown as horizontal bars

Analytics MUST show a KPI coverage chart with one horizontal bar per KPI, each bar showing included of total
from the KPI figures. Each bar MUST be labelled with the KPI name and read "N of M", so a KPI nobody filled
in cannot be read as a zero and colour is never the only encoding. The bar lengths MUST come from included
over total, matching the KPI rows in the table view.

#### Scenario: A half-filled KPI

- **WHEN** a KPI appears in six of ten Reports
- **THEN** its bar is labelled with the KPI name and reads six of ten, matching the KPI row in the table view

#### Scenario: No KPIs

- **WHEN** no Report in scope carries a KPI
- **THEN** the KPI coverage chart area says there are no KPIs yet, in words, with no dash character

### Requirement: Each chart has an accessible name and a text equivalent

Each chart MUST carry an accessible name, through an image role with a label or a visually hidden caption, so
an assistive technology reads what the chart is. Every value in a chart MUST also be reachable as text: the
existing Table view is that text equivalent, and the chart MUST NOT be the only way to read a number.

#### Scenario: A screen reader reads the chart

- **WHEN** an assistive technology reaches the submission breakdown chart
- **THEN** it announces an accessible name that says what the chart shows

#### Scenario: Every number is reachable as text

- **WHEN** a reader cannot use the chart
- **THEN** the Table view gives every figure the chart draws as text

### Requirement: Charts are the default visual and the table is the fallback

The charts MUST be the default visual on the analytics screen, and the existing Table view MUST remain the
text equivalent and the fallback. Every number a chart draws MUST also be readable in the Table view, and
selecting the Table view MUST show the submission counts and the KPI coverage rows the charts show. Adding the
charts MUST NOT remove the Table view toggle.

#### Scenario: Charts render first

- **WHEN** the analytics screen first renders with data
- **THEN** the submission and KPI charts are shown by default and the Table view toggle is still present

#### Scenario: The table still gives the numbers

- **WHEN** the Table view is selected
- **THEN** the same submission counts and KPI coverage rows the charts show are readable as text

### Requirement: The chart area states its empty states in words

When there is nothing to draw, the chart area MUST say so in words and MUST NOT render an empty or misleading
shape. The submission chart MUST say there is nothing to compute yet when the expected population is zero. The
KPI coverage chart MUST say there are no KPIs yet when there are none. No empty value MUST be shown as a dash
character; use a plain word such as "None" or "Not set" or a short sentence.

#### Scenario: A period with no expected Reports

- **WHEN** the selected period has an expected population of zero
- **THEN** the submission chart area says there is nothing to compute yet, in words

#### Scenario: A scope with no KPIs

- **WHEN** no KPI appears in the Reports in scope
- **THEN** the KPI coverage chart area says there are no KPIs yet, in words

### Requirement: The charts preserve the small-sample banner

Adding the charts MUST NOT remove or hide the small-sample banner. When the submitted count is below the
small-sample threshold, the banner MUST still show and the charts MUST still render the figures, shown and not
trusted.

#### Scenario: The banner survives the charts

- **WHEN** the submitted count is below five and the charts are shown
- **THEN** the small-sample banner still appears and the charts still draw the figures

### Requirement: The charts stay inside the Head's locked scope

The charts MUST be drawn from the same scoped figures as the cards, so a Head of Space sees charts for their
own Space only and the locked Space filter is not bypassed by a chart.

#### Scenario: A Head's charts stay scoped

- **WHEN** a Head views the submission and KPI charts
- **THEN** both are computed from their own Space's figures only, and the Space filter stays locked with its
  reason

## Frontend

- Screen: `/dashboard/analytics` for Head and Admin, `/dashboard/my-record` for Staff, through the existing
  `AnalyticsScreen`.
- Charts: `SubmissionChart` (on time, late, missing for the period and scope) and `KpiCoverageChart` (one
  horizontal bar per KPI, included of total), both inline SVG fed by the `AnalyticsView` from `analyticsFor`.
- States: the charts share the screen's loading, error and empty states. Empty is worded: "nothing to
  compute yet" when the expected population is zero, "no KPIs yet" when there are none. No dash character.
- Accessible text equivalent: the existing Table view, which lists the four figures and the KPI rows as text,
  reachable from the keyboard.
- Charts are drawn with plain SVG and the existing tokens; no chart library is added.
