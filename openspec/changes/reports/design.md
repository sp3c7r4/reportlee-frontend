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
| D3 | Instants are `timestamptz` in the new tables. `created_at` and `updated_at` reuse the existing `timestamps` helper. `deleted_at` reuses the `softDelete` helper. Services always set `created_at` and `updated_at` explicitly from the request's `now` (never the DB default) for `reports`, `reporting_periods` and `workspace_schedules`, so `ReportDraft.updatedAt` is the server clock in UTC (design review round 3, finding 6). | Periods and deadlines are instants. Existing helpers keep the models consistent. |
| D4 | The Schedule is versioned: table `workspace_schedules`, many rows per Workspace, unique `(workspace_id, effective_from)`. "Applies from the next period" is a row whose `effective_from` is in the future. The baseline row (`effective_from = 1970-01-01`) is created lazily under the period lock with the R1 default and the Workspace time zone. | A change must never rewrite old periods. A version table makes that a data fact, not a code convention. |
| D5 | A period is `[startsAt, nextBoundary)`. `startsAt` is local 00:00 on a boundary date, except the first period of a Schedule version (D6). `endsAt = nextBoundary - 1 second`. `dueAt` is the next boundary date at the Schedule `time` in the Schedule time zone. `weekday` means the day a period starts. A local time skipped by a clock change resolves to the first local time after the gap, as a wall clock reading, not shifted by the gap length: 02:30 on 2027-03-14 in America/New_York resolves to 03:00 local (`2027-03-14T07:00:00Z`), and 00:00 on a date where Africa/Cairo skips midnight resolves to 01:00 local. An ambiguous local time (fall-back) resolves to the earlier instant. | Matches `SAMPLE_PERIOD` (Monday 19 October 00:00 to Sunday 25 October 23:59:59, due Monday 26 October 17:00) and R1. |
| D6 | Boundaries: daily = every local day; weekly = each `weekday`; fortnightly = every 14 days from `anchor_date`; monthly = `day_of_month` each month, clamped to the month length, or the last day when `last_day`; quarterly = the same day in January, April, July, October. **First period of a version (one rule):** it starts exactly at the version's `effective_from` and runs to the first boundary of the new rule strictly after that instant. It can be shorter than the cadence (a "stub"); every later period is a full one. Its label uses its start date. `anchor_date` of a fortnightly version is the first date that falls on the version's `weekday` on or after the local date of `effective_from`, with the date read in the version's own time zone. A baseline version (`effective_from` 1970) has no stub: its first boundary at or before the instant is used. | The frontend `Schedule` type has these fields and no more. Fortnightly anchor and quarterly months are not in the frontend, so they are stated as assumptions A2 and A3. A stub keeps "applies from the next period" true and never rewrites an old period. Worked examples (Africa/Lagos, UTC+1): weekly Monday changed to weekly Friday with `effective_from` 2026-11-01T23:00Z (Monday 2 November 00:00 local): the stub runs Monday 2 November 00:00 to Thursday 5 November 23:59:59 and is due Friday 6 November at the new time, then full weeks start Friday 6 November. Weekly changed to fortnightly Friday: the stub is the same, anchor_date is 2026-11-06, full fortnights start 6 and 20 November. Time zone changed from Africa/Lagos to Africa/Cairo (UTC+2 in November) with the same `effective_from` instant: the stub starts at that instant (Monday 2 November 01:00 Cairo local), so it is not at local midnight. A stub is the only period that may not start at local 00:00. |
| D7 | Current period = the earliest period in `openPeriods(now)` (D8) whose `dueAt >= now`, else the period containing `now` (a request at exactly 17:00:00.000 still sees the earlier period, matching D9 where a submission at `dueAt` is on time). At Monday 26 October 15:30 it is the week of 19 October (matches `SAMPLE_NOW`). After 17:00 it is the week of 26 October. It does not assume a period lasts a day or that due times match across Schedule versions, so a stub shorter than a day, or an older version with a later due time, still gives the answer the spec states (earliest period whose deadline has not passed). | R2: the deadline belongs to the week just worked. |
| D8 | Add `GET /reporting-periods/open?workspaceId=`: every period with `startsAt <= now <= dueAt + 7 days` and `endsAt >= workspaces.created_at` (the current period is always kept), oldest `dueAt` first. Tests with a fixed clock seed `workspaces.created_at`, because fake `Date` does not move the database `now()` (round 3, finding 3). The Submit screen picks the oldest open period the caller has not submitted, else the current one. | Without it the UI cannot reach a late period after `current` has moved on. Additive endpoint implementing R2. |
| D9 | Lateness: `submittedAt > dueAt` is late, equal is on time. The grace is the constant `7 * 24 * 60 * 60 * 1000` ms (same value as `SUBMISSION_WINDOW_MS`), not calendar days. Open while `now <= dueAt + grace`. After that, draft save and submit return 409 `PERIOD_CLOSED`. Before `startsAt`, 409 `PERIOD_NOT_OPEN`. Editing a submitted report after the period closed is allowed. `missing` is never stored. | R2. Fixed milliseconds keep the rule independent of DST. |
| D10 | Edit rule in one function `ReportAccess.editState(report, now)`. Approved: locked `REPORT_APPROVED`. Rejected: editable. Otherwise if `first_seen_at` and `window_started_at` are both set and `now > window_started_at + edit_window_minutes`: locked `EDIT_WINDOW_CLOSED`. Else editable. Every edit sets `review_status = pending`, clears `window_started_at`, inserts a revision of the previous content and an `edited` event. Lateness is unchanged. | R3. Assumption A1: the brief says "cleared on resubmission" and "each edit returns the report to pending", so an edit is a resubmission. |
| D11 | Delete is author only, only while `first_seen_at IS NULL`, checked inside a transaction under `SELECT ... FOR UPDATE`. It is a soft delete (`deleted_at`). The partial unique index ignores deleted rows, so a new draft for that period is possible. A draft is deletable by its author. | R3 and the CONTEXT.md definition of Seen. |
| D12 | Add `workspaces.edit_window_minutes integer NOT NULL DEFAULT 30` with CHECK 1 to 10080. The report copies it at draft creation and refreshes it at submit. No endpoint changes it in this slice. | Slice 1 has no such column. A default keeps the migration additive. A Settings control is later work. |
| D13 | R4 snapshot: on first draft insert, the server copies the Space's `kpi_template` as `[{name, unit, value: null}]`. A save matches client rows by `name`, updates only `value`, and ignores unknown names. When the template holds two rows with the same name, the value goes to the first row with that name and the later rows keep their stored value. The frontend drops `SAMPLE_KPI_TEMPLATE` and takes the template from `listSpaces`. | R4. The client cannot add or rename a KPI row. The merge happens in the application on the row locked by `SELECT ... FOR UPDATE` (see "Service behaviour"). |
| D14 | Attachments are a jsonb array of `{name, size, type}`. Responses add `uploaded: false`. No attachments table, no upload route. | The brief: metadata only, note it. |
| D15 | `tagged_membership_ids integer[]`. The service checks every id is an active Membership of the same Workspace, not the author, at most 5. Failure is a 400 field error on `taggedMembershipIds`. A tag grants no access. | CONTEXT.md "Tag". |
| D16 | Location is stored after range validation (latitude -90..90, longitude -180..180, accuracy >= 0). It is not gated on `workspaces.location_tagging` in this slice. | The brief: store what the frontend sends. Gating is a Backlog line. |
| D17 | Only `staff` and `head` author. `admin` gets 403 `ADMIN_CANNOT_AUTHOR` on draft save, submit and edit. A read-only Workspace gets 403 `WORKSPACE_READ_ONLY` on draft save, submit and edit. Delete stays allowed. | CONTEXT.md: Admins never author. Read-only Workspace blocks submitting. |
| D18 | New `CodedConflictError` (409 with `code`), and one more `instanceof` branch in `src/middlewares/error.ts`. 403 codes: `NOT_AUTHOR`, `REPORT_APPROVED`, `EDIT_WINDOW_CLOSED`, `REPORT_SEEN`, `ADMIN_CANNOT_AUTHOR`, `WORKSPACE_READ_ONLY`. 409 codes: `PERIOD_CLOSED`, `PERIOD_NOT_OPEN` (defensive, see the note under the endpoint table), `ALREADY_SUBMITTED`, `NOT_SUBMITTED`, `NO_SPACE` (a Staff or Head Membership with no Space, `memberships.space_id` is nullable). The frontend branches on `code`, never on text. | Follows `CodedForbiddenError`. The existing branch adds `code` for two classes only. |
| D19 | Resource-addressed routes (`/reports/:id`, `/reports/draft`, `/reporting-periods/*`) carry no `:wsId`. The Workspace comes from the resource row (report or period) or from a required `workspaceId` query, then `resolveOrNotFound(userId, workspaceId)` (D29). A missing row, another Workspace, a non-member and a deactivated member all return the same 404 body. | One identical 404 leaks nothing. Matches slice 1's "non-members learn nothing". |
| D20 | Lists return a plain array in `data` (like `GET /spaces`) with `limit` (default 50, max 100) and `offset`. | Existing list convention. |
| D21 | Services read `new Date()` once per request and pass it down. Tests use `vi.useFakeTimers({ toFake: ["Date"] })` with `vi.setSystemTime` so pg timers still work. | Time rules need exact boundary tests. |
| D22 | Extend `AuditAction` with `report.submitted`, `report.edited`, `report.deleted`, `schedule.change`. Written in the same transaction. Summaries hold ids and field names only. Draft autosave is not audited. | Never log personal data. Autosave would flood the log. |
| D23 | My record stays on mock data. Home, review queue, search and tasks keep their mock reads. | They need the roster, analytics and review (later slices). |
| D24 | `GET /reports/:id` on a draft returns 404 for everyone, the author included. A draft is served only by `GET /reports/draft`. `DELETE /reports/:id` still works on the author's own draft. | `Report.submittedAt` is a required string in the frontend type, so a draft cannot be a `Report`. One route per shape. |
| D24b | One draft is served only by E5 (see D24), and E5 answers `null` when the live report is already submitted. The screen then finds the submitted report with `GET /reports?workspaceId=&periodId=` (E8). | Keeps one route per shape and gives `ALREADY_SUBMITTED` a reachable follow-up. |
| D25 | `src/middlewares/error.ts` gets two new branches. (a) `CodedConflictError` adds `code`. (b) `DrizzleQueryError` (exported by `drizzle-orm` 0.45.4, its message is `Failed query: <sql>\nparams: <bound values>`) answers 500 `{ message: MESSAGES.GENERIC }` with the text "Something went wrong. Try again." from `src/modules/report/report.message.ts`, and the existing `console.log("Error Stack", err)` is skipped for it: the branch writes one line, `console.error("DB error", { pgCode: pgErrorCode(err), method: c.req.method, path: c.req.path })`, using the existing `pgErrorCode` from `src/helpers/pg-error.ts`. The backend has no request id, so none is logged. The path carries ids only, never a body, query text or report content. It also covers slice 1 routes, so this is a behaviour change to an existing 500 body (it removed a leak, no client can depend on SQL text). A sentinel test forces a failing write and asserts neither body nor captured logs contain the sentinel. How it forces the failure: the test adds a temporary `CHECK (accomplishments NOT LIKE '%SENTINEL%')` constraint on `reports` through SQL before the request and drops it in `afterEach` (no valid HTTP input can break a real CHECK). | Review finding 1: without it AC23 fails and report text reaches responses and logs. |
| D26 | Time zone owner. Once a Workspace has a Schedule baseline row, the Schedule row owns the zone and `workspaces.time_zone` only seeds new baselines and is the Workspace's display zone. When the body of the slice 1 `WorkspaceService.update` carries `timeZone`, its transaction takes the period lock first (D31), then `lockWorkspace`, then calls `ensureBaseline(tx, workspaceId)` (which does not lock again) before it writes the new `time_zone`, but only when the Workspace already has a `reporting_periods` row (checked under the lock). Without a period nothing is written, so the unwritten default follows the corrected zone (round 3, finding 1, R1 "in the workspace time zone"). Changing the Workspace zone never moves a period. When `timeZone` is not sent, `update` is unchanged and takes no advisory lock. The Schedule zone changes only through E2. Settings shows the Schedule zone for the Schedule and the Workspace zone for the Workspace. | Review finding 12. Edits `src/modules/workspace/workspace.service.ts` (one call). |
| D27 | `visibleTextLength(html) = htmlToText(sanitizeReportHtml(html)).length`, in UTF-16 code units. `htmlToText` in the backend (`report-sanitizer.ts`) is a line for line port of `htmlToText` in `src/lib/report-draft.ts` (block closers to spaces, tags stripped, the six entities decoded, whitespace collapsed, trimmed). The editor's live counter is not used for rules. One table of cases lives in `scripts/report-text.cases.json` in the frontend and is copied to `tests/fixtures/report-text.cases.json` in the backend, both test suites read it. Example: `<p>a &amp; b</p><p>c</p>` gives 7. | Review finding 8: the browser and the server must agree at exactly 50 and 5000. |
| D28 | Every id in params, query and body uses `idString` from `src/helpers/id-schema.ts` (regex plus a check at most 2147483647). | Review finding 9: `2147483648` is a 400, never a Postgres 22003 500. |
| D29 | One helper `src/modules/report/scope.ts` resolves the caller for every new route that has no `:wsId` (E3 to E11): `resolveOrNotFound(userId, workspaceId)`. A non-member, a deactivated member and a missing row all get 404 `{ "message": "Not found." }`. A deleted or suspended person gets 401 with the text `requireMembership` already uses (`WORKSPACE_MESSAGES.AUTH_REQUIRED`, via `MembershipService.isLive`). E1 and E2 keep `requireMembership` as slice 1 wrote it: 404 `{ "message": "Workspace not found." }` and the same 401. 401 bodies for a missing or bad token are whatever `jwtService.validateToken` sends ("Token expired", "Invalid token", "Unauthorized" or its generic text) and `requireCaller` sends `AUTH_REQUIRED`. | Review finding 13: state real strings, one behaviour for suspended people on every new route. |
| D30 | Ordered checks, one list per write endpoint, are binding (section "Order of checks"). Each adjacent pair has a test. | Review finding 2. |
| D31 | Locks: `PERIOD_LOCK_CLASS = 41001` is a constant in `schedule.constants.ts`, used only as the first int of `pg_advisory_xact_lock(PERIOD_LOCK_CLASS, workspaceId)`. It is taken only when a row must be created (a period or the baseline), by PUT schedule, and by `WorkspaceService.update` when `timeZone` is sent. **One lock order everywhere: the advisory lock first, the Workspace row lock second.** Only `WorkspaceService.update` (with `timeZone`) takes both, in that order. Period creation and PUT schedule take the advisory lock and never `lockWorkspace`. Their inserts need a `FOR KEY SHARE` on the `workspaces` row through the foreign key, which waits only for a transaction that already holds `FOR UPDATE`, and that transaction holds the advisory lock too, so no cycle can form. Schedule work takes no Workspace row lock of its own, but it can wait briefly on a slice 1 member-management transaction for the foreign key check, so "never queues" is not claimed. Reads of an existing period take no lock. Slice 1 uses one-argument fixed keys elsewhere, so the two-int form is new here and cannot collide with them. A race test covers it (AC29). | Review finding 16, round 2 finding 1 (a lock cycle between `lockWorkspace` then advisory lock, and advisory lock then the foreign key's row lock). |

## Backend

### Conventions for every route
- Mounted in `src/routes/router.ts`: `router.route("/workspaces/:wsId/schedule", scheduleRouter)`, `router.route("/reporting-periods", periodRouter)`, `router.route("/reports", reportRouter)`.
- Guard order, always: `jwtService.validateToken` (401 when missing or bad), `requireCaller`, then validation and membership as follows.
  - Routes with `:wsId` (E1, E2): params, then `requireMembership`, then (E2 only) `requireWorkspaceRole("admin")`, then the body. So a non-member always gets 404 and a non-Admin always gets 403, whatever the body holds.
  - Resource-addressed routes (E3 to E11): params, query and body are validated first (Zod depends only on the request, so a bad body from a stranger leaks nothing and gets 400), then the service loads the period or report and calls `resolveOrNotFound` (D29), then the ordered checks (D30), then ownership inside `ReportAccess`.
- Success envelope `{ timestamp, status, success: true, data }`. Error envelope `{ timestamp, status, success: false, error }` where `error` is `{ "message": "..." }`, plus `"code"` for coded 403 and 409. A Zod failure is 400 with `error` as a flat map of field path to message, for example `{ "accomplishments": "Write at least 50 characters." }`. The key is the dotted path that `ZodEngine.handleResult` produces with `issue.path.join(".")`: `kpis.2.value`, `attachments.0.size`, `taggedMembershipIds.1`, `location.latitude`. The frontend maps a key to a field by its first segment. `ZodEngine` is not changed (shared by every route).
- Unknown keys: zod 4 gives an `unrecognized_keys` issue with `path: []` for `strictObject`, which would produce the key `""`. So bodies are `z.looseObject({...}).superRefine(...)`, and the refinement adds one issue per unknown key with `path: [key]` and message "This field is not accepted." The key is then the unknown key name.
- Report routes pass `{ log: false }` to `validate.body` and `sendSuccessResponse` so no report text reaches logs.
- Messages live in `schedule.message.ts` and `report.message.ts`. They contain no em dash and no SQL or stack trace.
- Route order in `report.routes.ts`: `GET /`, `GET /draft`, `PATCH /draft`, then `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/submit`.
- Ids are numbers in the database and strings in JSON. Every id (`:id`, `:wsId`, `periodId`, `workspaceId`, `taggedMembershipIds` items) is validated with `idString` (D28), else 400 `Invalid id.`.

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
Common errors for every row: 401 when the token is missing or invalid, with the text the existing guard sends (`jwtService.validateToken`: "Token expired", "Invalid token", "Unauthorized" or its generic text; `requireCaller`: "Authentication required."), and 401 "Authentication required." for a deleted or suspended person. 404 bodies have no code: E1 and E2 send `{ "message": "Workspace not found." }` (slice 1 `requireMembership`), E3 to E11 send `{ "message": "Not found." }` (D29). Any unexpected failure is 500 `{ "message": "Something went wrong. Try again." }` (D25).

| # | Method and path | Guards in order | Request | Success | Other statuses |
|---|---|---|---|---|---|
| E1 | `GET /workspaces/:wsId/schedule` | jwt, `requireCaller`, params, `requireMembership` | none | 200 `ApiSchedule` | 404 non-member |
| E2 | `PUT /workspaces/:wsId/schedule` | jwt, `requireCaller`, params, `requireMembership`, `requireWorkspaceRole("admin")`, body (role before body: a non-Admin gets 403 whatever the body holds) | `scheduleBody` | 200 `ApiSchedule` (the new pending version is in `pending`; `effectiveFrom` is the active one) plus `appliesFrom: ISO` | 400 field map, 403 `{ message: "You do not have permission to do this." }` (slice 1 `WORKSPACE_MESSAGES.FORBIDDEN`, no code), 404 |
| E3 | `GET /reporting-periods/current?workspaceId=` | jwt, `requireCaller`, query, `resolveOrNotFound` | `workspaceId` | 200 `ReportingPeriod` | 400, 404 |
| E4 | `GET /reporting-periods/open?workspaceId=` | same as E3 | `workspaceId` | 200 `ReportingPeriod[]`, oldest `dueAt` first, always containing at least the current period | 400, 404 |
| E5 | `GET /reports/draft?periodId=` | jwt, `requireCaller`, query, period load and `resolveOrNotFound`, author role check | `periodId` | 200 `ReportDraft` only when the caller's live report for the period has `submission_status = 'draft'`, else 200 `null` (none, or already submitted: find that one through E8 with `periodId`) | 400, 403 `ADMIN_CANNOT_AUTHOR`, 404, 409 `NO_SPACE` |
| E6 | `PATCH /reports/draft` | jwt, `requireCaller`, body, period load and `resolveOrNotFound`, then the ordered checks | `draftBody` | 200 `ReportDraft` | 400 field map, 403 `ADMIN_CANNOT_AUTHOR` or `WORKSPACE_READ_ONLY`, 404, 409 `NO_SPACE`, `PERIOD_CLOSED`, `PERIOD_NOT_OPEN`, `ALREADY_SUBMITTED` |
| E7 | `POST /reports/:id/submit` | jwt, `requireCaller`, params, `ReportAccess.load`, then the ordered checks | no body | 200 `Report` | 400 field map (accomplishments), 403 `NOT_AUTHOR`, `ADMIN_CANNOT_AUTHOR` or `WORKSPACE_READ_ONLY`, 404, 409 `ALREADY_SUBMITTED`, `PERIOD_CLOSED` |
| E8 | `GET /reports?workspaceId=&periodId=&status=&limit=&offset=` | jwt, `requireCaller`, query, `resolveOrNotFound` | see query table | 200 `Report[]`, or `ReportDraft[]` when `status=draft` | 400, 404 |
| E9 | `GET /reports/:id` | jwt, `requireCaller`, params, `ReportAccess.assertRead` | none | 200 `Report` | 404 |
| E10 | `PATCH /reports/:id` | jwt, `requireCaller`, params, body, `ReportAccess.assertEdit` | `editBody` | 200 `Report` | 400 field map, 403 `NOT_AUTHOR`, `ADMIN_CANNOT_AUTHOR`, `WORKSPACE_READ_ONLY`, `REPORT_APPROVED`, `EDIT_WINDOW_CLOSED`, 404, 409 `NOT_SUBMITTED` (validated first, so the 403 and 409 come after the body passes Zod, see D30) |
| E11 | `DELETE /reports/:id` | jwt, `requireCaller`, params, `ReportAccess.assertDelete` | none | 204 with no body | 403 `NOT_AUTHOR`, `REPORT_SEEN`, 404 |

Why E5 and E6 have no `:id`: a person starts a draft by period, not by report id. The Workspace comes from the period row.

Exact examples:
- E1/E2 success `data`: `{ "cadence": "weekly", "weekday": "Monday", "time": "17:00", "timeZone": "Africa/Lagos", "dayOfMonth": null, "lastDay": false, "effectiveFrom": null, "pending": null }`. E2 success with an assumed now of Wednesday 28 October 2026 12:00 Africa/Lagos (the weekly Monday week of 26 October is running) adds `"appliesFrom": "2026-11-01T23:00:00.000Z"` (Monday 2 November 00:00 local, UTC+1) and returns `"pending": { ...new fields, "effectiveFrom": "2026-11-01T23:00:00.000Z" }`.
- E4 at that same assumed now (Wednesday 28 October 2026 12:00 Lagos, default Schedule): `data: [{ "id": "41", "label": "Week of 19 October", "startsAt": "2026-10-18T23:00:00.000Z", "endsAt": "2026-10-25T22:59:59.000Z", "dueAt": "2026-10-26T16:00:00.000Z" }, { "id": "42", "label": "Week of 26 October", "startsAt": "2026-10-25T23:00:00.000Z", "endsAt": "2026-11-01T22:59:59.000Z", "dueAt": "2026-11-02T16:00:00.000Z" }]`. The week of 19 October is still open because 28 October is before its `dueAt + 168 hours` (2 November 16:00Z).
- E3 `data`: `{ "id": "41", "label": "Week of 19 October", "startsAt": "2026-10-18T23:00:00.000Z", "endsAt": "2026-10-25T22:59:59.000Z", "dueAt": "2026-10-26T16:00:00.000Z" }` (Africa/Lagos, UTC+1).
- E5 empty: `data: null` with 200.
- E7 success `data`: the full `Report` with `submissionStatus` `"submitted"` or `"late"`, `reviewStatus: "pending"`, `submittedAt` set, one `submitted` event, `revisions: []`, `comments: []`.
- Coded error body: `{ "timestamp": "...", "status": 403, "success": false, "error": { "message": "This report is approved and cannot be edited.", "code": "REPORT_APPROVED" } }`.
- Field error body: `{ "timestamp": "...", "status": 400, "success": false, "error": { "accomplishments": "Write at least 50 characters." } }`. Nested: `{ "kpis.2.value": "Enter a number." }`. Unknown key: `{ "authorMembershipId": "This field is not accepted." }`.
- 404 (E3 to E11): `{ "timestamp": "...", "status": 404, "success": false, "error": { "message": "Not found." } }`. 404 (E1, E2): message "Workspace not found.".
- 500: `{ "timestamp": "...", "status": 500, "success": false, "error": { "message": "Something went wrong. Try again." } }`.

### Input validation
Bodies are `z.looseObject({...}).superRefine(rejectUnknownKeys)` (see Conventions), so an unknown key is a 400 whose field key is the unknown key name. Trim does not apply to HTML sections. Every id is `idString`.

`scheduleBody` (E2)
| Field | Required | Type and limits | On failure |
|---|---|---|---|
| `cadence` | yes | enum of five | 400 `cadence` |
| `weekday` | when cadence is weekly or fortnightly | one of `Monday` to `Sunday` (English, as the frontend sends). Ignored and stored as null for other cadences | 400 `weekday` |
| `time` | yes | `TIME_RE`, an HH:MM pattern from 00:00 to 23:59 (exact text under the `reports` table in Data) | 400 `time` |
| `timeZone` | yes | IANA name accepted by `Intl.DateTimeFormat`, max 64 chars. Reuses the `timeZone` refinement in `workspace.schema.ts`, which this change exports (it is a non-exported `const` today) | 400 `timeZone` |
| `dayOfMonth` | when cadence is monthly or quarterly and `lastDay` is false | integer 1 to 31. For daily, weekly and fortnightly it is ignored and stored as null. When `lastDay` is true for monthly or quarterly, a sent `dayOfMonth` is ignored and stored as null (the CHECK allows it) | 400 `dayOfMonth` |
| `lastDay` | no, default false | boolean. For daily, weekly and fortnightly it is ignored and stored as false | 400 `lastDay` |
| `anchor_date` (not a body field) | not accepted | derived by the server for fortnightly (D6), null otherwise. Sending it is an unknown key | 400 `anchor_date` |

`draftBody` (E6). Only `periodId` is required. A provided content field replaces that field. Omitted fields are unchanged (or empty on first insert).
| Field | Required | Type and limits | On failure |
|---|---|---|---|
| `periodId` | yes | `idString` | 400 `periodId` |
| `accomplishments`, `challenges`, `plans` | no | string, at most 20000 characters of raw HTML (Zod, 400 on the field). After sanitising, `visibleTextLength` (D27) at most 5000 (`SECTION_MAX`), checked in the service | 400 with that field name |
| `kpis` | no | array of at most 30 `{ name: string 1..80, value: finite number with absolute value at most 1e12, or null }`. Extra keys such as `unit` are accepted and ignored | 400 `kpis` (too long) or `kpis.<i>.name`, `kpis.<i>.value` |
| `attachments` | no | array of at most 10 `{ name: string 1..255, size: integer 0..10485760, type: string 0..100 }`. `uploaded` is ignored | 400 `attachments` or `attachments.<i>.<field>` |
| `taggedMembershipIds` | no | array of at most 5 distinct `idString`, each an active Membership of this Workspace and not the author (service check, error keyed `taggedMembershipIds`) | 400 `taggedMembershipIds` or `taggedMembershipIds.<i>` for a shape error |
| `location` | no | `null`, or `{ latitude: -90..90, longitude: -180..180, accuracy: >= 0 }`, all finite numbers | 400 `location` or `location.<field>` |

`editBody` (E10) is `draftBody` without `periodId`, with at least one key required. The content rule: after sanitising, `accomplishments` visible text of the resulting report must be at least 50 characters (the stored value when the field is not sent). Failure is 400 `accomplishments`.

E7 submit rule: resulting `accomplishments` visible text at least 50 characters (`ACCOMPLISHMENTS_MIN`), read from the row locked in the submit transaction, else 400 `{ "accomplishments": "Write at least 50 characters." }`. Nothing else blocks a submit.

E8 query: `workspaceId` required `idString`, `periodId` optional `idString`, `status` optional and only `draft`, `limit` integer 1..100 default 50, `offset` integer >= 0 default 0, else 400 with the field name. The default returns the caller's own non-draft, non-deleted reports ordered by `submitted_at` descending then `id` descending, including an Admin's own reports from when they held another role (the relation is `author`, same as E9). `status=draft` returns the caller's own drafts ordered by `updated_at` descending. An Admin with no authored reports gets `[]`. Loading is batched: one query for the page of reports, one `IN (...)` query for revisions and one for events (no N+1), and the result is assembled in memory.

E3, E4 query: `workspaceId` required `idString`. E5 query: `periodId` required `idString`.

### Order of checks (binding, each adjacent pair has a test)
Zod shape errors (types, lengths, unknown keys, ids) come first on every route and give 400. Then:
- E6: 1 period load and `resolveOrNotFound` (404) > 2 `ADMIN_CANNOT_AUTHOR` (403) > 3 `NO_SPACE` (409) > 4 `WORKSPACE_READ_ONLY` (403) > 5 `PERIOD_NOT_OPEN` (409, only reachable by seeding a future period, because periods that have not started are never created, so it is a defensive check kept in the service and tested with SQL seeding) > 6 `PERIOD_CLOSED` (409) > 7 content checks in the service: sanitise, visible length, tag membership (400) > 8 in the transaction, `ALREADY_SUBMITTED` (409) from the locked row.
- E7: 1 `ReportAccess.load` (404) > 2 `NOT_AUTHOR` (403) > 3 `ADMIN_CANNOT_AUTHOR` (403) > 4 `WORKSPACE_READ_ONLY` (403) > 5 in the transaction on the locked row: `ALREADY_SUBMITTED` (409) > 6 `PERIOD_CLOSED` (409) > 7 accomplishments under 50 characters (400).
- E10: 1 `ReportAccess.load` (404) > 2 `NOT_AUTHOR` (403) > 3 `ADMIN_CANNOT_AUTHOR` (403) > 4 `WORKSPACE_READ_ONLY` (403) > 5 `NOT_SUBMITTED` (409) > 6 `REPORT_APPROVED` (403) > 7 `EDIT_WINDOW_CLOSED` (403) > 8 content checks on the resulting content (400).
- E11: 1 `ReportAccess.load` (404) > 2 `NOT_AUTHOR` (403) > 3 `REPORT_SEEN` (403, also refused when `review_status` is `approved`, which in practice requires a seen report and can only be seeded).
- E5: 1 period load and `resolveOrNotFound` (404) > 2 `ADMIN_CANNOT_AUTHOR` (403) > 3 `NO_SPACE` (409).
Examples that these rules settle: an Admin saving into a closed period gets 403, a read-only Workspace plus a closed period gets 403, 5001 visible characters plus a read-only Workspace gets 403, an Admin who reads a Head's report and submits it gets `NOT_AUTHOR`, a submitted report in a closed period gets `ALREADY_SUBMITTED`, and a 49 character draft in a closed period gets `PERIOD_CLOSED`.

### Guard decisions per route, in words
- E1: any active member reads. E2: Admin only, role comes from the Membership row, never from a token, body or query.
- E3, E4: any active member. E5, E6: caller must hold `staff` or `head`. An `admin` gets 403 `ADMIN_CANNOT_AUTHOR` after the period and Membership check. Role is read from the current Membership row at the time of the request.
- E7, E9, E10, E11: `ReportAccess.load` first, so a non-reader always gets 404 before any role message. The full order is in "Order of checks".
- Row ownership: E7 and E10 and E11 require `report.author_membership_id = caller.membershipId`. A reader who is not the author gets 403 `NOT_AUTHOR`, before any role or state message. A report whose author was later made Admin still has relation `author`, and the author-role check then gives `ADMIN_CANNOT_AUTHOR` on E7 and E10.

### `ReportAccess` (`src/modules/report/report-access.ts`), the only place access rules live
- `load(userId, reportId)`: loads the non-deleted row, then calls `resolveOrNotFound(userId, report.workspaceId)` from `scope.ts` (D29). It never calls `MembershipService.resolve` directly, so a suspended or deleted person gets 401 here exactly as on E3 to E6 and E8. Missing, deleted, other Workspace, non-member, deactivated: the same 404.
- `relation(caller, report)`: `author` when `caller.membershipId === report.authorMembershipId`. `reviewer` when the report is not a draft and either the caller is the current Head of `report.spaceId` (`spaces.head_membership_id`) and not the author, or the caller's role is `admin` and (the Space has no Head or the author's current role is `head`). Otherwise `none`.
- `assertRead`: draft returns 404 always (D24). Else `author` or `reviewer`, otherwise 404.
- `assertEdit(now)`: relation `none` 404; `reviewer` 403 `NOT_AUTHOR`; caller role `admin` 403 `ADMIN_CANNOT_AUTHOR`; read-only Workspace 403 `WORKSPACE_READ_ONLY`; status `draft` 409 `NOT_SUBMITTED`; then `editState` (D10). Same order as E10 in "Order of checks". The read-only flag comes from loading the `workspaces` row (`Caller` does not carry it).
- `assertSubmit`: relation `none` 404; `reviewer` 403 `NOT_AUTHOR`; caller role `admin` 403 `ADMIN_CANNOT_AUTHOR`; read-only Workspace 403 `WORKSPACE_READ_ONLY`; not a draft 409 `ALREADY_SUBMITTED`. Used by E7; the service then checks `PERIOD_CLOSED` and the 50 character rule on the same locked row (round 3, finding 2).
- `assertDelete`: relation `none` 404; `reviewer` 403 `NOT_AUTHOR`; `first_seen_at` not null or `review_status = 'approved'` 403 `REPORT_SEEN`. Runs under `FOR UPDATE`.
- Submit, edit and delete load the row with `SELECT ... WHERE id = $1 AND deleted_at IS NULL FOR UPDATE` inside their transaction, and every check runs on that locked row, so a concurrent delete gives the same 404 (round 3, finding 4).
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
| Draft save, E5 | Staff or Head Membership with no Space | no until an Admin assigns one | 409 `NO_SPACE` "You are not in a Space yet. Ask an Admin." | none |
| Any write | `DrizzleQueryError`, deadlock, serialization failure | maybe, retry | 500 `{ message: "Something went wrong. Try again." }`, never SQL or bound values (D25) | `console.error` one line: `pgCode`, method, path. Never the error object, body or query |
| PUT schedule | advisory lock wait | yes | the call waits for the lock (no timeout in this slice) | none |

Behaviour:
- Draft save runs in one transaction: (1) `INSERT ... ON CONFLICT (period_id, author_membership_id) WHERE deleted_at IS NULL DO NOTHING` with the empty draft (KPI rows copied from the Space template, `edit_window_minutes` from the Workspace, `space_id` from the caller); (2) `SELECT ... FOR UPDATE` the live row; (3) if `submission_status <> 'draft'`, 409 `ALREADY_SUBMITTED`; (4) merge in the application (KPI values by `name`, other fields replaced when sent); (5) `UPDATE`. The row lock serialises parallel saves, so five parallel saves give one row and none loses another's fields. Needs only `onConflictDoNothing({ target, where })` from Drizzle 0.45.4.
- Submit runs in one transaction: `SELECT ... FOR UPDATE` the report row first, then from that locked row compute `ALREADY_SUBMITTED`, `PERIOD_CLOSED`, late or on time and the 50 character rule, then `UPDATE reports SET submission_status = (late or submitted), submitted_at = now, review_status = 'pending', edit_window_minutes = <workspace> WHERE id = $1`, then insert the `submitted` event and the audit row. A parallel draft save waits on the row lock and then sees a submitted row (409). Concurrency test: a save that shortens accomplishments racing a submit never leaves a submitted report under 50 characters.
- Edit runs in one transaction: `SELECT ... FOR UPDATE`, `assertEdit`, insert the revision with the previous content, update content, set `review_status = 'pending'`, set `window_started_at = NULL`, insert the `edited` event and the audit row.
- Sanitising runs on every write of the three text sections before the visible-text length check.
- Period materialising: read the period first; only when it does not exist, open a transaction holding `pg_advisory_xact_lock(PERIOD_LOCK_CLASS, workspaceId)` (D31), re-read, then `INSERT ... ON CONFLICT (workspace_id, starts_at) DO NOTHING` and `SELECT`. The same lock covers lazy creation of the baseline schedule row (`ensureBaseline`) and `PUT schedule`. A period whose `startsAt` is in the future is never created.
- PUT schedule: under the lock, `ensureBaseline`, compute `effective_from = nextPeriodStart(now)` (the first boundary of the active version strictly after `now`), delete any pending row (`effective_from > now`), insert the new row, write the `schedule.change` audit row, return `ApiSchedule` with `pending` set and `appliesFrom`. A change never edits an existing period.
- `ensureBaseline(tx, workspaceId)`: inserts the baseline row (`effective_from` 1970-01-01, weekly, Monday, 17:00, the current `workspaces.time_zone`) with `ON CONFLICT (workspace_id, effective_from) DO NOTHING`. It never takes a lock itself: the caller already holds the period lock (D31). It runs on the first period creation, on PUT schedule, and inside the slice 1 `WorkspaceService.update` transaction before a new `time_zone` is written, where the order is `lockPeriods(tx, workspaceId)`, then `lockWorkspace`, then `ensureBaseline` (D26, D31).
- GET schedule writes nothing. With no row it returns the default built from `workspaces.time_zone`.

### Pure calendar module (`src/modules/schedule/period-calendar.ts`)
Names are binding so tests and services agree.
- `civilToInstant(dateISO, hhmm, tz): Date`. A time in a spring-forward gap resolves to the first local time after the gap (not shifted by the gap length): 02:30 on 2027-03-14 in America/New_York gives 03:00 local, `2027-03-14T07:00:00Z`; midnight on a Cairo date that skips 00:00 gives 01:00 local. An ambiguous time (fall-back) resolves to the earlier occurrence.
- `boundaryDates(version, anchor)`: next and previous boundary civil dates (D6) with plain `Date.UTC` day arithmetic.
- `periodContaining(instant, versions)`, `currentPeriod(now, versions)` (D7), `openPeriods(now, versions)` (D8, walk back at most 40 periods), `nextPeriodStart(now, versions)`.
- `label(period, tz)`: weekly "Week of 19 October", fortnightly "Fortnight of 19 October", daily "Monday 19 October", monthly "October 2026", quarterly "Quarter starting 1 October 2026". `Intl` with `en-GB` in the Schedule time zone. No em dash. Every label uses the period's local start date in the Schedule time zone, so a stub is labelled by where it starts: a weekly stub starting Monday 2 November is "Week of 2 November", a fortnightly one "Fortnight of 2 November", a daily one "Monday 2 November", a monthly one starting 15 October is "October 2026", and a quarterly one starting 2 November is "Quarter starting 2 November 2026". Tested with one stub label per cadence.
- `periodContaining` picks the latest version with `effective_from <= instant`. The previous version's last period ends exactly at the new version's `effective_from`, which is always a boundary of the previous version, so no existing period is cut short. The new version's first period is a stub when `effective_from` is not a boundary of the new rule (D6).

### Sanitiser (`report-sanitizer.ts`)
`sanitize-html` options, all explicit:
- `allowedTags`: `p br strong b em i u s code pre blockquote ul ol li h1 h2 h3 h4 h5 h6 hr a`. Tiptap `StarterKit` 3.31.3 (installed in the frontend) emits `h1` to `h6`, `Link` and `Underline`, so the list covers them and a round trip loses nothing. The editor is not capped.
- `allowedAttributes`: `{ a: ["href", "target", "rel"] }`. Nothing else, so no `style`, `class`, `on*`, `id`.
- `allowedSchemes: ["http", "https", "mailto"]`, `allowedSchemesAppliedToAttributes: ["href"]`, `allowProtocolRelative: false`.
- `transformTags: { a: forceLinkAttributes }` sets `target="_blank"` and `rel="noopener noreferrer"`, replacing any value the input carried.
- Href rule: in `sanitize-html` the transform runs before attribute and scheme filtering, so `forceLinkAttributes` sees the raw `href`. It drops the `href` unless it starts with `http:`, `https:` or `mailto:` (case-insensitive, no leading whitespace allowed), which removes relative (`/x`, `x/y`, `#a`), protocol-relative (`//host`) and obfuscated values. The `allowedSchemes` filter then runs as a second layer. The AC21 cases are the proof of the combination.
- `disallowedTagsMode: "discard"` with `nonTextTags: ["script", "style", "textarea", "option"]`, so those elements lose their contents and every other disallowed tag (`img`, `svg`, `iframe`) is dropped with its text kept.
- Input over 20000 characters is refused before parsing (400 on the field).
- Test cases: `/relative`, `//evil.example`, ` javascript:alert(1)` with leading whitespace, `JaVaScRiPt:`, `&#106;avascript:`, `data:text/html,x`, `mailto:a@example.com` kept, `https://example.com` kept with forced attributes, `<a href="https://example.com" target="_self" rel="opener">` rewritten, `<h5>` and `<h6>` kept, `<img onerror=...>` removed.
Exports `sanitizeReportHtml(html)`, `htmlToText(html)` and `visibleTextLength(html)` (D27).

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
| `workspace_schedules` | `id` integer identity PK; `workspace_id` integer NOT NULL; `cadence` schedule_cadence NOT NULL; `weekday` varchar(9) NULL; `time_of_day` char(5) NOT NULL; `time_zone` varchar(64) NOT NULL; `day_of_month` smallint NULL; `last_day` boolean NOT NULL DEFAULT false; `anchor_date` date NULL; `effective_from` timestamptz NOT NULL; `created_by_membership_id` integer NULL; `created_at`, `updated_at` timestamp NOT NULL DEFAULT now() | FK `workspace_id` to `workspaces(id)` ON DELETE CASCADE. FK `created_by_membership_id` to `memberships(id)` ON DELETE SET NULL. UNIQUE `(workspace_id, effective_from)`. CHECK `time_of_day` matches the HH:MM pattern `TIME_RE` (given under the table). CHECK `day_of_month BETWEEN 1 AND 31`. CHECK weekday not null when cadence is weekly or fortnightly. CHECK `anchor_date` not null when cadence is fortnightly. CHECK `day_of_month` not null or `last_day` when cadence is monthly or quarterly |
| `reporting_periods` | `id` identity PK; `workspace_id` integer NOT NULL; `label` varchar(80) NOT NULL; `starts_at`, `ends_at`, `due_at` timestamptz NOT NULL; `created_at`, `updated_at` | FK `workspace_id` ON DELETE CASCADE. UNIQUE `(workspace_id, starts_at)`. Index `(workspace_id, due_at)`. CHECK `starts_at < ends_at AND ends_at < due_at` |
| `reports` | `id` identity PK; `workspace_id`, `period_id`, `author_membership_id`, `space_id` integer NOT NULL; `accomplishments`, `challenges`, `plans` text NOT NULL DEFAULT ''; `kpis` jsonb NOT NULL DEFAULT '[]'; `attachments` jsonb NOT NULL DEFAULT '[]'; `tagged_membership_ids` integer[] NOT NULL DEFAULT '{}'; `location` jsonb NULL; `submission_status` report_submission_status NOT NULL DEFAULT 'draft'; `review_status` report_review_status NOT NULL DEFAULT 'pending'; `submitted_at`, `first_seen_at`, `window_started_at` timestamptz NULL; `edit_window_minutes` integer NOT NULL DEFAULT 30; `deleted_at` timestamp NULL; `created_at`, `updated_at` | FKs: `workspace_id` to `workspaces` and `period_id` to `reporting_periods` (RESTRICT), `author_membership_id` to `memberships` (RESTRICT), `space_id` to `spaces` (RESTRICT). UNIQUE partial index `(period_id, author_membership_id) WHERE deleted_at IS NULL`. Indexes `(workspace_id, period_id, space_id)` and `(author_membership_id, period_id)`. CHECK `(submission_status = 'draft') = (submitted_at IS NULL)`. CHECK `edit_window_minutes BETWEEN 1 AND 10080` |
| `report_revisions` | `id` identity PK; `report_id` integer NOT NULL; `previous` jsonb NOT NULL; `created_at` timestamptz NOT NULL DEFAULT now() | FK `report_id` to `reports(id)` ON DELETE CASCADE. Index `(report_id)` |
| `report_events` | `id` identity PK; `report_id` integer NOT NULL; `kind` report_event_kind NOT NULL; `actor_membership_id` integer NOT NULL; `created_at` timestamptz NOT NULL DEFAULT now() | FK `report_id` ON DELETE CASCADE. FK `actor_membership_id` to `memberships(id)` ON DELETE RESTRICT (memberships are never hard deleted, so the wire type `actorMembershipId: string` is always set). Index `(report_id, created_at)` |

`TIME_RE`, exactly as written in the SQL file and in `schedule.schema.ts` (no backslash anywhere, there is none in the pattern; the pipe is alternation):
```
^([01][0-9]|2[0-3]):[0-5][0-9]$
```
SQL: `CHECK (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')`. The baseline row is inserted with `effective_from` equal to the literal `'1970-01-01T00:00:00Z'`.

Indexes use `CREATE [UNIQUE] INDEX IF NOT EXISTS`. Foreign keys and CHECKs are added in guarded `DO $$ BEGIN ALTER TABLE ... ADD CONSTRAINT ...; EXCEPTION WHEN duplicate_object THEN NULL; END $$;` blocks, as `0001` does. The migration runner also swallows 42710, 42P07, 42P16, 42701 and 42704, but no statement may rely on that. A test applies the file twice through `applyMigration` (which has no catch) and expects no error.

Why `reports.deleted_at` is `timestamp` and not `timestamptz`: it must match the `softDelete` helper that `RelationalRepository` reads. It is never compared with `now()` across zones.

Hash stability: the runner records each file by the hash of its contents. Windows `core.autocrlf=true` can rewrite the file to CRLF on checkout and change the hash, which runs the file once more. That is harmless only because every statement is idempotent, and the test proves it. No `.gitattributes` in this slice (config churn). Backlog line, same as slice 1. Before `npm run migrate`: print `NODE_ENV` and confirm the database is the local Docker `app-db` on host port 5434 (never print `.env*`). The second `npm run migrate` must apply 0 files.

Models (same change, comment `/* @info - Mirrors src/db/migrations/0002_reports.sql. The SQL file is what runs. */`):
- New `src/modules/schedule/schedule.model.ts`: `workspaceSchedules`, `reportingPeriods`, `scheduleCadence`.
- New `src/modules/report/report.model.ts`: `reports`, `reportRevisions`, `reportEvents`, the three report enums.
- Edit `src/modules/workspace/workspace.model.ts`: `editWindowMinutes`.
- Add the table names to `TableNames` and export the new models from `src/db/postgres.schema.ts`.
- `npm run check:circular` must show only the known `user.model <-> user-role.model` cycle, so the new models use `references(() => ...)` the way `space.model.ts` does, or SQL-only foreign keys, and never import `membership.model` in a loop.
- Other backend files edited: `src/errors/CodedConflict.ts` (new), `src/middlewares/error.ts` (two branches, D25), `src/modules/workspace/workspace.service.ts` (when `timeZone` is sent: `lockPeriods`, then `lockWorkspace`, then `ensureBaseline` in `update`, D26 and D31), `src/modules/workspace/workspace.schema.ts` (export `timeZone`), `src/modules/schedule/schedule.constants.ts` (`PERIOD_LOCK_CLASS`, `TIME_RE`), `src/modules/report/scope.ts` (`resolveOrNotFound`).
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
| A period never moves when a time zone changes | `ensureBaseline` in the Workspace update transaction, and the Schedule row owning the zone (D26) | The Workspace PATCH is the only other writer of a zone |
| Submitted reports have at least 50 visible characters | Submit transaction on the `FOR UPDATE` locked row | A parallel save cannot slip below the minimum |
| No SQL or bound value in any response or log | `error.ts` `DrizzleQueryError` branch (D25) | One handler covers every route |
| Server and browser count text the same | Shared fixture of cases run by both test suites (D27) | Only a test can keep two copies equal |

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
- `src/lib/api-types.ts`: add `ApiSchedule`, `ApiScheduleSaved`, `CODE_NO_SPACE` and the code constants `CODE_PERIOD_CLOSED`, `CODE_PERIOD_NOT_OPEN`, `CODE_EDIT_WINDOW_CLOSED`, `CODE_REPORT_APPROVED`, `CODE_REPORT_SEEN`, `CODE_WORKSPACE_READ_ONLY`, `CODE_ALREADY_SUBMITTED`, `CODE_NOT_SUBMITTED`, `CODE_NOT_AUTHOR`, `CODE_ADMIN_CANNOT_AUTHOR` next to the two existing ones.
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
- Colleague picker source is the live `GET /workspaces/:wsId/members` call from slice 1 (`listMembers` in `src/lib/members.ts`), not `COLLEAGUES`; the picker lists active members other than the caller and sends their Membership ids. A 400 key starting `taggedMembershipIds` shows beside the picker. 409 `NO_SPACE` shows "You are not in a Space yet. Ask an Admin." and disables Submit.
- Field errors: the screen maps a key to a field by its first dotted segment (`kpis.2.value` goes to the KPI field, row 2).
- Edit mode (opened from a report page): uses `editReport`. 403 `EDIT_WINDOW_CLOSED` and `REPORT_APPROVED` replace the Save button with the message. `NOT_SUBMITTED` reloads.
- The `localStorage` draft backup is dropped. The server draft is the only source. `ALREADY_SUBMITTED` (and an E5 answer of `null` after submit) reloads through `listMyReports(workspaceId, { periodId })` and shows that report.

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
- A midnight gap zone (Africa/Cairo around the last Friday of April, where local 00:00 does not exist). The installed Node 22 ICU has Cairo daylight saving (the review checked: 24 April 2026 22:30Z formats as 01:30 GMT+03:00). The test asserts that local 00:00 resolves to 01:00.
- A due date just before a DST change: the 7 day grace closes after exactly 168 hours.
- Schedule change: the pending version starts a new period at the old boundary and old periods are untouched. Stub cases from D6: Monday to Friday weekly, weekly to fortnightly Friday, Lagos to Cairo zone change, monthly day 31 to quarterly.
- Order of checks: one integration test per adjacent pair in "Order of checks" (E6, E7, E10, E11).
- Sentinel test (D25): the test adds a temporary `CHECK (accomplishments NOT LIKE '%SENTINEL%')` on `reports` through SQL, sends a draft save whose body carries `SENTINEL`, and drops the constraint in `afterEach`. The response body and every captured `console` line must not contain the sentinel, and the one logged line holds only `pgCode`, method and path.
- Lock order race (D31): a Workspace update that sends a new `timeZone` racing ten `current` requests and one PUT schedule finishes with no 500 and no deadlock.
- Suspended or deleted person (AC13): one test per route family, E3 to E6 and E7 to E11, with a suspended user, each answering 401 (E7 and E9 to E11 go through `ReportAccess.load`).
- Stub labels: one stub label test per cadence (D6, `label`).
- KPI template with two rows of the same name: the value goes to the first row (D13).
- Current period with a stub shorter than a day and an older version whose due time is later (D7): the earliest period with `dueAt >= now` wins.
- Concurrency tests: five parallel draft saves give one row; a draft save racing a submit never leaves a submitted report under 50 characters.
- Shared text cases (D27): the same `report-text.cases.json` runs in `tests/report-sanitizer.test.ts` and `scripts/report-draft.test.ts`.
- `PERIOD_NOT_OPEN` and `PERIOD_CLOSED` need SQL seeding of a period (a future period cannot be created through the API).

## Assumptions (design review please check)
- A1: every edit clears `window_started_at` (D10).
- A2: fortnightly periods count from `anchor_date`, the first date on the version's weekday on or after the local date of its `effective_from` in its own zone (D6). The first period of any new version is a stub that starts at `effective_from`.
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
- One `INSERT ... ON CONFLICT DO UPDATE` statement for the draft: it cannot merge KPI values by name without hand-written jsonb SQL, and reading first then writing back loses a parallel save. Rejected for insert-do-nothing, `SELECT ... FOR UPDATE`, merge in the application, `UPDATE`, in one transaction, where the row lock closes the gap.
- Changing `ZodEngine` to name unknown keys or nested paths: it is shared by every route. Rejected for `looseObject` plus `superRefine` per body.
- Refusing a Workspace `time_zone` change after a Schedule exists: needs a new 409 in slice 1 and a new screen state. Rejected for `ensureBaseline` before the write (D26).
- A schedule change that starts at the next boundary of the new rule, with no stub: would leave a gap with no period or move `appliesFrom` away from "the next period". Rejected for the stub rule (D6).
- Capping Tiptap heading levels to 3: touches a component the change otherwise leaves alone. Rejected for allowing `h1` to `h6`.

## Order of work
1. OpenSpec change validates and is approved (migration, permissions and a dependency are approval triggers, pre-approved by the owner).
2. Backend, additive and deployed first: migration `0002_reports.sql` and models, then `period-calendar.ts`, sanitiser, schedule module, report module with `ReportAccess`. Each step has its tests red first on the real test Postgres.
3. Run `npm run migrate` against the local database only, twice, second run applies 0 files.
4. Frontend: types and API modules with tests, then Submit, My reports, detail, Settings.
5. Gate 3 in both repos, review, live check against `http://localhost:5000`.
Backward compatibility: every change is additive (new tables, a column with a default, new endpoints, a new coded error class). The frontend deploys after the backend. An old frontend ignores the new endpoints and keeps working.

## Acceptance checks
- AC1: A member reading the Schedule of a Workspace with no row gets weekly, Monday, 17:00 and the Workspace time zone, and no row is written.
- AC2: An Admin PUT of a valid Schedule returns 200 with `appliesFrom` equal to the first boundary after now (at Wednesday 28 October 2026 12:00 in Africa/Lagos: `2026-11-01T23:00:00.000Z`). A Staff or Head PUT returns 403 `{ message }` whatever the body, and changes nothing. A non-member gets 404 "Workspace not found.".
- AC3: PUT with a bad `time`, `timeZone`, missing `weekday` for weekly, or missing day for monthly returns 400 with that field name. An unknown key such as `anchor_date` is 400 with that key name. `dayOfMonth` is stored null and `lastDay` false for daily, weekly and fortnightly.
- AC4: After a Schedule change, the existing period keeps its `startsAt`, `endsAt` and `dueAt`. The first period of the new version starts at `appliesFrom` and ends at the first boundary of the new rule after it (stub), and every later period is a full one (the D6 worked examples are tests). Every label uses the period's local start date, with one stub label test per cadence.
- AC5: Period generation matches the hand computed instants for all five cadences in Africa/Lagos, including monthly clamping, last day and quarterly rollover.
- AC6: Period generation is correct across the America/New_York and Europe/London changes and for a gap and an ambiguous local time, and the `civilToInstant` rules hold: 02:30 on 2027-03-14 in America/New_York is `2027-03-14T07:00:00Z` (03:00 local), 00:00 on a Cairo gap date is 01:00 local, 01:30 on a fall-back date is the earlier instant.
- AC7: With the default Schedule in Africa/Lagos, the current period is the week of 19 October at Monday 26 October 2026 15:30 and at exactly 17:00:00.000 local, and the week of 26 October at 17:00:00.001 and 17:01. With a stub shorter than a day after a version change, the current period is still the earliest period whose `dueAt >= now`.
- AC8: Ten parallel `current` requests store one period.
- AC9: `open` lists periods with `startsAt <= now <= dueAt + 168 hours`, oldest first, never a period that has not started, and never a period that ended before the Workspace was created (the current period excepted).
- AC10: Five parallel draft saves for one person and period leave one row. A second save updates it. A save after submit is 409 `ALREADY_SUBMITTED`.
- AC11: A draft save by an Admin is 403 `ADMIN_CANNOT_AUTHOR`. In a read-only Workspace a save, submit or edit is 403 `WORKSPACE_READ_ONLY` and a delete works.
- AC12: Another member's draft is 404 by id, absent from their lists, and `GET /reports/draft` returns only the caller's own.
- AC13: On E3 to E11, a report or period id from another Workspace, a deleted report, a non-member and a deactivated member all return the identical 404 body `Not found.`. A suspended or deleted person gets 401 on every new route, E7 and E9 to E11 included (`ReportAccess.load` goes through `resolveOrNotFound`), tested with one suspended user per route family. An id of `2147483648` is 400 `Invalid id.` on every route.
- AC14: Submit at `dueAt` is `submitted`. One second later is `late`. At `dueAt + 7 days` it is accepted. One second after that it is 409 `PERIOD_CLOSED`. Before `startsAt` a draft save is 409 `PERIOD_NOT_OPEN` (tested with a period row seeded by SQL, since the API never creates one). A draft survives the deadline.
- AC15: Submit with under 50 characters of accomplishments is 400 on `accomplishments`. A second submit is 409 `ALREADY_SUBMITTED`.
- AC16: The KPI rows of a report do not change when the Space template changes later. An unknown KPI name is ignored. A value of 0 is stored as 0. With two template rows of the same name, the value goes to the first one.
- AC17: Edit rules: unseen editable; seen at 10 minutes editable; seen at 31 minutes 403 `EDIT_WINDOW_CLOSED`; rejected always editable; approved 403 `REPORT_APPROVED`; a draft through the edit route 409 `NOT_SUBMITTED`.
- AC18: Each edit adds one revision holding the previous content and one `edited` event, sets the report to pending, clears `windowStartedAt`, and keeps the submission status.
- AC19: Delete: author with unseen report is 204 then 404; seen is 403 `REPORT_SEEN`; a reviewer is 403 `NOT_AUTHOR`; after delete a new draft for the period can be saved.
- AC20: Reads: Head reads a Staff report in their Space and not another Space's; Admin reads a Head's report; Admin reads a Staff report only when the Space has no Head; nobody but the author reads a draft; a tagged colleague who is not a reviewer gets 404.
- AC21: Sanitiser: script with contents, `onerror`, `onclick`, `javascript:` and `data:` hrefs, `style`, `iframe`, `svg` and `img` are removed. Bold, lists and https links are kept. Relative (`/relative`), protocol-relative (`//evil.example`), ` javascript:` with leading whitespace, `JaVaScRiPt:` and `&#106;avascript:` hrefs lose the `href`. `h1` to `h6` are kept. Links carry `rel="noopener noreferrer"` and `target="_blank"` whatever the input said. Sanitising twice equals once. Input over 20000 characters is 400. This holds through every write route.
- AC22: Visible text (D27) over 5000 characters is 400. An unknown body key is 400 with that key as the field name (for example `authorMembershipId`). Nested errors use the dotted key (`kpis.2.value`, `location.latitude`, `attachments.0.size`). A tag outside the Workspace, a self tag, more than 5 tags, a bad location and more than 30 KPI rows or 10 attachments are 400 on the right key. The shared text cases give the same counts in the backend and the frontend (`<p>a &amp; b</p><p>c</p>` is 7).
- AC23: Log capture shows no report text, KPI value, tag or location for any write route. A failing write (CHECK violation) returns 500 `Something went wrong. Try again.` with no SQL and no bound value in the body or in any log line, and the log holds one line with the pg code, method and path only (the sentinel is a temporary CHECK added by the test, see Testability).
- AC24: Migration `0002_reports.sql` applies twice without error, creates the five tables, four enums, the column with default 30 and the partial unique index, and `npm run migrate` the second time applies 0 files. `check:circular` shows only the known cycle.
- AC25: Frontend: `reports-api`, `schedule-api` and `periods` tests pass, including the 204 delete, `code` and `fieldErrors` mapping and the `SIMULATED_AUTH` refusal. `npx tsc --noEmit` and `npm run build` pass.
- AC26: Browser: Submit report shows loading, autosave states, a field error, the late state, the closed state and the Admin state. My reports shows empty, error and list. Settings saves a schedule as Admin and is read-only as Staff. Marked "not verified" if no browser is available.
- AC27: No new dependency except `sanitize-html` and `@types/sanitize-html`. `rg -n "[\u2014\u2013]"` on touched files shows no user-facing hit.
- AC28: Order of checks: each adjacent pair in E6, E7, E10 and E11 returns the earlier answer when both conditions hold (for example an Admin saving into a closed period is 403 `ADMIN_CANNOT_AUTHOR`, a submitted report in a closed period is 409 `ALREADY_SUBMITTED`, a Head editing a Staff report is 403 `NOT_AUTHOR`).
- AC29: Time zone owner: changing `workspaces.time_zone` through slice 1 after the first period exists leaves every stored period and the Schedule zone unchanged, and a change before any period exists writes no Schedule row, so the default follows the new zone. A Workspace update that sends a new `timeZone` racing ten `current` requests and one PUT schedule ends with no 500 (the advisory lock is taken before the Workspace row lock, D31).
- AC30: E5 returns `null` when the caller's live report is submitted, and E8 with that `periodId` returns it. A parallel save and submit never leaves a submitted report under 50 visible characters.
- AC31: A Staff Membership with no Space gets 409 `NO_SPACE` on E5 and E6.

## Backlog (carried out of this slice)
Setting `first_seen_at` and `window_started_at`, review decisions, comments and tasks (review slice); a Settings control for `edit_window_minutes`; gating location on `location_tagging`; real uploads; the Admin visibility rule for Staff reports in Spaces with a Head; My record on real data; `.gitattributes` for migration line endings; rate limiting on autosave; the shared `timestamps` helper makes `created_at` and `updated_at` `timestamp` without time zone (`defaultNow()` uses the session zone while Drizzle reads it as UTC), which `ReportDraft.updatedAt` shows to users, so a later migration should move them to `timestamptz`; `ZodEngine` cannot name unknown keys itself.

## Responses to design review round 1
All 24 findings are addressed in this change. None changes an owner decision (R1 to R4).
1. Addressed: D25 adds a `DrizzleQueryError` branch, generic text, log of request id and pg code only, a sentinel test, `error.ts` listed as a behaviour change (proposal Impact, AC23).
2. Addressed: D30 and "Order of checks" give a total order for E5, E6, E7, E10, E11, AC28 tests each adjacent pair.
3. Addressed: `looseObject` plus `superRefine` for unknown keys, dotted nested keys, frontend maps by first segment, AC22 and examples updated.
4. Addressed: Conventions rewritten. E2 runs the role guard before the body. E3 to E11 validate the body first.
5. Addressed: submit locks the row with `SELECT ... FOR UPDATE` before checks, concurrency test (AC30).
6. Addressed: insert do-nothing, lock, merge, update in one transaction. Rejected-alternatives line fixed.
7. Addressed: D24b, E5 returns the draft only when `draft`, otherwise `null`, the screen uses E8 with `periodId`.
8. Addressed: D27 defines `visibleTextLength`, a shared fixture runs on both sides.
9. Addressed: D28, `idString` everywhere, `2147483648` test (AC13).
10. Addressed: example is `2026-11-01T23:00:00.000Z`, assumed now stated, E4 example added.
11. Addressed: D6 one rule (the first period of a version is a stub from `effective_from`), worked examples, spec scenarios. The spec line "14 days apart" now reads "after the first period". The behaviour owners decided (a change applies from the next period, R1) is unchanged.
12. Addressed: D26 declares the owner, `ensureBaseline` in the Workspace update transaction, AC29.
13. Addressed: D29 and the endpoint table state the real strings and the shared helper for E3 to E11.
14. Addressed: explicit `sanitize-html` options, href rule, new test cases (AC21).
15. Addressed: D7 states `predecessor.dueAt >= now`, AC7 tests 17:00:00.000.
16. Addressed: D31 names `PERIOD_LOCK_CLASS`, when it is taken, and that `lockWorkspace` is not.
17. Addressed: D5, `civilToInstant` and AC6 carry the worked gap examples.
18. Addressed: batched loading in E8.
19. Addressed: allow-list is `h1` to `h6`.
20. Addressed: `PERIOD_NOT_OPEN` stays as a defensive check, tests seed SQL, stated in the table and testability.
21. Addressed: (a) E8 returns the caller's own reports, an Admin included, (b) `assertDelete` also refuses `approved`, (c) `actor_membership_id` is NOT NULL with RESTRICT.
22. Addressed: the picker uses `listMembers`, the `localStorage` backup is dropped.
23. Addressed: the CHECK pattern has no backslash (`TIME_RE`), baseline literal `'1970-01-01T00:00:00Z'`, the timestamp note is in Backlog above.
24. Addressed: `dayOfMonth` null, `lastDay` false, `anchor_date` derived and refused as input.
Unverified items from the review: `onConflictDoUpdate` is no longer used, and a Staff or Head with no Space is a coded 409 `NO_SPACE` (D18).

## Responses to design review round 2
None of the 10 findings changes an owner decision (R1 to R4).
1. Addressed (MEDIUM): D26 and D31 fix one lock order, advisory lock first and Workspace row lock second, taken only by `WorkspaceService.update` when `timeZone` is sent. The "never queues" claim is removed. Race test added (Testability, AC29, BE-4).
2. Addressed (MEDIUM): D25, the error table and AC23 now log one `console.error` line with `pgCode` (existing `pgErrorCode`), method and path. `requestId` is dropped.
3. Addressed (MEDIUM): `ReportAccess.load` calls `resolveOrNotFound`, D19 says the same, AC13 adds a suspended-user test per route family.
4. Addressed (MEDIUM): the `reporting-periods` spec requirement now excepts the first period of a Schedule version. D5 says it, and labels use the local start date of the period with a stub label test per cadence (D6, `label`, AC4).
5. Addressed (LOW): D7 is the earliest period in `openPeriods(now)` with `dueAt >= now`, else the period containing `now`. "One step is enough" is deleted. AC7 and Testability cover a short stub.
6. Addressed (LOW, implementation): D25 and Testability choose the temporary SQL CHECK on `reports`, dropped in `afterEach`.
7. Addressed (LOW): `scheduleBody` ignores `dayOfMonth` and stores null when `lastDay` is true.
8. Addressed (LOW, implementation): the sanitiser text now says the transform sees the raw `href` and the scheme filter is the second layer.
9. Addressed (LOW, implementation): D13 and AC16 say the value goes to the first row with a duplicate name, with a test.
10. Addressed (LOW, implementation): the Decisions table is in order (D1 to D24, D24b, D25 to D31) and AC27 sits before AC28.

## Responses to design review round 3 (resolved in the backend build)
None of the 7 findings changes an owner decision (R1 to R4). Each is built and tested in `reportlee-backend` on `feat/reports`.
1. Addressed (MEDIUM): D26 and AC29. `WorkspaceService.update` writes the baseline only when a period exists. Test: `tests/schedule.test.ts` "lets the default follow a zone corrected before any period exists".
2. Addressed (MEDIUM): `ReportAccess.assertSubmit` (see "ReportAccess"). E7 uses it. Tests: `tests/reports.test.ts` "E7: 404 before NOT_AUTHOR (a stranger to the report)" and the E7 order-of-checks pairs.
3. Addressed (MEDIUM): D8 and AC9, plus a spec scenario. `openPeriods(now, versions, notBefore)` takes `workspaces.created_at`. Tests: `tests/period-calendar.test.ts` "never lists a period that ended before notBefore" and `tests/schedule.test.ts` "does not open a period that ended before the Workspace was created".
4. Addressed (LOW): the locked read filters `deleted_at IS NULL`. Test: "ends a delete racing a submit with no 500".
5. Frontend (LOW): `getDraft` must map `data ?? null`, with a `{ data: null }` case in `scripts/reports-api.test.ts`. This belongs to FE-1. The backend sends `data: null` (tested: "returns null when the caller has no draft").
6. Addressed (LOW): D3. Services set `created_at` and `updated_at` from `now`. Test: the draft shape test asserts `updatedAt` equals the fixed clock.
7. Noted (LOW): an unknown body key named `message` produces `{ message: "This field is not accepted." }`, which the frontend shows as a plain message. This is accepted, because the message still tells the person what is wrong. An empty edit body also uses the key `message` on purpose ("Send at least one field to change.").

## Build notes (backend)
- New error class `src/errors/FieldError.ts` with one branch in `src/middlewares/error.ts`: a service rule (sanitised length, tags, 50 characters) answers 400 with the same flat field map Zod gives. The design named the body shape but not the class.
- `NO_SPACE` cannot happen with today's data: `memberships_admin_space_chk` makes every Staff or Head Membership carry a Space. The check stays as a defensive one. Its test drops that constraint in a `try/finally` and restores it.
- `package-lock.json` holds additions only (+184 lines). The committed lock was written by a newer npm than the local 10.9.8, so the new entries were merged into it rather than letting npm rewrite unrelated fields.
- `npm audit --omit=dev`: 4 high findings, all in packages that were there before (`@dotenvx/dotenvx`, `nodemailer`, `fdir`, `picomatch`). None comes from `sanitize-html` 2.18.2 or its tree (`htmlparser2` 12).
- One Cairo expectation was corrected while writing tests. Egypt keeps summer time until the last Thursday of October (29 October 2026), so Monday 26 October 00:00 Cairo is `2026-10-25T21:00:00Z`.
