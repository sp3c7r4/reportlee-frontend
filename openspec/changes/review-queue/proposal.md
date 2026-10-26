## Why

Reports reach a reviewer and stop: the Report page says decisions arrive with review, and nothing can
approve, reject or reopen. Without this screen the reporting loop is write-only.

## What Changes

- Add `/dashboard/review`: the queue grouped by period, filter chips, a "Not submitted" tab of hatched rows,
  a checkbox column and a bulk bar.
- Add Approve, Reject with a required reason, and Reopen, each recorded on the Report.
- Apply the scope rules: a Head's own Report is never in that Head's queue, and a Space with no Head sends
  its Reports to Workspace Admins.
- Reopen becomes real here, using the semantics recorded in `my-reports`.
- No new dependency. No backend.

## Capabilities

### New Capabilities

- `review-queue`: who may decide, what a decision needs, how bulk decisions log, how reopen behaves.

### Modified Capabilities

None.

## Impact

- New: `src/components/review/`, `src/app/dashboard/review/page.tsx`, `src/lib/review.ts`,
  `scripts/review.test.ts`.
- Touched: `src/data/reports.ts` for decided samples, `src/lib/reports.ts` for the decision calls.
- Guards recorded, not built: `jwt.validateToken`, role guard, then Space or Workspace scope.
