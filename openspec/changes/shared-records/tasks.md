## 1. Comment shape (FE)

- [x] 1.1 `Comment` and `CommentKind` in `src/data/reports.ts`, with sample comments on the sample Reports and
      a `decision` comment carrying the existing rejection reason.
- [x] 1.2 Remove the rejection reason from the Report's own fields, so one sentence has one home, and update the
      Report page and the reason helper to read the comment.

## 2. Audit and events (FE)

- [x] 2.1 `scripts/audit.test.ts` red: an entry carries at, actor, action, target and summary; entries are
      returned in order; reading appends nothing; a role change and an edit-after-seen both record.
- [x] 2.2 `src/lib/audit.ts` to green, storing per Membership and cleared with the rest of the report state.
- [x] 2.3 `scripts/events.test.ts` red: a decision produces one event for the author only; a submission routes to
      whoever the queue scope names; a tag produces nothing.
- [x] 2.4 `src/lib/events.ts` to green, reusing the queue scope function.
- [x] 2.5 Every `simulate*` write in `src/lib/reports.ts` appends the matching audit entry.

## 3. Plan gate (FE)

- [x] 3.1 `scripts/entitlements.test.ts` red: the matrix per feature; a locked feature returns a reason naming
      the unlocking plan; Reports export is allowed on every plan; the trial is gated as Team.
- [x] 3.2 `src/lib/entitlements.ts` to green, and `plan` added to every sample Workspace.
- [x] 3.3 `visibleTo(plan, now)` excludes Reports older than the window, with a test for a 45 day old Report.

## 4. Validation (FE)

- [x] 4.1 `npx biome check` on the touched files, compared against the previous copy.
- [x] 4.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [x] 4.3 Confirm the existing screens still render after the comment move, in both themes.
- [x] 4.4 Em dash scan; ROADMAP row; `openspec validate --all --strict`.

## Validation, step 1

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 76 pass, 0 fail (was 58) |
| Red first | the three new suites before their modules existed | `ERR_MODULE_NOT_FOUND` on `src/lib/audit.ts` and `src/lib/entitlements.ts` |
| Build | `npm run build` | compiled in 2.5s, 17/17 pages |
| Lint | `npx biome check` on the touched files | clean |
| Em dashes | `rg -n "[—–]"` on the touched files | none |

Landed: the `Comment` shape with a `decision` kind, the rejection reason moved out of the Report's events into a
decision comment (the banner and the timeline read the same sentence), `src/lib/audit.ts` written by submit, edit
and delete and cleared at sign-out, `src/lib/events.ts` with `reviewersFor` shared by the queue and the
notification, the entitlements matrix with `reportsExport` on every plan and a trial gated as Team, and
`visibleTo` as the one retention rule the list now reads.

Still open in this change: the audit page and notifications page that read these modules (they belong to
`platform-and-polish` and `insight-screens`), and the console's audit-before-read (that capability's own).
