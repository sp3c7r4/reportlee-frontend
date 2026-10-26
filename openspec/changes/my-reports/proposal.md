## Why

A submitted report currently goes nowhere. The form clears its draft, drops the person on `/dashboard`
with a confirmation, and offers a "View report" button that is disabled because the page does not exist.
The author cannot see what they sent, whether a reviewer has opened it, how long they have left to fix a
typo, or why it came back. This change adds the two screens that answer those questions.

## What Changes

- Extend `src/data/reports.ts` with the submitted `Report` and its `ReportEvent` timeline: submitted,
  edited, seen, approved, rejected, reopened. `ReportDraft` stays the pre-submit shape.
- Add `src/lib/report-view.ts`: the state machine as plain functions. `canEdit`, `canDelete`,
  `primaryAction` and `timelineFor`, each taking the viewer and one sample `now`.
- Add `/dashboard/reports`: the author's table, grouped by Reporting period, with filter chips.
- Add `/dashboard/reports/:id`: the Report page, reading column on the left and a sticky panel on the
  right holding details, the timeline and (later) open tasks.
- Editing reuses the UI-6 form through a one-shot handoff instead of a second editor, and a deleted report
  is hidden on this device because the server that deletes it does not exist yet.
- Turn the submit confirmation's "View report" placeholder into a real link, and give the
  already-submitted state a destination.
- No new dependency. No backend.

## Capabilities

### New Capabilities

- `my-reports`: the author's list and the Report page, the edit and delete rules, the seen and edit-window
  clock, and the timeline.

### Modified Capabilities

None. The link on the confirmation is added as a requirement of this capability rather than as a delta
against `report-submit`, whose change has not been archived yet.

## Impact

- New: `src/lib/report-view.ts`, `src/components/reports/report-table.tsx`,
  `src/components/reports/report-page.tsx`, `src/app/dashboard/reports/page.tsx`,
  `src/app/dashboard/reports/[id]/page.tsx`, `scripts/report-view.test.ts`.
- Touched: `src/data/reports.ts` (new shapes and five sample reports), `src/components/reports/submit-report.tsx`
  (reads a one-shot edit handoff), `src/components/reports/submitted-notice.tsx` (real link),
  `src/lib/reports.ts` (report calls, the edit handoff key, hidden-after-delete key).
- Untouched: `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/cookies.ts`, every permission path.
