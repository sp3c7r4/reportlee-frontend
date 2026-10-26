# my-reports

## Purpose

The author's list of their own Reports, and the Report page that shows one in full: what was sent, who
has looked, what changed, and what the author may still do about it.

No backend exists. Every call below is the documented contract, answered today by a `simulate*` function
in `src/lib/reports.ts`, in the envelope `{ timestamp, status, success, data }` and
`{ timestamp, status, success, error }`. Every window and lock here is a UI reflection of a server rule;
none of it is access control, and the code must not say it is.

## ADDED Requirements

### Requirement: Two clocks, not one

`Report` MUST carry `firstSeenAt` and `windowStartedAt` separately. `firstSeenAt` is permanent once set and
is the only thing that governs Delete. `windowStartedAt` marks the first time a reviewer opened the
**current version** of the Report and MUST reset on resubmission.

A resubmitted Report MUST never be deletable, whatever its clocks say.

#### Scenario: Resubmitted is never deletable

- **WHEN** a rejected Report is resubmitted and no reviewer has opened the new version
- **THEN** Delete is not offered, because `firstSeenAt` is already set and a revision exists

#### Scenario: The window resets

- **WHEN** a Report is resubmitted after a reviewer had already seen the old version
- **THEN** `windowStartedAt` is cleared, so the next reviewer opening restarts the window

### Requirement: Precedence in the state table

The action table MUST apply in this order: approved is always locked; rejected is always editable; then
unseen is editable; then seen inside the window is editable; then seen past the window is locked.

Approved MUST win over a window that is still open, and rejected MUST win over a window that has closed.

#### Scenario: Approved beats an open window

- **WHEN** a Report was approved a minute after it was seen, inside the edit window
- **THEN** no Edit control is rendered, and the page says it is locked until a reviewer reopens it

#### Scenario: Rejected beats a closed window

- **WHEN** a Report was rejected long after the edit window closed
- **THEN** Edit and resubmit is offered

### Requirement: Editing happens on a private copy

An edit MUST load the Report into a private edit copy, never into the live Report. Autosave MUST write to
that copy. Nothing about the Report MUST change until Save changes is pressed, which for a rejected Report
reads Resubmit. Leaving without saving MUST change nothing.

The edit handoff MUST bypass the form's already-submitted screen for this one case, and MUST be consumed
once: a second visit MUST open an empty form, not the edit copy again.

#### Scenario: Leaving without saving

- **WHEN** the author edits a Report, leaves the page, and reopens the Report
- **THEN** the Report is unchanged and the timeline has no Edited entry

#### Scenario: Save changes

- **WHEN** the author presses Save changes
- **THEN** the Report gains the new content, one revision recording the previous content, and an Edited
  event, and the edit copy is cleared

#### Scenario: The handoff does not reopen

- **WHEN** the author uses the edit handoff, then opens the form again later
- **THEN** the second visit is the ordinary form for the period, not the edit copy

### Requirement: The window is rechecked when it matters

The window MUST be rechecked when Edit is pressed and again when Save changes is pressed. A save refused
for a closed window MUST keep the person's text, MUST say why, and MUST offer to copy it.

#### Scenario: The window closes while typing

- **WHEN** Save changes is pressed after the window closed
- **THEN** the text stays on screen, the message names the lock time, and a Copy text control is offered

### Requirement: Delete frees the period

Delete MUST be offered only when `firstSeenAt` is `null` and no revision exists. After deleting, the Report
MUST be gone from the table on this device, and the form's already-submitted check MUST respect that, so the
author can write a new Report for the period instead of being sent to a Report that says it was not found.

#### Scenario: Deleted, then submitting again

- **WHEN** the author deletes an unseen Report and opens the form for the same period
- **THEN** the form is editable, because the period is free again

### Requirement: Read-only Workspaces write nothing

In a read-only Workspace the Report page MUST offer neither Edit nor Delete, and MUST give the reason.

#### Scenario: A read-only Workspace

- **WHEN** a Report is opened in a read-only Workspace
- **THEN** no Edit and no Delete are rendered, and the page says the Workspace is read-only

### Requirement: The Report text is plain text, escaped

The three sections MUST be rendered as escaped plain text with line breaks, never as HTML. Whatever markup
the form stored MUST be reduced to text before the page shows it.

#### Scenario: A bulleted list in the report

- **WHEN** the author wrote a list in the form
- **THEN** the page shows the list as lines of text, and no HTML element from the draft is injected

#### Scenario: A pasted angle bracket

- **WHEN** the content contains `<script>` as text
- **THEN** the page shows the characters, and nothing executes

### Requirement: Revisions and the edited marker

`Report` MUST carry `revisions`, each recording when it happened and the previous content. The Report page
MUST keep an Edited event in the timeline, the details panel MUST show how many revisions exist, and a list
row MUST carry an Edited marker.

#### Scenario: Two edits

- **WHEN** a Report has been edited twice
- **THEN** the timeline shows Edited twice, the details panel says two revisions, and the row carries the
  marker

### Requirement: Attachments are stated, not linked

The page MUST list each attachment with its size and the words "Not uploaded in this build", and MUST NOT
render a link or a download control.

#### Scenario: An attachment row

- **WHEN** the page shows an attachment
- **THEN** there is no anchor or button that would open the file

### Requirement: A Head's own Report goes to Admins

When the author is the Head of the Space the Report belongs to, the details panel MUST say it is reviewed by
Workspace Admins, because a Head never reviews their own Report.

#### Scenario: A Head opens their own Report

- **WHEN** the viewer is the Head of the Report's Space and is the author
- **THEN** the panel says Reviewed by Workspace Admins

### Requirement: The current draft is the first row

The list MUST show the author's current draft for an open period as a top row reading "Draft, continue",
linking back into the form. Only the author ever sees this row.

#### Scenario: A draft exists

- **WHEN** the author has a saved draft for the open period
- **THEN** the first row is the draft, and it says Draft, continue

### Requirement: Every time is the Workspace's time

Every timestamp shown, including when a Report locked, MUST be formatted in the Workspace's timezone, with
the timezone named once on the page.

#### Scenario: A reader in another timezone

- **WHEN** the page shows submitted, seen and locked times
- **THEN** all of them are in the Workspace's timezone, not the reader's

### Requirement: Starter hides old Reports

A Starter Workspace MUST hide Reports older than 30 days from this list, and the list MUST carry a quiet
note saying so. No sample data exercises this.

#### Scenario: A Starter list

- **WHEN** the list renders for a Starter Workspace
- **THEN** the note about the 30 day window is present, and older Reports are absent

### Requirement: Reviewers here only read

Opening a Report as a reviewer MUST NOT write `firstSeenAt` or `windowStartedAt` in this change. Review
sets seen when it exists.

#### Scenario: A reviewer opens a Report

- **WHEN** a Head or a Workspace Admin opens an author's Report
- **THEN** no seen clock is written and the page says decisions arrive with review

### Requirement: Reopen works like a rejection, and the control belongs to review

A reviewer reopening an approved Report MUST require a reason, MUST return the Report to `pending`, MUST
clear `windowStartedAt` so the next reviewer open starts a fresh window, and MUST leave the author able to
edit straight away, with the reason shown in a banner. The timeline MUST record Reopened.

The state table MUST read the last decision event rather than a stored flag, so a later approval locks the
Report again. This change MUST NOT build the reopen control, which is a reviewer action belonging to review,
and MUST NOT ship a sample Report in the reopened state.

#### Scenario: A reopened Report is editable

- **WHEN** a Report whose window closed days ago is reopened with a reason
- **THEN** the author sees the reason in a banner and can edit it

#### Scenario: Approved again

- **WHEN** a reopened Report is approved after the author's edit
- **THEN** the last decision is `approved` and the Report is locked again

#### Scenario: No control here

- **WHEN** any viewer opens the Report page
- **THEN** no control offers to reopen it, and a Reopened event still renders in the timeline

### Requirement: Sign out clears the report state

Sign out MUST clear the drafts for the Membership, the edit copy, the handoff key and the hidden set.
`src/lib/session.ts` MUST NOT be edited.

#### Scenario: Sign out

- **WHEN** the person signs out
- **THEN** the edit copy, the handoff and the hidden Reports are gone with the drafts

### Requirement: The confirmation and the already-submitted state reach the Report

Once the Report page exists, the Submitted confirmation on `/dashboard` MUST offer View report as a real
link to it, and the already-submitted state on the form MUST link to that Report.

#### Scenario: Success

- **WHEN** a valid form is submitted
- **THEN** the confirmation appears on `/dashboard` and View report opens the Report page for it

### Requirement: The table groups by period and filters by state

`/dashboard/reports` MUST list the Membership's Reports grouped by period, newest first, with filter chips
All, Pending, Approved and Rejected and their counts. Rows MUST show period, state pill, submitted time,
late or not, and the Edited marker. Rows link to the Report page.

#### Scenario: A filter with nothing in it

- **WHEN** Rejected is picked and nothing is rejected
- **THEN** an empty state names the filter and offers All

#### Scenario: A phone

- **WHEN** the list is read at 390px
- **THEN** each row becomes a card with the same facts, and nothing is cut off

### Requirement: The Report page is a reading column and a sticky panel

`/dashboard/reports/:id` MUST render the Report as a reading column on the left and a sticky panel on the
right carrying details (period, submitted, seen, locked at, revisions, who reviews it), then the timeline.
Below the large breakpoint the panel MUST stack under the Report.

#### Scenario: A long Report at 1440px

- **WHEN** the page is scrolled
- **THEN** the details and timeline stay visible beside the text

### Requirement: Loading, error and not-found states

The list and the page MUST each have a loading state, an error state with Retry, and one shared
not-found-or-forbidden message that does not reveal whether someone else's Report exists.

#### Scenario: Someone else's Report

- **WHEN** a person opens a Report they may not read
- **THEN** the page says the Report could not be found and offers the list

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| My reports | `GET /api/v1/reports?periodId=&status=` | none | `Report[]` | 401 |
| One report | `GET /api/v1/reports/:id` | none | `Report` | 401, 403, 404 |
| Save an edit | `PATCH /api/v1/reports/:id` | the same body as the draft | `Report` | 401, 403, 404, 409 (locked), 400 |
| Delete | `DELETE /api/v1/reports/:id` | none | `{ id }` | 401, 403, 404, 409 (seen or read-only) |

Guards, when the backend exists: `jwt.validateToken`, then the Membership from the token, then the ownership
check for edit and delete. A reviewer read is scoped by role and Space on the server. The closed window, the
seen Report refusing deletion and the read-only Workspace are server rules; the UI only mirrors them.

## Frontend

- `/dashboard/reports`: draft row, filter chips with counts, period groups, rows with the Edited marker,
  Starter note, empty/loading/error.
- `/dashboard/reports/:id`: header with the state pill and one primary action, rejection banner, plain-text
  sections, KPIs (blank reads "Not provided"), attachments with no link, colleagues, location, sticky panel
  (details, revisions, timeline), delete in a quiet overflow, the locked and read-only explanations.
- Entry points: "My reports" in the nav, the submit confirmation, the already-submitted state, and the
  Reports tab on a phone.
- Types: `Report`, `Revision`, `ReportEvent`, `ReportAction`, `ReportViewer` in `src/data/reports.ts`.
- The samples cover: not seen, seen inside the window, seen past it, rejected with a reason, approved, and
  one in a read-only Workspace. None is reopened.
