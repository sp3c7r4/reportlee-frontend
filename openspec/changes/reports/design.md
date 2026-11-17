## Context
Slice 2 of the backend. Slice 1 (`workspaces-people`) gave the backend Workspaces, Spaces, Memberships and `MembershipService.resolve`, the one choke point that answers "who is this caller in this Workspace" and returns `Caller { membershipId, userId, workspaceId, role, spaceId, spaceName }`. This change builds the report lifecycle on it: Schedule, Reporting periods, drafts, submit, edit, delete, and one `ReportAccess` choke point that the review slice reuses.

Stack (locked on approval): backend Hono, TypeScript strict, Drizzle ORM, Postgres, Zod, Vitest on a real Postgres; new dependency `sanitize-html`. Frontend Next.js 16, React 19, TypeScript strict, `node --test`. Branch `feat/reports` in both repos. All routes are under `/api/v1` and Workspace-scoped data is reached only through a Membership.

Owner decisions R1 to R4 are final and are implemented as written in the brief: R1 default schedule and five cadences, R2 late accepted for 7 days then closed (missing is never stored), R3 edit rules, R4 KPI snapshot. This document does not reopen them.

Where the code and `AGENTS.md` disagree: `AGENTS.md` says the backend does not exist and the migrations are numbered by the old Drizzle journal. The backend exists and `src/db/migrations/` holds `0000_clear_rage.sql` and `0001_workspaces_people.sql`. This design follows the code.

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | Add `sanitize-html` (dependency) and `@types/sanitize-html` (dev), backend only. | No sanitizer exists in `package.json`. Untrusted text must be cleaned on the server (AGENTS.md). `sanitize-html` is a parser-only allow-list sanitizer on htmlparser2, actively maintained, widely used, and needs no DOM emulation. DOMPurify would need `jsdom` (a second, much larger dependency) to run in Node. Pre-approved class of dependency in the brief. |
| D2 | No date library. Use `Intl.DateTimeFormat` (already used in `workspace.schema.ts`) plus civil date arithmetic in one pure file `period-calendar.ts`. | Avoids a second new dependency. `luxon` is only a transitive dependency and not declared. All DST logic sits in one unit-tested file. Node >= 22 has full ICU. |
| D3 | Instants are `timestamptz` in the new tables. `created_at` and `updated_at` reuse the existing `timestamps` helper. `deleted_at` reuses the `softDelete` helper. | Periods and deadlines are instants. Existing helpers keep the models consistent. |
| D4 | The Schedule is versioned: table `workspace_schedules`, many rows per Workspace, unique `(workspace_id, effective_from)`. "Applies from the next period" is a row whose `effective_from` is in the future. The baseline row (`effective_from = 1970-01-01`) is created lazily under the period lock with the R1 default and the Workspace time zone. | A change must never rewrite old periods. A version table makes that a data fact, not a code convention. |
| D5 | A period is `[startsAt, nextBoundary)`. `startsAt` is local 00:00 on a boundary date. `endsAt = nextBoundary - 1 second`. `dueAt` is the next boundary date at the Schedule `time` in the Schedule time zone. `weekday` means the day a period starts. | Matches `SAMPLE_PERIOD` (Monday 19 October 00:00 to Sunday 25 October 23:59:59, due Monday 26 October 17:00) and R1. |
| D6 | Boundaries: daily = every local day; weekly = each `weekday`; fortnightly = every 14 days from `anchor_date` (the `weekday` on or before the version's local start date); monthly = `day_of_month` each month, clamped to the month length, or the last day when `last_day`; quarterly = the same day in January, April, July, October. The first period of a version starts at `max(boundary, effective_from)`. | The frontend `Schedule` type has these fields and no more. Fortnightly anchor and quarterly months are not in the frontend, so they are stated as assumptions A2 and A3. |
| D7 | Current period = the period containing `now`, or its predecessor when the predecessor's `dueAt` is still in the future. At Monday 26 October 15:30 it is the week of 19 October (matches `SAMPLE_NOW`). After 17:00 it is the week of 26 October. Walking back one step is enough because a period is at least one day long and the time of day is under 24 hours. | R2: the deadline belongs to the week just worked. |
| D8 | Add `GET /reporting-periods/open?workspaceId=`: every period with `startsAt <= now <= dueAt + 7 days`, oldest `dueAt` first. The Submit screen picks the oldest open period the caller has not submitted, else the current one. | Without it the UI cannot reach a late period after `current` has moved on. Additive endpoint implementing R2. |
| D9 | Lateness: `submittedAt > dueAt` is late, equal is on time. The grace is the constant `7 * 24 * 60 * 60 * 1000` ms (same value as `SUBMISSION_WINDOW_MS`), not calendar days. Open while `now <= dueAt + grace`. After that, draft save and submit return 409 `PERIOD_CLOSED`. Before `startsAt`, 409 `PERIOD_NOT_OPEN`. Editing a submitted report after the period closed is allowed. `missing` is never stored. | R2. Fixed milliseconds keep the rule independent of DST. |
| D10 | Edit rule in one function `ReportAccess.editState(report, now)`. Approved: locked `REPORT_APPROVED`. Rejected: editable. Otherwise if `first_seen_at` and `window_started_at` are both set and `now > window_started_at + edit_window_minutes`: locked `EDIT_WINDOW_CLOSED`. Else editable. Every edit sets `review_status = pending`, clears `window_started_at`, inserts a revision of the previous content and an `edited` event. Lateness is unchanged. | R3. Assumption A1: the brief says "cleared on resubmission" and "each edit returns the report to pending", so an edit is a resubmission. |
| D11 | Delete is author only, only while `first_seen_at IS NULL`, checked inside a transaction under `SELECT ... FOR UPDATE`. It is a soft delete (`deleted_at`). The partial unique index ignores deleted rows, so a new draft for that period is possible. A draft is deletable by its author. | R3 and the CONTEXT.md definition of Seen. |
| D12 | Add `workspaces.edit_window_minutes integer NOT NULL DEFAULT 30` with CHECK 1 to 10080. The report copies it at draft creation and refreshes it at submit. No endpoint changes it in this slice. | Slice 1 has no such column. A default keeps the migration additive. A Settings control is later work. |
| D13 | R4 snapshot: on first draft insert, the server copies the Space's `kpi_template` as `[{name, unit, value: null}]`. A save matches client rows by `name`, updates only `value`, and ignores unknown names. The frontend drops `SAMPLE_KPI_TEMPLATE` and takes the template from `listSpaces`. | R4. The client cannot add or rename a KPI row. |
| D14 | Attachments are a jsonb array of `{name, size, type}`. Responses add `uploaded: false`. No attachments table, no upload route. | The brief: metadata only, note it. |
| D15 | `tagged_membership_ids integer[]`. The service checks every id is an active Membership of the same Workspace, not the author, at most 5. Failure is a 400 field error on `taggedMembershipIds`. A tag grants no access. | CONTEXT.md "Tag". |
| D16 | Location is stored after range validation (latitude -90..90, longitude -180..180, accuracy >= 0). It is not gated on `workspaces.location_tagging` in this slice. | The brief: store what the frontend sends. Gating is a Backlog line. |
| D17 | Only `staff` and `head` author. `admin` gets 403 `ADMIN_CANNOT_AUTHOR` on draft save, submit and edit. A read-only Workspace gets 403 `WORKSPACE_READ_ONLY` on draft save, submit and edit. Delete stays allowed. | CONTEXT.md: Admins never author. Read-only Workspace blocks submitting. |
| D18 | New `CodedConflictError` (409 with `code`), and one more `instanceof` branch in `src/middlewares/error.ts`. 403 codes: `NOT_AUTHOR`, `REPORT_APPROVED`, `EDIT_WINDOW_CLOSED`, `REPORT_SEEN`, `ADMIN_CANNOT_AUTHOR`, `WORKSPACE_READ_ONLY`. 409 codes: `PERIOD_CLOSED`, `PERIOD_NOT_OPEN`, `ALREADY_SUBMITTED`, `NOT_SUBMITTED`. The frontend branches on `code`, never on text. | Slice 1 pattern (`CodedForbiddenError`). The existing branch adds `code` for two classes only. |
| D19 | Resource-addressed routes (`/reports/:id`, `/reports/draft`, `/reporting-periods/*`) carry no `:wsId`. The Workspace comes from the resource row (report or period) or from a required `workspaceId` query, then `MembershipService.resolve(userId, workspaceId)`. A missing row, another Workspace, a non-member and a deactivated member all return the same 404 body. | One identical 404 leaks nothing. Matches slice 1's "non-members learn nothing". |
| D20 | Lists return a plain array in `data` (like `GET /spaces`) with `limit` (default 50, max 100) and `offset`. | Existing list convention. |
| D21 | Services read `new Date()` once per request and pass it down. Tests use `vi.useFakeTimers({ toFake: ["Date"] })` with `vi.setSystemTime` so pg timers still work. | Time rules need exact boundary tests. |
| D22 | Extend `AuditAction` with `report.submitted`, `report.edited`, `report.deleted`, `schedule.change`. Written in the same transaction. Summaries hold ids and field names only. Draft autosave is not audited. | Never log personal data. Autosave would flood the log. |
| D23 | My record stays on mock data. Home, review queue, search and tasks keep their mock reads. | They need the roster, analytics and review (later slices). |
| D24 | `GET /reports/:id` on a draft returns 404 for everyone, the author included. A draft is served only by `GET /reports/draft`. `DELETE /reports/:id` still works on the author's own draft. | `Report.submittedAt` is a required string in the frontend type, so a draft cannot be a `Report`. One route per shape. |

## Backend

### Conventions for every route
- Mounted in `src/routes/router.ts`: `router.route("/workspaces/:wsId/schedule", scheduleRouter)`, `router.route("/reporting-periods", periodRouter)`, `router.route("/reports", reportRouter)`.
- Guard order: `jwtService.validateToken` (401 when missing or bad), `requireCaller`, the Zod params/query/body validators, then the membership or role guard, then the ownership check inside the service (`ReportAccess`). Slice 1's `requireMembership` and `requireWorkspaceRole` are used for `:wsId` routes. For resource-addressed routes the service calls `MembershipService.resolve` after loading the row.
- Success envelope `{ timestamp, status, success: true, data }`. Error envelope `{ timestamp, status, success: false, error }` where `error` is `{ "message": "..." }`, plus `"code"` for coded 403 and 409. A Zod failure is 400 with `error` as a flat map of field name to message, for example `{ "accomplishments": "Write at least 50 characters." }`.
- Report routes pass `{ log: false }` to `validate.body` and `sendSuccessResponse` so no report text reaches logs.
- Messages live in `schedule.message.ts` and `report.message.ts`. They contain no em dash and no SQL or stack trace.
- Route order in `report.routes.ts`: `GET /`, `GET /draft`, `PATCH /draft`, then `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/submit`.
- Ids are numbers in the database and strings in JSON. Params `:id` and `periodId` match `^[1-9]\d{0,9}$`, else 400.

### Shared JSON shapes (mirrored in the frontend)
```
ReportingPeriod = { id: string, label: string, startsAt: ISO, endsAt: ISO, dueAt: ISO }

ReportDraft = {
  id: string, periodId: string, authorMembershipId: string,
  accomplishments: string, challenges: string, plans: string,
  kpis: [{ name: string, unit: string, value: number | null }],
  attachments: [{ name: string, size: number, type: string, uploaded: false }],
  taggedMembershipIds: string[],
  location: { latitude: number, longitude: number, accuracy: number } | null,
  submissionStatus: "draft" | "submitted" | "late",
  reviewStatus: "pending" | "approved" | "rejected",
  updatedAt: ISO
}

Report = ReportDraft & {
  submittedAt: ISO,
  firstSeenAt: ISO | null,
  windowStartedAt: ISO | null,
  editWindowMinutes: number,
  revisions: [{ at: ISO, previous: { accomplishments, challenges, plans, kpis, attachments, taggedMembershipIds, location } }],
  events: [{ kind: "submitted" | "edited" | "seen" | "approved" | "rejected" | "reopened", at: ISO, actorMembershipId: string }],
  comments: []
}

ApiSchedule = {
  cadence: "daily" | "weekly" | "fortnightly" | "monthly" | "quarterly",
  weekday: string,            // English name, "" when the cadence does not use it
  time: "HH:MM",
  timeZone: string,           // IANA name
  dayOfMonth: number | null,
  lastDay: boolean,
  effectiveFrom: ISO | null,  // null for the baseline version
  pending: (Schedule fields above, with effectiveFrom: ISO) | null
}
```
`submissionStatus` is never "missing" on the wire. `comments` is always `[]` until the review slice. `revisions` and `events` are ordered oldest first.

### Endpoint table
Common errors for every row: 401 when the token is missing or invalid (`{ "message": "Unauthorized" }` as the existing guard sends it). Every 404 body is `{ "message": "Not found." }` with no code.

| # | Method and path | Guards in order | Request | Success | Other statuses |
|---|---|---|---|---|---|
| E1 | `GET /workspaces/:wsId/schedule` | jwt, `requireCaller`, params, `requireMembership` | none | 200 `ApiSchedule` | 404 non-member |
| E2 | `PUT /workspaces/:wsId/schedule` | jwt, `requireCaller`, params, `requireMembership`, `requireWorkspaceRole("admin")`, body | `scheduleBody` | 200 `ApiSchedule` (the new pending version is in `pending`; `effectiveFrom` is the active one) plus `appliesFrom: ISO` | 400 field map, 403 `{ message }` (not admin), 404 |
| E3 | `GET /reporting-periods/current?workspaceId=` | jwt, `requireCaller`, query, `MembershipService.resolve` | `workspaceId` | 200 `ReportingPeriod` | 400, 404 |
| E4 | `GET /reporting-periods/open?workspaceId=` | same as E3 | `workspaceId` | 200 `ReportingPeriod[]`, oldest `dueAt` first, always containing at least the current period | 400, 404 |
| E5 | `GET /reports/draft?periodId=` | jwt, `requireCaller`, query, `PeriodScope` (load period, then resolve), author role check | `periodId` | 200 `ReportDraft` or `null` | 400, 403 `ADMIN_CANNOT_AUTHOR`, 404 |
| E6 | `PATCH /reports/draft` | jwt, `requireCaller`, body, `PeriodScope`, author role check, read-only check | `draftBody` | 200 `ReportDraft` | 400 field map, 403 `ADMIN_CANNOT_AUTHOR` or `WORKSPACE_READ_ONLY`, 404, 409 `PERIOD_CLOSED`, `PERIOD_NOT_OPEN`, `ALREADY_SUBMITTED` |
| E7 | `POST /reports/:id/submit` | jwt, `requireCaller`, params, `ReportAccess.load` then author-only | no body | 200 `Report` | 400 field map (accomplishments), 403 `NOT_AUTHOR`, `ADMIN_CANNOT_AUTHOR` or `WORKSPACE_READ_ONLY`, 404, 409 `ALREADY_SUBMITTED`, `PERIOD_CLOSED` |
| E8 | `GET /reports?workspaceId=&periodId=&status=&limit=&offset=` | jwt, `requireCaller`, query, `MembershipService.resolve` | see query table | 200 `Report[]`, or `ReportDraft[]` when `status=draft` | 400, 404 |
| E9 | `GET /reports/:id` | jwt, `requireCaller`, params, `ReportAccess.assertRead` | none | 200 `Report` | 404 |
| E10 | `PATCH /reports/:id` | jwt, `requireCaller`, params, body, `ReportAccess.assertEdit` | `editBody` | 200 `Report` | 400 field map, 403 `NOT_AUTHOR`, `ADMIN_CANNOT_AUTHOR`, `WORKSPACE_READ_ONLY`, `REPORT_APPROVED`, `EDIT_WINDOW_CLOSED`, 404, 409 `NOT_SUBMITTED` |
| E11 | `DELETE /reports/:id` | jwt, `requireCaller`, params, `ReportAccess.assertDelete` | none | 204 with no body | 403 `NOT_AUTHOR`, `REPORT_SEEN`, 404 |

Why E5 and E6 have no `:id`: a person starts a draft by period, not by report id. The Workspace comes from the period row.

Exact examples:
- E1/E2 success `data`: `{ "cadence": "weekly", "weekday": "Monday", "time": "17:00", "timeZone": "Africa/Lagos", "dayOfMonth": null, "lastDay": false, "effectiveFrom": null, "pending": null }`. E2 adds `"appliesFrom": "2026-11-02T23:00:00.000Z"`.
- E3 `data`: `{ "id": "41", "label": "Week of 19 October", "startsAt": "2026-10-18T23:00:00.000Z", "endsAt": "2026-10-25T22:59:59.000Z", "dueAt": "2026-10-26T16:00:00.000Z" }` (Africa/Lagos, UTC+1).
- E5 empty: `data: null` with 200.
- E7 success `data`: the full `Report` with `submissionStatus` `"submitted"` or `"late"`, `reviewStatus: "pending"`, `submittedAt` set, one `submitted` event, `revisions: []`, `comments: []`.
- Coded error body: `{ "timestamp": "...", "status": 403, "success": false, "error": { "message": "This report is approved and cannot be edited.", "code": "REPORT_APPROVED" } }`.
- Field error body: `{ "timestamp": "...", "status": 400, "success": false, "error": { "accomplishments": "Write at least 50 characters." } }`.
- 404: `{ "timestamp": "...", "status": 404, "success": false, "error": { "message": "Not found." } }`.

### Input validation
All bodies are Zod `.strict()`: an unknown key is a 400 with the key name as the field. Trim does not apply to HTML sections.

`scheduleBody` (E2)
| Field | Required | Type and limits | On failure |
|---|---|---|---|
| `cadence` | yes | enum of five | 400 `cadence` |
| `weekday` | when cadence is weekly or fortnightly | one of `Monday` to `Sunday` (English, as the frontend sends). Ignored and stored as null for other cadences | 400 `weekday` |
| `time` | yes | `^([01]\d|2[0-3]):[0-5]\d$` | 400 `time` |
| `timeZone` | yes | IANA name accepted by `Intl.DateTimeFormat`, max 64 chars. Reuses the exported refinement from `workspace.schema.ts` | 400 `timeZone` |
| `dayOfMonth` | when cadence is monthly or quarterly and `lastDay` is false | integer 1 to 31. Ignored for other cadences | 400 `dayOfMonth` |
| `lastDay` | no, default false | boolean. Ignored for other cadences | 400 `lastDay` |

`draftBody` (E6). Only `periodId` is required. A provided content field replaces that field. Omitted fields are unchanged (or empty on first insert).
| Field | Required | Type and limits | On failure |
|---|---|---|---|
| `periodId` | yes | string matching `^[1-9]\d{0,9}$` | 400 `periodId` |
| `accomplishments`, `challenges`, `plans` | no | string, at most 20000 characters of raw HTML. After sanitising, visible text at most 5000 characters (`SECTION_MAX`) | 400 with that field name |
| `kpis` | no | array of at most 30 `{ name: string 1..80, value: finite number with absolute value at most 1e12, or null }`. Extra keys such as `unit` are accepted and ignored | 400 `kpis` |
| `attachments` | no | array of at most 10 `{ name: string 1..255, size: integer 0..10485760, type: string 0..100 }`. `uploaded` is ignored | 400 `attachments` |
| `taggedMembershipIds` | no | array of at most 5 distinct strings matching `^[1-9]\d{0,9}$`, each an active Membership of this Workspace and not the author | 400 `taggedMembershipIds` |
| `location` | no | `null`, or `{ latitude: -90..90, longitude: -180..180, accuracy: >= 0 }`, all finite numbers | 400 `location` |

`editBody` (E10) is `draftBody` without `periodId`, with at least one key required, and with the submit rule applied: after sanitising, `accomplishments` visible text must be at least 50 characters if the field is provided or already stored (check on the resulting content). Failure is 400 `accomplishments`.

E7 submit rule: resulting `accomplishments` visible text at least 50 characters (`ACCOMPLISHMENTS_MIN`), else 400 `{ "accomplishments": "Write at least 50 characters." }`. Nothing else blocks a submit.

E8 query: `workspaceId` required (digits), `periodId` optional (digits), `status` optional and only `draft`, `limit` integer 1..100 default 50, `offset` integer >= 0 default 0, else 400 with the field name. The default returns the caller's own non-draft, non-deleted reports ordered by `submitted_at` descending then `id` descending. `status=draft` returns the caller's own drafts ordered by `updated_at` descending. An Admin gets `[]`.

E3, E4 query: `workspaceId` required, digits. E5 query: `periodId` required, digits.

### Guard decisions per route, in words
- E1: any active member reads. E2: Admin only, role comes from the Membership row, never from a token, body or query.
- E3, E4: any active member. E5, E6, E7: caller must hold `staff` or `head`. An `admin` gets 403 `ADMIN_CANNOT_AUTHOR` after the period and Membership check.
- E7, E9, E10, E11: `ReportAccess.load` first, so a non-reader always gets 404 before any role message.
- Row ownership: E7 and E10 and E11 require `report.author_membership_id = caller.membershipId`. A reader who is not the author gets 403 `NOT_AUTHOR`.

### `ReportAccess` (`src/modules/report/report-access.ts`), the only place access rules live
- `load(userId, reportId)`: loads the non-deleted row, then `MembershipService.resolve(userId, report.workspaceId)`. Missing, deleted, other Workspace, non-member, deactivated: the same 404.
- `relation(caller, report)`: `author` when `caller.membershipId === report.authorMembershipId`. `reviewer` when the report is not a draft and either the caller is the current Head of `report.spaceId` (`spaces.head_membership_id`) and not the author, or the caller's role is `admin` and (the Space has no Head or the author's current role is `head`). Otherwise `none`.
- `assertRead`: draft returns 404 always (D24). Else `author` or `reviewer`, otherwise 404.
- `assertEdit(now)`: relation `none` 404; `reviewer` 403 `NOT_AUTHOR`; read-only Workspace 403 `WORKSPACE_READ_ONLY`; status `draft` 409 `NOT_SUBMITTED`; then `editState` (D10).
- `assertDelete`: relation `none` 404; `reviewer` 403 `NOT_AUTHOR`; `first_seen_at` not null 403 `REPORT_SEEN`. Runs under `FOR UPDATE`.
- Slice 1's reuse: the review slice adds `assertReview` here and the "seen" write. This slice does not set `first_seen_at` or `window_started_at`. Tests seed them with SQL.
- Admin visibility follows `reviewersFor` literally (an Admin cannot read a Staff report in a Space that has a Head). CONTEXT.md says Admins monitor everything. Recorded as assumption A7 for the review slice, not decided here.

### Service behaviour and error handling
Each operation lists its failures, whether they are recoverable, what the caller gets and the log level.

| Operation | Failure | Recoverable | Caller receives | Log |
|---|---|---|---|---|
| Any route | token missing or invalid | yes, sign in | 401 | none (existing guard) |
| Any route | validation | yes, fix input | 400 field map | none |
| Any resource route | row missing, deleted, other Workspace, non-member, deactivated | no | 404 `Not found.` | none |
| Draft save | author is Admin | no | 403 `ADMIN_CANNOT_AUTHOR` | none |
| Draft save, submit, edit | read-only Workspace | no until the plan changes | 403 `WORKSPACE_READ_ONLY` | none |
| Draft save | period not started | yes, later | 409 `PERIOD_NOT_OPEN` | none |
| Draft save, submit | `now > dueAt + 7 days` | no | 409 `PERIOD_CLOSED` | none |
| Draft save | row exists and is submitted | no | 409 `ALREADY_SUBMITTED` | none |
| Submit | row is not a draft | no | 409 `ALREADY_SUBMITTED` | none |
| Edit | row is a draft | yes, submit first | 409 `NOT_SUBMITTED` | none |
| Edit | approved, or window closed | no | 403 `REPORT_APPROVED`, `EDIT_WINDOW_CLOSED` | none |
| Edit, delete | caller is a reader, not the author | no | 403 `NOT_AUTHOR` | none |
| Delete | `first_seen_at` set | no | 403 `REPORT_SEEN` | none |
| Any write | tag outside the Workspace, self, inactive | yes | 400 `taggedMembershipIds` | none |
| Any write | database error, deadlock, unexpected null Space on a Staff or Head Membership | maybe, retry | generic 500 `{ message }` with no SQL | `error`, with request id and no body |
| PUT schedule | advisory lock wait | yes | the call waits for the lock (no timeout in this slice) | none |

Behaviour:
- Draft upsert is one statement: `INSERT ... ON CONFLICT (period_id, author_membership_id) WHERE deleted_at IS NULL DO UPDATE SET ... WHERE reports.submission_status = 'draft' RETURNING *`. Zero rows returned means the live row is submitted: 409 `ALREADY_SUBMITTED`. Five parallel saves give one row.
- First insert copies `space_id` from the caller, KPI rows from the Space template (D13) and `edit_window_minutes` from the Workspace.
- Submit runs in one transaction: sanitised content is already stored; `UPDATE reports SET submission_status = (late or submitted), submitted_at = now, review_status = 'pending', edit_window_minutes = <workspace> WHERE id = $1 AND submission_status = 'draft' RETURNING *`. Then insert the `submitted` event and the audit row.
- Edit runs in one transaction: `SELECT ... FOR UPDATE`, `assertEdit`, insert the revision with the previous content, update content, set `review_status = 'pending'`, set `window_started_at = NULL`, insert the `edited` event and the audit row.
- Sanitising runs on every write of the three text sections before the visible-text length check.
- Period materialising: `INSERT ... ON CONFLICT (workspace_id, starts_at) DO NOTHING` then `SELECT`, inside a transaction holding `pg_advisory_xact_lock(<period key>, workspaceId)` (two-int form, the slice 1 pattern). The same lock covers lazy creation of the baseline schedule row and `PUT schedule`. A period whose `startsAt` is in the future is never created.
- PUT schedule: under the lock, ensure the baseline row, compute `effective_from = nextPeriodStart(now)` (the first boundary of the active version strictly after `now`), delete any pending row (`effective_from > now`), insert the new row, write the `schedule.change` audit row, return `ApiSchedule` with `pending` set and `appliesFrom`. A change never edits an existing period.
- GET schedule writes nothing. With no row it returns the default built from `workspaces.time_zone`.

### Pure calendar module (`src/modules/schedule/period-calendar.ts`)
Names are binding so tests and services agree.
- `civilToInstant(dateISO, hhmm, tz): Date`. A time in a spring-forward gap resolves to the first valid instant after the gap. An ambiguous time (fall-back) resolves to the earlier occurrence.
- `boundaryDates(version, anchor)`: next and previous boundary civil dates (D6) with plain `Date.UTC` day arithmetic.
- `periodContaining(instant, versions)`, `currentPeriod(now, versions)` (D7), `openPeriods(now, versions)` (D8, walk back at most 40 periods), `nextPeriodStart(now, versions)`.
- `label(period, tz)`: weekly "Week of 19 October", fortnightly "Fortnight of 19 October", daily "Monday 19 October", monthly "October 2026", quarterly "Quarter starting 1 October 2026". `Intl` with `en-GB` in the Schedule time zone. No em dash.
- `periodContaining` picks the latest version with `effective_from <= instant`. The previous version's last period ends exactly at the new version's `effective_from`, which is always a boundary of the previous version, so no period is cut short.

### Sanitiser (`report-sanitizer.ts`)
`sanitize-html` with an allow-list of `p br strong b em i u s code pre blockquote ul ol li h1 h2 h3 h4 hr a`. `a` keeps only `href` with schemes `http`, `https`, `mailto`, and is forced to `rel="noopener noreferrer"` and `target="_blank"`. No `style`, `class`, `on*`, `img`, `svg`, `iframe`, `script` or `style` elements. A disallowed tag is dropped and its text kept, except `script` and `style` whose contents are discarded (`nonTextTags`). Input over 20000 characters is refused before parsing. Before coding, read the Tiptap extensions in `src/components/reports/rich-text-section.tsx` and add any tag the editor emits that is missing from the allow-list, so a round trip loses nothing (needs verification during implementation). Exports `sanitizeReportHtml(html)` and `visibleTextLength(html)`.

## Data
Migration file: `reportlee-backend/src/db/migrations/0002_reports.sql`. Hand-written, forward-only, LF endings, every statement idempotent, statements separated by `--> statement-breakpoint`. Do not run `migrate:create`. Never edit the file after it is applied anywhere. A later fix is `0003_*.sql`.

Enums, each as `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
- `schedule_cadence`: `daily`, `weekly`, `fortnightly`, `monthly`, `quarterly`.
- `report_submission_status`: `draft`, `submitted`, `late`.
- `report_review_status`: `pending`, `approved`, `rejected`.
- `report_event_kind`: `submitted`, `edited`, `seen`, `approved`, `rejected`, `reopened`. The slice 3 values are created now so slice 3 needs no `ADD VALUE` (which cannot be used in the same transaction).

Changed table `workspaces`: `ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "edit_window_minutes" integer NOT NULL DEFAULT 30;` plus a guarded `DO` block adding CHECK `workspaces_edit_window_chk` (`edit_window_minutes BETWEEN 1 AND 10080`). Additive: existing rows get 30.

New tables (`CREATE TABLE IF NOT EXISTS`):

| Table | Columns | Constraints and indexes |
|---|---|---|
| `workspace_schedules` | `id` integer identity PK; `workspace_id` integer NOT NULL; `cadence` schedule_cadence NOT NULL; `weekday` varchar(9) NULL; `time_of_day` char(5) NOT NULL; `time_zone` varchar(64) NOT NULL; `day_of_month` smallint NULL; `last_day` boolean NOT NULL DEFAULT false; `anchor_date` date NULL; `effective_from` timestamptz NOT NULL; `created_by_membership_id` integer NULL; `created_at`, `updated_at` timestamp NOT NULL DEFAULT now() | FK `workspace_id` to `workspaces(id)` ON DELETE CASCADE. FK `created_by_membership_id` to `memberships(id)` ON DELETE SET NULL. UNIQUE `(workspace_id, effective_from)`. CHECK `time_of_day ~ '^([01][0-9]\|2[0-3]):[0-5][0-9]$'`. CHECK `day_of_month BETWEEN 1 AND 31`. CHECK weekday not null when cadence is weekly or fortnightly. CHECK `anchor_date` not null when cadence is fortnightly. CHECK `day_of_month` not null or `last_day` when cadence is monthly or quarterly |
| `reporting_periods` | `id` identity PK; `workspace_id` integer NOT NULL; `label` varchar(80) NOT NULL; `starts_at`, `ends_at`, `due_at` timestamptz NOT NULL; `created_at`, `updated_at` | FK `workspace_id` ON DELETE CASCADE. UNIQUE `(workspace_id, starts_at)`. Index `(workspace_id, due_at)`. CHECK `starts_at < ends_at AND ends_at < due_at` |
| `reports` | `id` identity PK; `workspace_id`, `period_id`, `author_membership_id`, `space_id` integer NOT NULL; `accomplishments`, `challenges`, `plans` text NOT NULL DEFAULT ''; `kpis` jsonb NOT NULL DEFAULT '[]'; `attachments` jsonb NOT NULL DEFAULT '[]'; `tagged_membership_ids` integer[] NOT NULL DEFAULT '{}'; `location` jsonb NULL; `submission_status` report_submission_status NOT NULL DEFAULT 'draft'; `review_status` report_review_status NOT NULL DEFAULT 'pending'; `submitted_at`, `first_seen_at`, `window_started_at` timestamptz NULL; `edit_window_minutes` integer NOT NULL DEFAULT 30; `deleted_at` timestamp NULL; `created_at`, `updated_at` | FKs: `workspace_id` to `workspaces` and `period_id` to `reporting_periods` (RESTRICT), `author_membership_id` to `memberships` (RESTRICT), `space_id` to `spaces` (RESTRICT). UNIQUE partial index `(period_id, author_membership_id) WHERE deleted_at IS NULL`. Indexes `(workspace_id, period_id, space_id)` and `(author_membership_id, period_id)`. CHECK `(submission_status = 'draft') = (submitted_at IS NULL)`. CHECK `edit_window_minutes BETWEEN 1 AND 10080` |
| `report_revisions` | `id` identity PK; `report_id` integer NOT NULL; `previous` jsonb NOT NULL; `created_at` timestamptz NOT NULL DEFAULT now() | FK `report_id` to `reports(id)` ON DELETE CASCADE. Index `(report_id)` |
| `report_events` | `id` identity PK; `report_id` integer NOT NULL; `kind` report_event_kind NOT NULL; `actor_membership_id` integer NULL; `created_at` timestamptz NOT NULL DEFAULT now() | FK `report_id` ON DELETE CASCADE. FK `actor_membership_id` to `memberships(id)` ON DELETE SET NULL. Index `(report_id, created_at)` |

Indexes use `CREATE [UNIQUE] INDEX IF NOT EXISTS`. Foreign keys and CHECKs are added in guarded `DO $$ BEGIN ALTER TABLE ... ADD CONSTRAINT ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$;` blocks, as `0001` does. The migration runner also swallows 42710, 42P07, 42P16, 42701 and 42704, but no statement may rely on that. A test applies the file twice through `applyMigration` (which has no catch) and expects no error.

Why `reports.deleted_at` is `timestamp` and not `timestamptz`: it must match the `softDelete` helper that `RelationalRepository` reads. It is never compared with `now()` across zones.

Hash stability: the runner records each file by the hash of its contents. Windows `core.autocrlf=true` can rewrite the file to CRLF on checkout and change the hash, which runs the file once more. That is harmless only because every statement is idempotent, and the test proves it. No `.gitattributes` in this slice (config churn). Backlog line, same as slice 1. Before `npm run migrate`: print `NODE_ENV` and confirm the database is the local Docker `app-db` on host port 5434 (never print `.env*`). The second `npm run migrate` must apply 0 files.

Models (same change, comment `/* @info - Mirrors src/db/migrations/0002_reports.sql. The SQL file is what runs. */`):
- New `src/modules/schedule/schedule.model.ts`: `workspaceSchedules`, `reportingPeriods`, `scheduleCadence`.
- New `src/modules/report/report.model.ts`: `reports`, `reportRevisions`, `reportEvents`, the three report enums.
- Edit `src/modules/workspace/workspace.model.ts`: `editWindowMinutes`.
- Add the table names to `TableNames` and export the new models from `src/db/postgres.schema.ts`.
- `npm run check:circular` must show only the known `user.model <-> user-role.model` cycle, so the new models use `references(() => ...)` the way `space.model.ts` does, or SQL-only foreign keys, and never import `membership.model` in a loop.
- Test helpers: `tests/helpers/db.ts` (`SLICE_TABLES` truncate list, `dropSliceObjects` for the 0002 objects), `tests/helpers/factories.ts` (period, report and schedule factories if missing).

Invariants and who owns them:
| Invariant | Owner | Why there |
|---|---|---|
| One live report per person per period | Database partial unique index, used by the upsert | Only the database is safe under parallel requests |
| `submitted_at` set if and only if not a draft | Database CHECK | Cannot be bypassed by a code path |
| Period start and end are not rewritten | Service: periods are inserted with `DO NOTHING`, never updated | A version table makes later changes new rows |
| Who can read, edit, delete | `ReportAccess` only | One choke point, reused by review |
| Late or on time | Report service at submit, from `now` and `periods.due_at` | Server clock, never the client |
| Draft is invisible to others | `ReportAccess` plus every list filtering by `author_membership_id` | Both, because a list is a second path |
| Sanitised HTML | Report service on every write, never trusted from the client | The backend does not assume the frontend sanitised |
| Admin never authors | Report service role check | Role comes from the Membership row |

## Frontend
Pattern: `src/lib/spaces-api.ts` (`apiCall`, `encodeURIComponent` on ids, a fallback message per call, refuse when `SIMULATED_AUTH`). No `fetch` in components. Tokens stay in memory through the existing `authed` helper. The API base is `NEXT_PUBLIC_API_URL` only.

### API modules and calls
| Function (file) | Call | Returns on success |
|---|---|---|
| `getCurrentPeriod(workspaceId)` (`reports-api.ts`) | `GET /reporting-periods/current?workspaceId=` | `ReportingPeriod` |
| `getOpenPeriods(workspaceId)` | `GET /reporting-periods/open?workspaceId=` | `ReportingPeriod[]` |
| `getDraft(periodId)` | `GET /reports/draft?periodId=` | `ReportDraft \| null` |
| `saveDraft(body)` | `PATCH /reports/draft` | `ReportDraft` |
| `submitReport(id)` | `POST /reports/:id/submit` | `Report` |
| `listMyReports(workspaceId, query)` | `GET /reports?...` | `Report[]` |
| `getReport(id)` | `GET /reports/:id` | `Report` |
| `editReport(id, body)` | `PATCH /reports/:id` | `Report` |
| `deleteReport(id)` | `DELETE /reports/:id` | nothing (204) |
| `getSchedule(workspaceId)` (`schedule-api.ts`) | `GET /workspaces/:wsId/schedule` | `ApiSchedule` |
| `putSchedule(workspaceId, body)` | `PUT /workspaces/:wsId/schedule` | `ApiSchedule & { appliesFrom }` |

Each returns the slice 1 `Call<T>` shape: `{ ok: true, data }` or `{ ok: false, message, fieldErrors?, code?, status }`. Each has a fallback message with no em dash, for example "We could not save your draft. Try again." The 204 delete is handled as success with no data.

New pure helper `src/lib/periods.ts`: `pickSubmitPeriod(open, current, mineByPeriodId)` returns the oldest open period the caller has no submitted report for, else `current`, else `null`; `isOpen(period, now)`.

### Mirrored types (frontend files that change)
- `src/lib/api-types.ts`: add `ApiSchedule`, `ApiScheduleSaved`, and the code constants `CODE_PERIOD_CLOSED`, `CODE_PERIOD_NOT_OPEN`, `CODE_EDIT_WINDOW_CLOSED`, `CODE_REPORT_APPROVED`, `CODE_REPORT_SEEN`, `CODE_WORKSPACE_READ_ONLY`, `CODE_ALREADY_SUBMITTED`, `CODE_NOT_SUBMITTED`, `CODE_NOT_AUTHOR`, `CODE_ADMIN_CANNOT_AUTHOR` next to the two existing ones.
- `src/data/reports.ts`: `ReportingPeriod`, `ReportDraft`, `Report` already match the JSON above. Comment-only change on `Attachment.uploaded`. The `SAMPLE_*` and `COLLEAGUES` constants stay because other mock screens import them.
- `src/lib/settings.ts`: `Schedule` unchanged. `ApiSchedule` extends it.
- Backend mirror: `report.dto.ts` and `schedule.dto.ts` hold the same shapes.

### Screens and states
Submit report (`src/components/reports/submit-report.tsx`, route `/dashboard/reports/new`):
- Loading: skeleton while the period, draft and Space template load.
- No open period: cannot happen with a valid Schedule. If E3 fails, an error with Retry.
- Admin: "Admins review reports and do not submit them." The editor is not rendered. Shown from the role in the Membership and also when the server answers `ADMIN_CANNOT_AUTHOR`.
- Read-only Workspace: banner "This Workspace is read-only. You can read reports but not submit them." on `WORKSPACE_READ_ONLY`.
- Draft autosave: debounced 1500 ms after the last change through `saveDraft`. Indicator states: "Saving", "Saved", "Not saved. Retry". The indicator never says Saved after a failure. A 409 `PERIOD_CLOSED` shows "This period is closed. Your draft is kept but can no longer be submitted." and disables Submit. `ALREADY_SUBMITTED` reloads the screen on the submitted report.
- Submit: calls `saveDraft` first (flush pending), then `submitReport`. On success it shows the report page. A 400 puts the message beside the accomplishments field. `PERIOD_CLOSED` as above. Late is shown from the returned `submissionStatus`, not predicted.
- KPI rows come from the draft (the server snapshot). The Space template from `listSpaces` is used only when no draft exists yet, to show empty rows. `SAMPLE_KPI_TEMPLATE` is no longer read here.
- Colleague picker uses the real roster from `src/lib/members.ts` (check what it exposes at build time), not `COLLEAGUES`. A 400 on `taggedMembershipIds` shows beside the picker.
- Edit mode (opened from a report page): uses `editReport`. 403 `EDIT_WINDOW_CLOSED` and `REPORT_APPROVED` replace the Save button with the message. `NOT_SUBMITTED` reloads.
- `localStorage` autosave stays only as a crash backup if it needs no extra code, otherwise it is dropped.

My reports (`report-view.tsx`, `ReportList`, route `/dashboard/reports`):
- Loading skeleton, empty state "You have not submitted a report yet." with a link to the Submit screen, error with Retry, list of cards by period with status pills.
- Pages of 50 with a "Load more" action.

Report detail (`report-view.tsx` and `report-timeline.tsx`, route `/dashboard/reports/[id]`):
- Loading, error with Retry, and a "Report not found" state on 404 (same words whatever the cause).
- Content, revisions and events from the response. `comments` is `[]`, so the discussion block shows its existing empty state.
- Actions: `canEdit`, `canDelete` and `primaryAction` in `src/lib/report-view.ts` stay as hints only. The server answer wins: a failed Edit or Delete shows the code's message in place of the action. Delete asks for confirmation. After a 204 the app returns to the list.
- Reviewer view (a Head or Admin opening a report that `ReportAccess` allows) is read-only here. Decision buttons stay mock until the review slice.

Settings schedule (`src/components/settings/settings-screen.tsx`):
- Admin: editable form loaded by `getSchedule`, saved by `putSchedule`. `scheduleProblem` stays as pre-submit validation mirroring the server. A saved change shows "Takes effect from <appliesFrom date in the Schedule time zone>" through `scheduleSummary`. Field errors beside the field. Saving state disables the button.
- Staff and Head: read-only summary.
- Loading skeleton; error with Retry; a pending change shown as a note under the active schedule.

My record (`/dashboard/my-record`) is unchanged (D23). Home, review queue, search and task board keep their mock reads and must still compile. If removing a simulated function in `src/lib/reports.ts` would break them, keep that export untouched.

`src/lib/reports.ts`: delete the simulated `loadReports`, `loadReport`, `saveReport`, `submitReport` and the local state the server now owns. Keep `draftBody`, `clearReportStateFor` (sign out) and any export a mock screen imports (`savedReports`, `draftKey`, `readDraft`, `SAVED_PREFIX`). Decide by compiling. Update the endpoint doc comment: the Workspace comes from `workspaceId` or the period, not a path segment.

Frontend tests (`node --test scripts/*.test.ts`, no new framework): `scripts/reports-api.test.ts` (paths, bodies, unwrapping, `code` and `fieldErrors`, 204, the `SIMULATED_AUTH` refusal), `scripts/periods.test.ts`, `scripts/schedule-api.test.ts`. `scripts/report-storage.test.ts` and `scripts/report-view.test.ts` are updated where a removed function is covered, with an equivalent test for the new path. No test is deleted to get green.

## Testability
Unit (no database): `period-calendar.ts`, `report-sanitizer.ts`, `ReportAccess.editState` and `relation` as pure functions, frontend `periods.ts`, `reports-api.ts`, `schedule-api.ts`.
Integration (real test Postgres, HTTP through the app): migration applied twice, every endpoint's guards, role, isolation, the parallel draft save, lateness and grace edges with a fixed clock, edit window and lock with `first_seen_at` seeded by SQL, delete, KPI snapshot, schedule change, log capture proving no report text is logged.

Time zone tests, hand computed:
- Africa/Lagos (no DST): all five cadences, including monthly day 31 in February of a leap and a non-leap year, last day, and quarterly October to January.
- America/New_York: the week of Monday 26 October 2026 to Monday 2 November 2026 is 169 hours and is due Monday 2 November 17:00 local; the spring-forward week in March 2027.
- Europe/London weekly across 29 March 2026.
- `civilToInstant` for 02:30 on a spring-forward date (gap) and 01:30 on a fall-back date (ambiguous).
- A midnight gap zone (Africa/Cairo around the last Friday of April, where local 00:00 does not exist). Needs verification during implementation that the installed Node time zone data has Cairo daylight saving. If not, use another zone with a midnight transition and record it.
- A due date just before a DST change: the 7 day grace closes after exactly 168 hours.
- Schedule change: the pending version starts a new period at the old boundary and old periods are untouched.

## Assumptions (design review please check)
- A1: every edit clears `window_started_at` (D10).
- A2: fortnightly periods count from `anchor_date`, the version's start weekday on or before its local start date.
- A3: quarterly means January, April, July, October.
- A4: current period is D7, and `open` (D8) is how a late period is reached.
- A5: `GET /reports` and the draft calls take `workspaceId` or `periodId`, an addition to the paths documented in `src/lib/reports.ts`.
- A6: `appliesFrom` is the first boundary after the moment of the change, not the next period after the current one. Example: at Monday 10:00 the week that began at 00:00 is already running, so the change starts the following Monday.
- A7: Admin visibility follows `reviewersFor` literally.
- A8: location is not gated on `location_tagging`.
- A9: a Head's own report is read by Admins; a Head is never a reviewer of their own report.

## Rejected alternatives
- DOMPurify with `jsdom` for sanitising: pulls in a DOM emulation just to clean strings, and is slower. Rejected for `sanitize-html` (D1).
- `luxon` or `date-fns-tz` for time zones: a second new dependency for a small amount of arithmetic. Rejected (D2).
- Generating all periods ahead of time with a job: needs a queue and backfill when the Schedule changes. Lazy creation under an advisory lock is simpler and safe.
- Storing the Schedule as columns on `workspaces`: loses the history that keeps old periods stable. Rejected for the version table (D4).
- Storing `missing` as a row: it is derived (period closed and no submitted report), and a stored value would drift. Rejected (R2).
- Putting `:wsId` in every report path: forces the client to know the Workspace of a report it is opening, and makes "other Workspace" a different answer from "does not exist". Rejected (D19).
- A hard delete: breaks audit and the partial unique index would not need to exist. Soft delete matches `RelationalRepository` (D11).
- A separate `report_attachments` table now: nothing to put in it until uploads exist. Rejected (D14).
- Setting `first_seen_at` on author or reviewer GET: marking seen is the review slice and must be explicit there (R3 scope). Rejected here.
- Letting the client send `authorMembershipId` or the Space: the server reads both from the Membership. Rejected (strict bodies).
- `ON CONFLICT DO NOTHING` plus a second query for the draft: leaves a gap between the two statements. Rejected for one `DO UPDATE ... WHERE` statement.

## Order of work
1. OpenSpec change validates and is approved (migration, permissions and a dependency are approval triggers, pre-approved by the owner).
2. Backend, additive and deployed first: migration `0002_reports.sql` and models, then `period-calendar.ts`, sanitiser, schedule module, report module with `ReportAccess`. Each step has its tests red first on the real test Postgres.
3. Run `npm run migrate` against the local database only, twice, second run applies 0 files.
4. Frontend: types and API modules with tests, then Submit, My reports, detail, Settings.
5. Gate 3 in both repos, review, live check against `http://localhost:5000`.
Backward compatibility: every change is additive (new tables, a column with a default, new endpoints, a new coded error class). The frontend deploys after the backend. An old frontend ignores the new endpoints and keeps working.

## Acceptance checks
- AC1: A member reading the Schedule of a Workspace with no row gets weekly, Monday, 17:00 and the Workspace time zone, and no row is written.
- AC2: An Admin PUT of a valid Schedule returns 200 with `appliesFrom` equal to the first period start after now. A Staff or Head PUT returns 403 and changes nothing. A non-member gets 404.
- AC3: PUT with a bad `time`, `timeZone`, missing `weekday` for weekly, or missing day for monthly returns 400 with that field name.
- AC4: After a Schedule change, the existing period keeps its `startsAt`, `endsAt` and `dueAt`, and the first period starting at or after `appliesFrom` follows the new cadence.
- AC5: Period generation matches the hand computed instants for all five cadences in Africa/Lagos, including monthly clamping, last day and quarterly rollover.
- AC6: Period generation is correct across the America/New_York and Europe/London changes and for a gap and an ambiguous local time, and the `civilToInstant` rules hold.
- AC7: At Monday 26 October 2026 15:30 the current period is the week of 19 October. At 17:01 it is the week of 26 October.
- AC8: Ten parallel `current` requests store one period.
- AC9: `open` lists periods with `startsAt <= now <= dueAt + 168 hours`, oldest first, and never a period that has not started.
- AC10: Five parallel draft saves for one person and period leave one row. A second save updates it. A save after submit is 409 `ALREADY_SUBMITTED`.
- AC11: A draft save by an Admin is 403 `ADMIN_CANNOT_AUTHOR`. In a read-only Workspace a save, submit or edit is 403 `WORKSPACE_READ_ONLY` and a delete works.
- AC12: Another member's draft is 404 by id, absent from their lists, and `GET /reports/draft` returns only the caller's own.
- AC13: A report id from another Workspace, a deleted report, a non-member and a deactivated member all return the identical 404.
- AC14: Submit at `dueAt` is `submitted`. One second later is `late`. At `dueAt + 7 days` it is accepted. One second after that it is 409 `PERIOD_CLOSED`. Before `startsAt` a draft save is 409 `PERIOD_NOT_OPEN`. A draft survives the deadline.
- AC15: Submit with under 50 characters of accomplishments is 400 on `accomplishments`. A second submit is 409 `ALREADY_SUBMITTED`.
- AC16: The KPI rows of a report do not change when the Space template changes later. An unknown KPI name is ignored. A value of 0 is stored as 0.
- AC17: Edit rules: unseen editable; seen at 10 minutes editable; seen at 31 minutes 403 `EDIT_WINDOW_CLOSED`; rejected always editable; approved 403 `REPORT_APPROVED`; a draft through the edit route 409 `NOT_SUBMITTED`.
- AC18: Each edit adds one revision holding the previous content and one `edited` event, sets the report to pending, clears `windowStartedAt`, and keeps the submission status.
- AC19: Delete: author with unseen report is 204 then 404; seen is 403 `REPORT_SEEN`; a reviewer is 403 `NOT_AUTHOR`; after delete a new draft for the period can be saved.
- AC20: Reads: Head reads a Staff report in their Space and not another Space's; Admin reads a Head's report; Admin reads a Staff report only when the Space has no Head; nobody but the author reads a draft; a tagged colleague who is not a reviewer gets 404.
- AC21: Sanitiser: script with contents, `onerror`, `onclick`, `javascript:` and `data:` hrefs, `style`, `iframe`, `svg` and `img` are removed. Bold, lists and https links are kept. Links carry `rel="noopener noreferrer"` and `target="_blank"`. Sanitising twice equals once. Input over 20000 characters is 400. This holds through every write route.
- AC22: Visible text over 5000 characters is 400. An unknown body key is 400. A tag outside the Workspace, a self tag, more than 5 tags, a bad location and more than 30 KPI rows or 10 attachments are 400 on the right field.
- AC23: Log capture shows no report text, KPI value, tag or location for any write route.
- AC24: Migration `0002_reports.sql` applies twice without error, creates the five tables, four enums, the column with default 30 and the partial unique index, and `npm run migrate` the second time applies 0 files. `check:circular` shows only the known cycle.
- AC25: Frontend: `reports-api`, `schedule-api` and `periods` tests pass, including the 204 delete, `code` and `fieldErrors` mapping and the `SIMULATED_AUTH` refusal. `npx tsc --noEmit` and `npm run build` pass.
- AC26: Browser: Submit report shows loading, autosave states, a field error, the late state, the closed state and the Admin state. My reports shows empty, error and list. Settings saves a schedule as Admin and is read-only as Staff. Marked "not verified" if no browser is available.
- AC27: No new dependency except `sanitize-html` and `@types/sanitize-html`. `rg -n "[\u2014\u2013]"` on touched files shows no user-facing hit.

## Backlog (carried out of this slice)
Setting `first_seen_at` and `window_started_at`, review decisions, comments and tasks (review slice); a Settings control for `edit_window_minutes`; gating location on `location_tagging`; real uploads; the Admin visibility rule for Staff reports in Spaces with a Head; My record on real data; `.gitattributes` for migration line endings; rate limiting on autosave.
