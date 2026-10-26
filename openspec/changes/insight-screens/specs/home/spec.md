# home

## Purpose

The first screen after sign-in: what needs this person, and enough numbers to know whether the period is on
track.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions.

## ADDED Requirements

### Requirement: Needs your attention, per role

Home MUST lead with a "Needs your attention" list whose items depend on the role: Staff see the current
period, its deadline, their own submission state, their open tasks and their recent decisions; a Head sees Reports waiting on them,
their own Report state, and who is late or missing; an Admin sees Spaces behind, Reports waiting on Admins and
plan usage. Every item MUST link to the screen that fixes it.

#### Scenario: Staff, nothing submitted

- **WHEN** Staff open Home during an open period with no Report
- **THEN** the first item is the period and a link to the form

#### Scenario: Staff, a decision this week

- **WHEN** Staff had a Report approved or rejected this week
- **THEN** Home lists it with the decision and a link to the Report

#### Scenario: Admin, nothing waiting

- **WHEN** an Admin has nothing behind and nothing waiting
- **THEN** the list says so instead of showing an empty card

### Requirement: Summary cards carry their scope

Home MUST show a small set of summary cards per role, and each card MUST state the period and scope it
covers. A card MUST NOT show a figure without its coverage.

#### Scenario: A figure with coverage

- **WHEN** a card shows submissions
- **THEN** it names the period and the Space or Workspace it counts

### Requirement: Home has the four states

Home MUST have a loading state, an error state with Retry, an empty state per role, and a state for a
read-only Workspace.

#### Scenario: Read-only Workspace

- **WHEN** the Workspace is read-only
- **THEN** Home says so and names what an Admin may still do

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Home | `GET /api/v1/home` | none | `{ attention: AttentionItem[], cards: SummaryCard[] }` | 401 |

Guards: `jwt.validateToken`, then the Membership from the token; the server decides which items exist for a
role.

## Frontend

- `/dashboard`: attention list, then cards, then the existing action slot behaviour (Submit report for
  authors only).
- Types: `AttentionItem`, `SummaryCard` in `src/lib/home.ts`.
