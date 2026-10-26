# analytics

## Purpose

The numbers behind the reporting: how many arrived, who is behind, and what the KPIs actually say, with every
figure traceable to the Reports it counts.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions.
Which figures a person may see is a server rule; the screen mirrors it and does not enforce it.

## ADDED Requirements

### Requirement: The four cards are defined

Analytics MUST show On-time rate, Late, Missing and Average time to decision. Average time to decision MUST be
measured from submission to the first decision. The expected population MUST be Staff and Heads of the Space, and
a draft MUST count as missing, never as submitted.

#### Scenario: Average time to decision

- **WHEN** a Report was submitted on Monday and first decided on Thursday
- **THEN** the average counts three days for it

#### Scenario: A draft

- **WHEN** somebody holds a draft for the selected period
- **THEN** they count as missing in the denominator

### Requirement: Every figure states its coverage

Each metric MUST state the period and the scope it covers and MUST drill down to the people or Reports behind
it. A figure without coverage MUST NOT be rendered.

#### Scenario: Submissions

- **WHEN** a card reads 18 of 24 submitted
- **THEN** it names the period and the scope, and opening it lists the 18 and the 6

### Requirement: Periods in progress are labelled

The current period MUST be labelled "in progress" and MUST NOT be compared with complete periods as if it were
finished.

#### Scenario: Today's period

- **WHEN** the selected period is the one in progress
- **THEN** the label appears beside the selector and the trend marks it

### Requirement: Small samples are flagged, and the threshold is an assumption

A figure drawn from fewer than five Reports MUST be flagged as a small sample, in words, next to that figure. The
threshold of five is an assumption: no document fixes it, and one constant changes it.

#### Scenario: One Report

- **WHEN** a KPI card is computed from one Report
- **THEN** it says the sample is small

### Requirement: KPI cards say how much they cover

A KPI card MUST read "N of M Reports included this figure", so a KPI nobody filled in cannot be read as a zero.

#### Scenario: A half-filled KPI

- **WHEN** a KPI appears in six of ten Reports
- **THEN** its card reads six of ten and does not average the missing four as zero

### Requirement: A Head's Space filter is fixed

A Head of Space MUST see the Space filter locked to their own Space, with the reason, and MUST NOT be able to
select another Space.

#### Scenario: A Head selects a Space

- **WHEN** a Head opens analytics
- **THEN** the Space filter shows their Space only and is disabled with a sentence

### Requirement: There is no individual leaderboard

The screen MUST NOT rank individual people against each other. A late-or-missing list MUST show who is behind
without ordering people as a competition.

#### Scenario: Late or missing

- **WHEN** the late-or-missing list is shown
- **THEN** people are grouped by state, not sorted by a score

### Requirement: Every chart has a table view

Each chart MUST offer a table view with the same data in text, reachable from the keyboard.

#### Scenario: A chart to a table

- **WHEN** the table view is selected for the submission trend
- **THEN** the same numbers are readable as a table

### Requirement: Staff see their record, not the Workspace

A Staff member MUST see `/dashboard/my-record`: their own submissions and KPIs over time. They MUST NOT see
other people's figures.

#### Scenario: A Staff member

- **WHEN** a Staff member opens My record
- **THEN** only their own numbers appear

### Requirement: States

Analytics MUST have loading, error with Retry, no-data for a period with no Reports, and a read-only
Workspace state.

#### Scenario: A new Workspace

- **WHEN** the Workspace has one period with no Reports
- **THEN** the screen says there is nothing to compute yet

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Metrics | `GET /api/v1/analytics?periodId=&spaceId=` | none | `MetricCard[]` | 401, 403 |
| Trend | `GET /api/v1/analytics/trend?periods=6` | none | `TrendPoint[]` | 401, 403 |
| KPIs | `GET /api/v1/analytics/kpis?periodId=&spaceId=` | none | `KpiCard[]` | 401, 403 |
| My record | `GET /api/v1/analytics/me` | none | `MyRecord` | 401 |

Guards: `jwt.validateToken`, then the role guard: a Head is scoped to their Space, an Admin to the Workspace,
and a Staff member reaches only their own record.

## Frontend

- `/dashboard/analytics` for Head and Admin; `/dashboard/my-record` for Staff.
- Period selector, Space filter, four metric cards, trend, Space comparison, KPI cards, late-or-missing list,
  each with its table view.
- Charts are drawn with plain SVG and the existing tokens; no chart library is added.
- Types: `MetricCard`, `TrendPoint`, `KpiCard`, `MyRecord`, `Coverage` in `src/lib/analytics.ts`.
