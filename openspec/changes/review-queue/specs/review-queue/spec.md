# review-queue

## Purpose

The reviewer's queue: Reports waiting on a decision, people who have not submitted, and the decisions.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions.
Which Reports a reviewer may decide is a server rule; the queue's scoping mirrors it and is not access
control.

## ADDED Requirements

### Requirement: Who reviews what

A Head of Space MUST review their own Space only, and a Workspace Admin the whole Workspace. A Head's own
Report MUST NOT appear in that Head's queue. A Space with no Head MUST have its Reports in the Admin queue.

#### Scenario: A Head's own Report

- **WHEN** a Head opens the queue
- **THEN** their own Report is absent there and present for a Workspace Admin

#### Scenario: A Space without a Head

- **WHEN** a Space has no Head and its Staff submitted
- **THEN** those Reports appear in the Admin queue

### Requirement: A table with filters and a not-submitted tab

The queue MUST group Reports by period, offer filter chips (All, Waiting, Approved, Rejected), and a
separate "Not submitted" tab whose rows are hatched and also say "Not submitted" in words. Rows MUST show
the person, the Space, the submitted time in the Workspace's timezone and the state pill. At 390px rows
MUST become cards.

#### Scenario: Not submitted

- **WHEN** the not-submitted tab is opened
- **THEN** each person without a Report is listed, marked in words as well as by pattern

#### Scenario: An empty filter

- **WHEN** Rejected is picked and nothing was rejected
- **THEN** an empty state names the filter and offers All

### Requirement: Reviewers see a Report, a queue row does not

Opening a Report page as a reviewer MUST set `firstSeenAt` and, when it is empty, `windowStartedAt`. Listing or
previewing a row in the queue MUST NOT set either.

#### Scenario: Opening from the queue

- **WHEN** a reviewer opens a Report from a queue row
- **THEN** the Report's seen clocks are set and the author's edit window starts

#### Scenario: Scrolling the queue

- **WHEN** the queue is loaded and filtered
- **THEN** no Report's clocks change

### Requirement: Not submitted means Staff and Heads, never Admins

The expected population MUST be Staff and Heads of the Space. A Workspace Admin MUST NOT appear as missing. A
draft MUST count as missing and MUST NOT be shown as submitted. A Head MUST see their own Space's Staff only.

#### Scenario: A Head's queue

- **WHEN** a Head opens the not-submitted tab
- **THEN** it lists their Space's Staff without Reports, and no Admins and no other Space

#### Scenario: A draft past the deadline

- **WHEN** somebody holds a draft past the deadline
- **THEN** they appear as not submitted and the draft's content is not shown

### Requirement: Overrides go through reopen

A rejected Report MUST NOT be approved directly. An Admin overriding a Head MUST reopen the Report and then
decide it, so both actions are recorded. A decision posted against a Report that is not pending MUST be refused
with 409.

#### Scenario: Overriding a rejection

- **WHEN** an Admin disagrees with a rejection
- **THEN** they reopen it with a reason and then decide it, and the timeline shows both

#### Scenario: A second decision

- **WHEN** a decision is posted against a decided Report
- **THEN** the call is refused with 409 and the queue reloads

### Requirement: A read-only Workspace accepts no decisions

In a read-only Workspace, Approve, Reject and Reopen MUST be absent with the reason, and a decision posted anyway
MUST be refused by the server.

#### Scenario: Read-only review

- **WHEN** a reviewer opens the queue in a read-only Workspace
- **THEN** no decision control is rendered and the page says why

### Requirement: A decision needs what it needs

Approve MUST be available on pending Reports. Reject MUST require a reason and MUST stay disabled until one is
written. Reopen MUST be offered only on approved Reports and MUST also require a reason. The reason MUST be
stored as a `decision` comment through the shared `Comment` shape, and the decision MUST record when and who.

Reopen MUST return the Report to pending, MUST clear `windowStartedAt` so a fresh window starts, MUST leave
`firstSeenAt` set, and MUST NOT restore Delete for the author.

#### Scenario: Reject without a reason

- **WHEN** Reject is pressed with an empty reason
- **THEN** nothing is posted and the field says the reason is required

#### Scenario: Reopen

- **WHEN** an approved Report is reopened with a reason
- **THEN** it returns to pending, the timeline gains Reopened, the window is cleared, the author can edit with
the reason in a banner, `firstSeenAt` is unchanged, and Delete stays absent

### Requirement: Bulk decisions are separate decisions

The bulk bar MUST say how many Reports it affects, MUST apply one shared reason, and MUST record a separate
decision per Report with its own timestamp. It MUST NOT act on a Report already decided.

#### Scenario: Bulk reject

- **WHEN** three pending Reports are rejected with one reason
- **THEN** each carries the reason and its own entry, and the selection clears

### Requirement: States

The queue MUST have loading, error with Retry, and empty states per tab and per filter.

#### Scenario: A failed load

- **WHEN** the queue fails to load
- **THEN** a message offers Retry and no blank table is shown

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Queue | `GET /api/v1/reports?scope=review&periodId=&status=` | none | `{ reports: Report[], missing: MissingPerson[] }` | 401, 403 |
| Decide | `POST /api/v1/reports/:id/decision` | `{ decision, reason? }` | `Report` | 401, 403, 404, 409 |
| Bulk decide | `POST /api/v1/reports/decisions` | `{ ids, decision, reason }` | `Report[]` | 401, 403, 409 |

Guards: `jwt.validateToken`, role guard (Staff has no queue), then Space scope for a Head and Workspace
scope for an Admin. The server refuses a Head deciding their own Report.

## Frontend

- `/dashboard/review`: period header, tabs, chips with counts, table, bulk bar, decision dialogs, four states.
- Reached from the nav's Review item and the Review tab on a phone.
- Types: `ReviewTab`, `DecisionKind`, `DecisionInput`, `MissingPerson` in `src/lib/review.ts`.
