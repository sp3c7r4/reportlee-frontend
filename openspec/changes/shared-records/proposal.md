## Why

Three things are shared by every screen that follows: what a comment is, a record of who changed what, and a
notification that reaches one person. Defining them per screen is how the audit log ends up with holes and how
two screens disagree about a rejection reason. Build order puts them first for that reason.

## What Changes

- Declare `Comment` in `src/data/reports.ts`, including the `decision` kind, so a rejection or reopen reason is
  stored as a comment rather than as a field on the Report.
- Add `src/lib/audit.ts` and `src/lib/events.ts`. Every simulated write in the app appends to the audit log and,
  where a person must be told, to the event stream.
- Add `src/lib/entitlements.ts` with the plan gate: what a plan may use, and how a locked feature appears
  (visible, disabled, with its reason).
- Add `plan` to the sample Workspaces, so gating is reachable without a query parameter or a second build.
- Hidden Reports (older than the plan's retention window) are excluded from lists, search, analytics and the
  Assistant by one function, not by four screens remembering.
- No backend, no dependency, no auth change.

## Capabilities

### New Capabilities

- `record-audit`: the comment shape, the audit log, the event stream and the rule that every simulated write
  records itself.
- `plan-entitlements`: what each plan may use, the disabled-with-reason pattern, and the hidden-Report rule.

### Modified Capabilities

None.

## Impact

- New: `src/lib/audit.ts`, `src/lib/events.ts`, `src/lib/entitlements.ts`, `scripts/audit.test.ts`,
  `scripts/entitlements.test.ts`.
- Touched: `src/data/reports.ts` (the `Comment` shape), `src/data/viewer.ts` (`plan` on every Workspace),
  `src/lib/reports.ts` (every `simulate*` write appends).
- Every later change reads these three modules instead of writing its own.
