# report-submit

## Purpose

One screen: the report form for the current period. A person writes it once a period, the draft saves
itself, and submit hands it to review.

No backend exists. Every call below is documented as the contract the frontend is written against and is
answered today by a `simulate*` function in the same module, the way `src/lib/auth.ts` answers auth. The
envelope is `{ timestamp, status, success, data }` and `{ timestamp, status, success, error }`, matching
`sendSuccessResponse` and `sendErrorResponse`.

## ADDED Requirements

### Requirement: One report shape, declared once

The report shapes MUST live in `src/data/reports.ts` and MUST reuse `SubmissionStatus` and `ReportStatus`
from `src/lib/status.ts`. A second status vocabulary MUST NOT be declared.

`ReportDraft` carries: `id`, `periodId`, `authorMembershipId`, `accomplishments`, `challenges`, `plans`,
`kpis`, `attachments`, `taggedMembershipIds`, `location`, `submissionStatus`, `reviewStatus`, `updatedAt`.
`ReportingPeriod` carries `id`, `label`, `startsAt`, `endsAt`, `dueAt`.

`authorMembershipId` is client-side only: it names whose draft this is on this device and is never sent to
the server, which reads the Membership from the token.

#### Scenario: The name is not reinvented

- **WHEN** a later screen needs a report's state
- **THEN** it imports `SubmissionStatus`, it does not declare `draft | submitted | ...` again

### Requirement: Tags are colleagues, not free text

Tagging MUST select Members of the Workspace by name, and MUST store their Membership ids, never their
names or addresses. The card MUST NOT list colleagues by default: a search field and a Search button
return the matches. Search MUST match on name only. An address MUST be visible to a Workspace Admin only.
The list MUST be de-duplicated and capped at 5, and the cap is an assumption, recorded as one.

#### Scenario: Picking a colleague twice

- **WHEN** a person selects the same colleague twice
- **THEN** one id is stored, not two

#### Scenario: Nothing until asked

- **WHEN** the form opens
- **THEN** no colleague names are shown, and the card says nobody is listed until a search runs

#### Scenario: A Staff member searches

- **WHEN** a Staff member types a name and presses Search
- **THEN** matches are shown by name, no address appears, and an empty result says no colleague matches

### Requirement: Location is a Workspace setting

Location tagging MUST be a Workspace setting (`locationTagging` on the Workspace record). When it is off,
the form MUST NOT render the card at all and the draft MUST store `null`. When it is on, the person MUST be
offered a "Share my location" control that asks the browser for the current position and stores the
captured coordinates with their accuracy; there MUST be no free-text location field and no on/off switch.
A refused permission MUST NOT block submit, and the coordinates MUST stay on the device in this build.

#### Scenario: The setting is off

- **WHEN** a Workspace has `locationTagging: false`
- **THEN** no location field is rendered, and no empty location is stored

#### Scenario: The setting is on and the person skips it

- **WHEN** a Workspace has location tagging on and the person never presses Share my location
- **THEN** the draft stores `null` and submit is not blocked

#### Scenario: Permission refused

- **WHEN** the browser refuses the location permission
- **THEN** the card says so, offers no coordinates, and submit still works

### Requirement: One primary button

The screen MUST have exactly one primary action, Submit report, and it MUST be rendered in the shell's
top bar action slot. Below the medium breakpoint the same action MUST sit at the end of the page, in the
flow, so it appears when the person scrolls to the bottom. It MUST NOT float or stick, and it MUST NOT
hide the last card.

#### Scenario: A phone reaches the action at the end

- **WHEN** the form is scrolled to its end on a phone
- **THEN** Submit report is in the page above the tab bar, not pinned over the content

### Requirement: A draft saves itself, and says what happened

The form MUST save the draft while the person types, debounced, and MUST show one of three states: Saving,
Saved just now, Couldn't save on this device. "Saved just now" MUST NOT appear unless the write succeeded.
Pending saves MUST be flushed on blur and when the page becomes hidden. The indicator MUST be a polite
live region.

#### Scenario: The write fails

- **WHEN** the storage write throws
- **THEN** the indicator reads "Couldn't save on this device" and the typed text stays on screen

#### Scenario: Two tabs

- **WHEN** two tabs hold the same draft and the other tab saves a newer `updatedAt`
- **THEN** the older tab says the draft was updated elsewhere, and does not overwrite it silently

### Requirement: One draft per person per period

A person MUST NOT hold two drafts for the same period. Opening the form for a period they already have a
draft for MUST open that draft. The storage key MUST include both the Membership id and the period id.

#### Scenario: Second visit

- **WHEN** a person with an existing draft for the current period opens the form again
- **THEN** the existing draft loads, and starting over is not offered

#### Scenario: Two Memberships, one device

- **WHEN** the same person opens the form from two Workspaces
- **THEN** each has its own draft, and neither reads the other's

### Requirement: A blank KPI is not zero

A KPI row with no value entered MUST be stored as `null` and MUST render as "Not provided". It MUST NOT
be coerced to `0` and MUST NOT block submit. A value that is not a number MUST be refused with a message,
never coerced. Rows MAY be added and removed; an added row MUST have a name.

#### Scenario: Blank row survives a save

- **WHEN** a KPI row is left blank and the draft saves
- **THEN** the stored value is `null` and the row still reads "Not provided" after a reload

#### Scenario: Letters in a numeric field

- **WHEN** a person types `twelve` into a KPI value
- **THEN** it is refused with a message and nothing is stored for that row

#### Scenario: A new row without a name

- **WHEN** a person adds a row and leaves the name empty
- **THEN** the row is refused with a message naming the missing name

### Requirement: Sections are rich text, and length is measured on the text

The three sections MUST be rich text editors (Tiptap, already installed) offering bold, italic, bulleted
and numbered lists, with indent and outdent for list items. A draft MUST store the section's HTML, and the
length rules MUST be measured on the text a reviewer reads, never on the markup.

Accomplishments MUST be at least 50 characters before submit. Every section MUST be at most 5,000
characters, with a visible counter that turns to the warning tone as it approaches the limit.

#### Scenario: Markup does not count

- **WHEN** a section holds 40 real characters wrapped in paragraphs and bold tags
- **THEN** submit is refused, because the text is under the minimum

#### Scenario: A list

- **WHEN** a person turns a line into a bulleted list and saves
- **THEN** the draft stores a list element and the counter still reports characters of text

#### Scenario: Too short

- **WHEN** accomplishments holds 49 characters and Submit report is pressed
- **THEN** the accomplishments card shows the minimum, submit is refused, and focus moves to that field

#### Scenario: Over the maximum

- **WHEN** a section reaches 5,000 characters
- **THEN** further typing is refused and the counter reads at the limit in the warning tone

### Requirement: The deadline decides late, not the person

Deadlines MUST be shown in the Workspace's timezone. A report submitted after `dueAt` MUST carry `late`. A
draft MUST survive the deadline and MUST remain a draft until submitted, at which point it becomes `late`.
The "now" used by the screen MUST come from one sample constant, never from a query parameter, cookie or
stored value.

#### Scenario: Draft across the deadline

- **WHEN** the deadline passes while a draft is open
- **THEN** the draft is still editable and the screen says it will be submitted late

### Requirement: Attachments are metadata, and say so

Attachments MUST be limited to 10 files of at most 10 MB each, and MUST accept images, PDFs and Office
documents only; a refusal MUST name the allowed types and the limit. The UI MUST state that files are not
uploaded in this build, and after a reload each attachment MUST read "Not uploaded". File contents MUST
NOT be stored.

#### Scenario: Too large

- **WHEN** a person picks an 11 MB file
- **THEN** it is refused with a message naming the limit and the rest of the form is unaffected

#### Scenario: After a reload

- **WHEN** the form is reloaded with an attachment already listed
- **THEN** the row reads "Not uploaded"

### Requirement: Blocked states name their reason

The form MUST refuse to submit, with a sentence and no editable fields, when: the Workspace Admin opens
it, there is no open period, the Workspace is still being set up so the person has no Space, or the
Workspace is read-only. A Workspace Admin MUST be told that Admins monitor Reports and do not submit them,
and the code MUST say the check is tidiness rather than a guard.

#### Scenario: Admin opens the form

- **WHEN** a Workspace Admin opens `/dashboard/reports/new`
- **THEN** the screen says Admins monitor Reports and do not submit them and renders no form

#### Scenario: Read-only Workspace

- **WHEN** the Workspace is read-only
- **THEN** submit is blocked with the reason and the draft is still readable

#### Scenario: Already submitted

- **WHEN** the person's report for the period is already submitted
- **THEN** the screen says so, offers no editable fields, and links nowhere for now

### Requirement: Submit moves the draft, once

Submit MUST be disabled while the request is in flight. It MUST clear the stored draft only after a
successful submit, MUST set the review status to `pending`, and MUST land on `/dashboard` with a Submitted
confirmation offering a disabled "View report" placeholder until the Report page exists. A failed submit
MUST keep the draft.

#### Scenario: Double press

- **WHEN** Submit report is pressed twice quickly
- **THEN** the second press does nothing and one submit is attempted

#### Scenario: Success

- **WHEN** a valid form is submitted
- **THEN** the draft is cleared, the confirmation appears on `/dashboard`, and the disabled View report
  placeholder is present

### Requirement: Errors are beside their field, and focus goes there

Every validation message MUST render next to the field it is about. On a refused submit, focus MUST move
to the first field with a problem.

#### Scenario: Two problems

- **WHEN** accomplishments is too short and a KPI value is not a number
- **THEN** both messages are beside their fields and focus lands on accomplishments

### Requirement: The screen is usable on a phone and from the keyboard

Every control MUST be reachable and operable from the keyboard, every input MUST have a visible label, tap
targets MUST reach 44px, and the bottom tab bar MUST NOT cover the primary action.

#### Scenario: Keyboard only

- **WHEN** a person fills the form without a pointer
- **THEN** every field, KPI row, colleague result and the Submit button is reachable in reading order

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Load a period and its template | `GET /api/v1/reporting-periods/current` | none | `{ period: ReportingPeriod, kpis: KpiTemplateField[] }` | 401, 404 |
| Load my draft | `GET /api/v1/reports/draft?periodId=` | none | `ReportDraft \| null` | 401 |
| Save a draft | `PATCH /api/v1/reports/draft` | the body below | `ReportDraft` | 401, 400, 409 |
| Submit | `POST /api/v1/reports/:id/submit` | none | `Report` | 401, 400, 404, 409 |
| Attach a file | `POST /api/v1/reports/:id/attachments` | multipart, metadata only in this build | `Attachment` | 401, 413, 415 |

Draft body sent to `PATCH`. There is no `authorMembershipId`: the server takes the Membership from the
token.

```json
{
  "periodId": "per_2026_10_26",
  "accomplishments": "",
  "challenges": "",
  "plans": "",
  "kpis": [{ "name": "Reports reviewed", "unit": "count", "value": null }],
  "attachments": [{ "name": "notes.pdf", "size": 220200, "type": "application/pdf" }],
  "taggedMembershipIds": ["mem_staff"],
  "location": { "latitude": 6.5244, "longitude": 3.3792, "accuracy": 35 }
}
```

Guards, when the backend exists: `jwt.validateToken`, then the Membership from the token (never from the
body), then the ownership check that the report belongs to that Membership. A draft is readable only by
its author. Nothing enforces this today and the code must not claim otherwise.

## Frontend

Screens and states:

- `/dashboard/reports/new`: loading, load error with Retry, blocked (Admin, no open period, no Space,
  read-only), already submitted, draft loaded, saving, saved, save failed, submit refused with field
  messages and focus, submit failed with a banner, submitting.
- Reached from the shell's Submit report action and the Home empty state. An Admin has no action and the
  route tells them why.
- The form is cards: Period (label, deadline in the Workspace timezone, status pill), Accomplishments,
  Challenges, Next plans, KPIs, Attachments, Colleagues, Location when enabled. One primary button in the
  header slot, sticky above the tab bar on a phone.
- New types in `src/data/reports.ts`: `ReportingPeriod`, `KpiEntry`, `KpiTemplateField`, `Attachment`,
  `ReportDraft`. `SubmissionStatus` and `ReportStatus` are imported.
- Sign out clears this Membership's drafts before clearing the session. `src/lib/session.ts` is not edited.
