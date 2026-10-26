# workspace-settings

## Purpose

Where a Workspace Admin changes how the Workspace behaves, and where a read-only Workspace explains itself.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions. Every
setting here is a server rule the UI mirrors; nothing in this area is enforced by hiding a control.

## ADDED Requirements

### Requirement: The area is Admin only

`/dashboard/settings` MUST be reachable by a Workspace Admin only, with each page at its own address
(`/dashboard/settings/general`, `reporting`, `ai`, `billing`, `audit`, `export`). A Head of Space or Staff
member MUST NOT be offered the entry, and the screens MUST NOT claim to enforce that.

#### Scenario: A Head of Space

- **WHEN** a Head of Space looks for Settings
- **THEN** no Settings entry exists in their navigation or their user menu

### Requirement: Save changes waits for a change

Every settings page MUST disable Save changes until something actually changed, MUST show what changed, and
MUST report success or failure beside the form. Leaving with unsaved changes MUST ask before discarding.

#### Scenario: Nothing changed

- **WHEN** a settings page is opened and no field is touched
- **THEN** Save changes is disabled

#### Scenario: A failed save

- **WHEN** the save fails
- **THEN** the form keeps the entered values and a message offers Retry

### Requirement: The schedule carries its timezone and its cadence fields

The schedule MUST include the Workspace's timezone and MUST show only the fields the cadence needs: weekday and
time for weekly and fortnightly, day of month or last day for monthly and quarterly, and time for daily. Changing
the timezone MUST restate the deadline it produces.

#### Scenario: Weekly

- **WHEN** the cadence is weekly
- **THEN** the fields are weekday, time and timezone, and no day-of-month field is shown

#### Scenario: Monthly

- **WHEN** the cadence is monthly
- **THEN** the fields are day of month or last day, time and timezone

### Requirement: A schedule change names its effective date

A change to the reporting schedule MUST say which Reporting period it takes effect from, and MUST NOT
retroactively change a period that has already started.

#### Scenario: Changing the cadence

- **WHEN** the cadence is changed mid-period
- **THEN** the page says the change applies from the next period, and names that period

### Requirement: The AI switch applies immediately, without a Save

The AI features switch MUST apply the moment it is toggled, with no Save step, MUST ask for confirmation before
enabling, MUST show its notice after the change, and MUST control both the Assistant and AI drafting. On a plan
without AI it MUST be disabled with the plan reason.

#### Scenario: Turning AI on

- **WHEN** the switch is turned on
- **THEN** a confirmation appears, and once confirmed the Assistant and drafting are both available

#### Scenario: Starter

- **WHEN** a Starter Workspace opens the AI page
- **THEN** the switch is disabled and names the plan that includes AI

#### Scenario: Turning AI off

- **WHEN** the switch is saved as off
- **THEN** the Assistant is greyed with its reason in the sidebar and the panel will not open

### Requirement: Four banners, each with its own truth

The shell MUST render exactly one of: trial with the days left, a 14 day grace period, past due, or read-only.
Days left MUST be computed from the trial end date the API returns; no money is computed anywhere.

#### Scenario: Trial

- **WHEN** the Workspace is in its trial with nine days left
- **THEN** the banner says nine days and links to billing

#### Scenario: Grace

- **WHEN** the Workspace is past due and inside its grace period
- **THEN** the banner names the days left before it becomes read-only

### Requirement: A suspended Workspace has its own screen

A suspended Workspace MUST show a screen to every member naming the suspension and who to contact, and MUST NOT
render the app behind it.

#### Scenario: Suspended

- **WHEN** a member signs in to a suspended Workspace
- **THEN** the screen names the suspension and offers a contact route, and no navigation is shown

### Requirement: A read-only Workspace explains itself

A read-only Workspace MUST show a banner on every signed-in screen naming why it is read-only, and MUST name
what an Admin can still do. Actions that are blocked MUST say so where they are attempted.

#### Scenario: Over the limit

- **WHEN** the Workspace is read-only because it is over its member limit
- **THEN** the banner says so and points an Admin at members and billing

### Requirement: Billing shows what the API returns

Plan and billing MUST display the plan, the status and the next payment date as the API returns them, and MUST
NOT compute, prorate or estimate a figure. Checkout MUST open the hosted page, not an in-app form.

#### Scenario: Trial

- **WHEN** the Workspace is in its trial
- **THEN** the page shows the trial and its end date as given, with no arithmetic

### Requirement: The audit page and the export page

The audit page MUST list entries newest first, append-only, with filters for action and actor. The export page
MUST offer Reports, comments and members as CSV and JSON, MUST exclude Assistant conversations entirely, MUST log
each export as an audit entry, and MUST be gated: Reports export on every plan, the audit file export on
Enterprise only.

#### Scenario: An export

- **WHEN** a report export is started
- **THEN** an audit entry records who exported what, and no Assistant conversation is included

#### Scenario: Audit file on Starter

- **WHEN** a Starter Administrator opens the export page
- **THEN** the audit export is disabled with the reason and Reports export still works

### Requirement: The remaining settings are specific

The edit window MUST accept a bounded range of minutes, with the bounds stated. The location setting MUST carry a
notice naming who can see a captured location. The Workspace logo MUST be marked as simulated in this build.

#### Scenario: Too long a window

- **WHEN** an edit window of 0 or 10080 minutes is entered
- **THEN** the field refuses it and names the allowed range

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Read settings | `GET /api/v1/workspace/settings` | none | `WorkspaceSettings` | 401, 403 |
| Save general | `PATCH /api/v1/workspace/settings` | the changed fields | `WorkspaceSettings` | 401, 403, 400 |
| Save schedule | `PATCH /api/v1/workspace/schedule` | `{ cadence, deadlineDay, deadlineTime }` | `ScheduleChange` | 401, 403, 409 |
| AI switch | `PATCH /api/v1/workspace/ai` | `{ enabled }` | `{ enabled }` | 401, 403 |
| Audit log | `GET /api/v1/audit-log?cursor=` | none | `AuditEntry[]` | 401, 403 |
| Export | `POST /api/v1/exports` | `{ scope }` | `{ id }` | 401, 403, 429 |

Guards: `jwt.validateToken`, then a Workspace Admin role guard on every call in this table.

## Frontend

- `/dashboard/settings` with its six pages, each with its own address and its own Save state.
- The read-only banner lives in the shell so it appears once, at the top, on every screen.
- Types: `WorkspaceSettings`, `ScheduleChange`, `AuditEntry`, `BillingSnapshot` in `src/lib/settings.ts`.
