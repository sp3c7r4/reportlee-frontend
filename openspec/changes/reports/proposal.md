## Why
Reports are the product's core object and today they exist only as mock arrays and browser storage. A person cannot start a draft that survives a browser change, the deadline is a constant (`SAMPLE_PERIOD`), "late" is decided on the client, and nothing stops a stale tab from editing a locked report. This slice moves the schedule, reporting periods, drafts, submission, editing and deletion to the server, which decides every rule. Slice 1 (`workspaces-people`) already gives the Membership choke point this builds on.

## What Changes
- Add a Workspace Schedule (one active version, plus at most one pending version) with five cadences. New Workspaces default to weekly, period starting Monday, due Monday 17:00 in the Workspace time zone (owner decision R1). A change applies from the next period.
- Add Reporting periods, generated lazily on first request and never edited afterwards. Add an "open periods" read so a late report stays reachable for 7 days after its deadline (R2).
- Add one Report per person per period: autosaved draft, submit (the server decides on time or late), my reports list, report detail, edit and delete.
- Enforce the edit rules (R3) and the KPI snapshot (R4) on the server. Add revisions and an `edited` event on every edit.
- Add `ReportAccess`, one choke point for read, edit and delete, so the review slice reuses it.
- Sanitise report HTML on the server on every write.
- Add 11 endpoints under `/api/v1` (listed in `design.md`) and one migration `0002_reports.sql` (additive: five new tables and one column with a default on `workspaces`).
- Switch the frontend Submit report, My reports, report detail and Settings schedule screens from mock to the API through `src/lib` only.
- **New dependency (backend only):** `sanitize-html` and its types `@types/sanitize-html` (dev). Reason in `design.md` D1. Pre-approved by the owner in the brief on the condition that it is well known and maintained.
- **No BREAKING change.** No existing endpoint or response changes. The only edit to an existing server file that touches behaviour is the error middleware, which gains a branch for a new coded 409 error and a branch that answers a failed database query with a generic 500 message. That second branch changes an existing body: a database failure used to return the SQL text and bound values, and now returns "Something went wrong. Try again.".
- Out of scope: review decisions, the review queue, comments, tasks, marking a report as seen (the columns and the rules that honour them ship now, setting them ships in the review slice), notifications, analytics, search, AI drafting, real file uploads (attachment metadata only) and the My record screen (it needs the roster and analytics).

## Capabilities
### New Capabilities
- `schedule`: the Workspace's reporting rule, its default, who changes it, and when a change takes effect.
- `reporting-periods`: how periods are generated per cadence and time zone, the current period, the open periods and the 7 day grace.
- `reports`: drafts, submission, lateness, editing, revisions, deletion and the KPI snapshot.
- `report-access`: who can read, edit and delete a report, and the identical 404 for anyone who must not know it exists.
- `report-content-safety`: what the server does to report text, tags, attachments and location before storing them.

### Modified Capabilities
None. `openspec/specs/` is empty.

## Impact
- Backend repo `reportlee-backend` (branch `feat/reports`): new modules `schedule` and `report`; `src/errors/CodedConflict.ts`; `src/middlewares/error.ts`; `src/modules/audit/audit-log.service.ts` (four actions); `src/modules/workspace/workspace.model.ts` (one column); `src/modules/workspace/workspace.schema.ts` (export the existing `timeZone` refinement); `src/modules/workspace/workspace.service.ts` (one `ensureBaseline` call before a Workspace time zone is written); `src/routes/router.ts`; `src/db/postgres.schema.ts`; `TableNames`; `src/db/migrations/0002_reports.sql`; `package.json` and the lock file; test helpers and new test files.
- Frontend repo (branch `feat/reports`): new `src/lib/reports-api.ts`, `schedule-api.ts`, `periods.ts`; edits to `src/lib/api-types.ts`, `src/lib/reports.ts`, `src/data/reports.ts` (comment only), `src/components/reports/*`, `src/components/settings/settings-screen.tsx`; new and updated tests in `scripts/`. No new frontend dependency.
- Approval triggers hit: a migration, permissions and role guards, a new dependency. The owner pre-approved R1 to R4, the scope and the sanitizer class in the brief, so no open product question remains. Assumptions the design review should check are listed in `design.md` under "Assumptions".
