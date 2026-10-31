# event-leads

## Purpose

Two surfaces for one job: capturing a prospect at an event. A PUBLIC kiosk form at
`/capture/[token]`, outside the dashboard and with no session, lets a stranger at a booth leave their
details on a shared device. An internal list at `/dashboard/leads` lets a Workspace Admin or Staff member
review, filter, search and export the leads that were captured.

No backend exists. Every call below is documented as the contract the frontend is written against and is
answered today by a `simulate*` function in `src/lib/leads.ts`, the way `src/lib/auth.ts` answers auth. The
envelope is `{ timestamp, status, success, data }` and `{ timestamp, status, success, error }`, matching
`sendSuccessResponse` and `sendErrorResponse`.

The public capture call is an unauthenticated write. Nothing enforces its scope today. The guard design
for when the backend lands is in the API contract below and in `design.md`, and it is the item that STOPS
for the user's approval before any code.

## ADDED Requirements

### Requirement: One lead shape, declared once

The lead shapes MUST live in `src/data/leads.ts`. A lead MUST be scoped to a Workspace and a Space the same
way a Report is, reading `Workspace` and `Membership` from `src/data/viewer.ts` rather than declaring a
second idea of a Workspace or a Space.

`CapturedLead` carries: `id`, `workspaceId`, `space`, `eventName`, `fullName`, `email`, `phone`, `company`,
`jobTitle`, `notes`, `consent`, `capturedAt`. `LeadDraft` is the wire shape the public form posts and
carries the captured fields and `consent`, never a `workspaceId` or a `space` chosen by the caller: the
server reads those from the public capture token.

`email` and `phone` are each `string | null`: a lead needs at least one, not both. `consent` is a
`LeadConsent` record carrying `given: boolean` and `at: string`.

#### Scenario: The scope is not chosen by the caller

- **WHEN** the public form posts a lead
- **THEN** the body carries no `workspaceId` and no `space`, and the server resolves both from the token

### Requirement: The public form is outside the dashboard and needs no session

The capture screen MUST live at `/capture/[token]`, OUTSIDE `/dashboard`, and MUST render without a
session. It MUST NOT read `ACTIVE_MEMBERSHIP_ID` or any Membership, MUST NOT show the dashboard shell, the
sidebar, the tab bar or the Workspace switcher, and MUST NOT render any data about any other lead.

The `token` segment MUST resolve to an `EventContext` (which Workspace, which Space, which event). While
there is no backend, the token resolves against one sample constant in `src/data/leads.ts`.

#### Scenario: No session is present

- **WHEN** the public capture screen is opened with no session cookie
- **THEN** it renders the form, with no sidebar, no tab bar and no sign-in prompt

#### Scenario: An unknown token

- **WHEN** the token does not resolve to a known event
- **THEN** the screen says the link is not valid and renders no form

#### Scenario: No other lead leaks

- **WHEN** the public capture screen is open
- **THEN** no captured lead, count or name from the Workspace is rendered anywhere on it

### Requirement: Consent is required, and name plus one contact

The public form MUST refuse to submit unless: `fullName` is present, at least one of `email` or `phone` is
present, and the consent checkbox is ticked. Consent is an explicit opt-in for follow-up contact and MUST
default to unticked. The consent label MUST say what the person is agreeing to.

When consent is ticked and submit succeeds, the stored `consent.given` MUST be `true` and `consent.at` MUST
be the capture time.

#### Scenario: Consent unticked

- **WHEN** every field is filled but the consent box is not ticked
- **THEN** submit is refused, the message sits beside the checkbox, and focus moves to the checkbox

#### Scenario: Name missing

- **WHEN** the full name is empty and Submit is pressed
- **THEN** submit is refused and the message sits beside the name field

#### Scenario: No way to reach them

- **WHEN** both email and phone are empty
- **THEN** submit is refused with one message saying at least one of email or phone is needed

### Requirement: Validation is inline, client-side, and focuses the first error

Every validation message MUST render next to the field it is about. On a refused submit, focus MUST move to
the first field with a problem, in reading order. Email MUST be checked for a plausible format. Phone MUST
be stored exactly as entered, with no reformatting. All validation is client-side in this build.

#### Scenario: A malformed email

- **WHEN** the email reads `jo@` and Submit is pressed
- **THEN** submit is refused and the message sits beside the email field

#### Scenario: Phone kept as typed

- **WHEN** the phone reads `+234 (0) 801 234 5678`
- **THEN** the stored phone is that exact string, with no reformatting

#### Scenario: Two problems

- **WHEN** the name is empty and the email is malformed
- **THEN** both messages are beside their fields and focus lands on the name

### Requirement: Submit confirms, then resets for the next person

After a successful public submit, the screen MUST show a thank-you confirmation and MUST then reset to an
empty form so the next person at the booth can start clean. The reset MUST clear every field and untick
consent. Nothing MUST carry over from one person's entry to the next.

#### Scenario: Kiosk reset

- **WHEN** a lead is submitted successfully
- **THEN** a thank-you message appears, and the form returns to empty with consent unticked

#### Scenario: No carryover

- **WHEN** the form resets after a submit
- **THEN** no field holds the previous person's value

### Requirement: Captured text is untrusted and rendered safely

Every captured field (name, email, phone, company, job title, notes) MUST be treated as untrusted. It MUST
be rendered only through React's safe text paths, never through `dangerouslySetInnerHTML`, on both the
public screen and the internal list.

#### Scenario: Markup in a field

- **WHEN** a lead's notes contain `<script>` text and the internal list renders them
- **THEN** the text is shown as characters, not executed, and no `dangerouslySetInnerHTML` is used

### Requirement: The internal list is searchable and filterable

The internal list at `/dashboard/leads` MUST show captured leads for Admins and Staff. It MUST offer a
search that matches on name, email, company and job title, a filter by event name, and a filter by Space.
Filters MUST combine (an event and a Space narrow together). An empty result MUST say no leads match. An
empty Workspace MUST say no leads have been captured yet.

#### Scenario: Search by company

- **WHEN** a person searches a company name
- **THEN** only leads whose company, name, email or job title contains the term are shown

#### Scenario: Filter combines

- **WHEN** an event filter and a Space filter are both set
- **THEN** only leads matching both are shown

#### Scenario: Nothing matches

- **WHEN** the search and filters match no lead
- **THEN** the list says no leads match, and the export button is disabled

### Requirement: CSV export is hand-rolled and reflects the filters

The internal list MUST export the currently filtered leads to a CSV file, built by hand in `src/lib/leads.ts`
with no new dependency. The CSV MUST have a header row and one row per lead. A value containing a comma, a
quote or a newline MUST be quoted and its quotes escaped, so a notes field cannot break the columns.
Consent MUST appear as a column. The export MUST reflect the active search and filters, not the whole set.

#### Scenario: A comma in notes

- **WHEN** a lead's notes contain a comma and the export runs
- **THEN** that field is quoted so the row keeps its column count

#### Scenario: Export follows the filter

- **WHEN** a Space filter is active and the export runs
- **THEN** only leads in that Space are in the CSV

### Requirement: The public write path is scoped by a token, documented not enforced

The public capture call MUST be documented as scoped to one Workspace and one Space by a per-event public
capture token in the URL, and MUST be documented as CREATE-only: it can write a lead and can never read one.
No code enforces this in the current build, and the UI MUST NOT claim it does. The guard lands with the
backend and is the approval item at the spec gate.

#### Scenario: The simulated path claims nothing

- **WHEN** the public form posts in this build
- **THEN** the `simulate*` function records the lead against the sample event context, and no comment or
  copy describes the token as a real security boundary

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Resolve a public event link | `GET /api/v1/public/capture/:token` | none | `EventContext` (workspace name, space, event name only) | 404, 410 (expired), 429 |
| Capture a lead (PUBLIC, unauthenticated) | `POST /api/v1/public/capture/:token` | the `LeadDraft` body below | `{ id: string }` only | 400, 404, 410, 429 |
| List captured leads | `GET /api/v1/leads` | none | `CapturedLead[]` | 401, 403 |

The public calls carry no token in the `Authorization` header: the per-event capture token is the path
segment. `POST` returns only the new id, never any other lead, so the public caller cannot read the
Workspace. Rate limiting (429) guards the booth device against a flood.

`LeadDraft` posted to the public `POST`. There is no `workspaceId` and no `space`: the server resolves both
from the capture token in the path.

```json
{
  "fullName": "Chidi Okeke",
  "email": "chidi@example.com",
  "phone": "+234 801 234 5678",
  "company": "Lagos Analytics",
  "jobTitle": "Head of Data",
  "notes": "Wants a demo in November.",
  "consent": { "given": true, "at": "2026-10-31T10:15:00.000Z" }
}
```

Guards, when the backend exists:

- Public `GET` and `POST /api/v1/public/capture/:token`: NO `jwt.validateToken`. The guard is the per-event
  public capture token, validated server-side, resolving to exactly one Workspace and one Space. The `POST`
  is CREATE-only and returns only the new id. Both are rate limited per token and per IP. The token is
  revocable and may expire (410). This is the unauthenticated write path that STOPS for approval.
- `GET /api/v1/leads`: `jwt.validateToken`, then a role guard admitting Workspace Admin and Staff, then the
  Workspace scope from the token so one Workspace never reads another's leads.

Nothing enforces any of this today and the code must not claim otherwise.

## Frontend

Screens and states:

- `/capture/[token]` (PUBLIC, outside the dashboard, no session): loading, invalid or expired link, the
  empty capture form, field errors beside fields with focus to the first problem, submitting, the thank-you
  confirmation, and the reset-to-empty state for the next person. No shell, no sidebar, no tab bar, no
  Workspace switcher, and no other lead's data.
- `/dashboard/leads` (internal, Admin and Staff): loading, load error with Retry, empty Workspace ("no
  leads captured yet"), the table, the search and the event and Space filters, the empty-filter result
  ("no leads match"), and the CSV export button (disabled when the filtered set is empty).
- New types in `src/data/leads.ts`: `CapturedLead`, `LeadDraft`, `EventContext`, `LeadConsent`. `Workspace`
  and `Membership` are imported from `src/data/viewer.ts`.
- The public screen never touches the session. The internal screen reads the active Membership the same way
  the rest of the dashboard does, and that is tidiness, not access control: the real guard lands with the
  backend.

## Non-goals (not v1)

- Converting a captured lead into a Member or into a Report. v1 captures and lists only.
- Editing or deleting a captured lead from the internal list.
- Any money, pricing or billing surface.
- A real public capture token or any live security boundary. The token is a sample constant now, and the
  guard is designed for the backend, not built.
