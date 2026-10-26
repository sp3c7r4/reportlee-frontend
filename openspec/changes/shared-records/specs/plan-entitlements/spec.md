# plan-entitlements

## Purpose

One place that answers what a plan may use, and one function that answers what a person may see of a Workspace's
history. Screens ask; they do not each decide.

No backend exists, and gating here is presentation: the server must enforce the same matrix. A disabled feature
in this app is a courtesy, not a permission.

## ADDED Requirements

### Requirement: The gate is one function

`src/lib/entitlements.ts` MUST export one query, `entitlement(plan, feature)`, returning `allowed`, `reason` and
the plan that unlocks it. A screen MUST NOT compare plan strings itself.

#### Scenario: One question

- **WHEN** analytics asks whether trends are available
- **THEN** it asks the entitlements module and does not read the plan name

### Requirement: Locked means visible and disabled, with the reason

A feature the plan does not include MUST still be shown, disabled, carrying a sentence naming the plan that
unlocks it and a link to billing. It MUST NOT be hidden, and it MUST NOT be shown as if it worked.

#### Scenario: Starter and trends

- **WHEN** a Starter Workspace opens analytics
- **THEN** the trend and comparison are present but disabled, with "Team adds trends" and a link to billing

### Requirement: The matrix

Starter MUST have the current period's four cards and the late-or-missing list, and nothing else. Team and trial
MUST add trends, Space comparison, KPI cards, the Assistant and AI drafting, and location tagging. Enterprise
MUST add audit-log file export. Reports export MUST be available on every plan.

#### Scenario: Starter analytics

- **WHEN** a Starter Administrator opens analytics
- **THEN** the four cards and the late-or-missing list work and every other figure is disabled with its reason

#### Scenario: Reports export on Starter

- **WHEN** a Starter Administrator opens the export page
- **THEN** Reports export is offered alongside the locked audit export

### Requirement: Hidden Reports are excluded everywhere by one rule

A Report older than the plan's retention window MUST be excluded from lists, search, analytics and the
Assistant's sources. The exclusion MUST come from one function over the plan and the clock, so four screens
cannot disagree.

#### Scenario: A 45 day old Report on Starter

- **WHEN** a Starter Workspace searches for it
- **THEN** it does not appear in results, analytics, or any Assistant answer about the period

### Requirement: The plan is data

`Workspace` MUST carry `plan`, and every sample Workspace MUST set it, so the gate is reachable by switching
Workspace rather than by a query parameter, cookie or second build.

#### Scenario: Switching Workspaces

- **WHEN** the Workspace switcher moves from a Team Workspace to a Starter one
- **THEN** the locked features change with it

## Frontend

- No screen of its own. The gate is read by analytics, the Assistant, settings, the export page and search.
- Types: `Plan` in `src/data/viewer.ts`, `Feature`, `Entitlement` in `src/lib/entitlements.ts`.
