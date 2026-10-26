## Why

The shell has one real page (`/dashboard`) and its Submit report button goes nowhere. The first screen
that makes the product do its job is the report form: a person writes accomplishments, challenges and next
plans for the current period, and the network before it needs its own contract. Without this change every
later screen (My reports, the Report page, Review) invents its own idea of what a report is.

## What Changes

- Add the report shapes, once: `ReportingPeriod` and `DraftReport` in `src/data/reports.ts`, reusing
  `SubmissionStatus` from `src/lib/status.ts` rather than declaring a second status vocabulary.
- Add plain draft logic in `src/lib/report-draft.ts`: normalise a KPI row (a blank value is `null`, never
  zero, and a non-numeric value is refused rather than coerced), the per-section length rules, the
  colleague cap, whether a report may be submitted, and the submission status resolved from the deadline
  in the Workspace's timezone.
- Add the submit screen at `/dashboard/reports/new`: one scrolling page of cards, autosaving draft with a
  live save indicator, KPI rows prefilled from the Space template, attachments, colleagues tagged from the
  Membership list, and an optional location that only exists when the Workspace turns location tagging on.
  One primary Submit report, in the header slot; on a phone it sticks above the tab bar.
- Point the top bar's Submit report action and the empty state at that route.
- Sample data only: one period, one KPI template, one already submitted report, so the "you already
  submitted this period" state is reachable. No backend, no database, no file upload, no dependency.
- Wire the screen to the documented API calls that do not exist yet, so the backend swap is the flag in
  `src/lib/auth.ts` pattern rather than a rewrite: the request bodies and expected envelope are written in
  the spec, and every call is answered by a `simulate*` function for now.

## Capabilities

### New Capabilities

- `report-submit`: the draft lifecycle (autosave, one draft per person per period, blank KPIs), the
  deadline rule, attachments and location rules, and the checks that gate submit.

### Modified Capabilities

None. `dashboard-shell` keeps its requirements; this change adds one destination behind the existing
action slot.

## Impact

- New: `src/data/reports.ts`, `src/lib/report-draft.ts`, `src/components/reports/` (form cards, KPI rows,
  attachments, tags, location), `src/app/dashboard/reports/new/page.tsx`, `scripts/report-draft.test.ts`.
- Touched: `src/app/dashboard/page.tsx` (the empty state links to the form), `src/components/dashboard/`
  where the Submit report action needs its href and where Sign out clears this Membership's drafts, and
  `src/data/viewer.ts` for the Workspace's `locationTagging`, `timeZone` and `readOnly` fields.
- No dependency is added. `src/lib/auth.ts`, `src/lib/session.ts` and `src/lib/cookies.ts` are untouched.
- The envelope is fixed by `AGENTS.md` and by the backend's `sendSuccessResponse`:
  `{ timestamp, status, success, data }` on success and `{ timestamp, status, success, error }` on failure.
  Field-level validation stays on the client, so no `error.fields` convention is invented.
