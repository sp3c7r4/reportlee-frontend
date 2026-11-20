## 1. Spec and approval
- [x] 1.1 (FE repo, docs) Author the OpenSpec change `review`, run `openspec validate review --strict`, paste the result under Validation. Test: validate exits 0.
- [x] 1.2 Design review, then the approval line appended here (done by the orchestrator, not this ticket).
- Approved 2026-11-18 by owner (pre-approved via orchestrator): V1 to V8, C1 to C4 and the scope in the brief. No new owner-level product decision found in design.md. Defaults taken from Assumptions 2 (D15 assignee rule, D21 task moves allowed in a read-only Workspace) and listed for the final report. Record: `.agents/tasks/review/approval.json`.

## 2. Backend (repo `reportlee-backend`, branch `feat/review`). Order matters. Each ticket: tests red first, then green. Run only the touched suites. `npx tsc --noEmit` stays green after each ticket. Commit per ticket, no push.
- [x] BE-1 Migration `src/db/migrations/0003_review.sql` (LF, idempotent, as in design.md), models (`report-comment.model.ts`, `task.model.ts`, `notification.model.ts` columns), `NotificationType`, `TableNames`, `postgres.schema.ts`, `tests/helpers/db.ts`, `factories.ts`. Test `tests/migration-0003.test.ts` (copy of `migration-0002.test.ts`): objects exist, applied twice with the no-catch helper, CRLF case, CHECKs refuse bad rows, unique comment link, notification columns and four enum values. Print `NODE_ENV`, confirm `app-db` on 5434, `npm run migrate` twice (second says already recorded). Never `migrate:rebuild`. Verify: `npx vitest run tests/migration-0003.test.ts tests/migration-0002.test.ts`, `npx tsc --noEmit`.
- [x] BE-2 `ReportAccess`: relation `admin`, `assertSeen`, `assertDecide`, `assertComment`, `assertRead` for `admin`; `markSeen` in `report.repository.ts`; `POST /reports/:id/seen`; `ReportDto.comments` becomes `CommentDto[]`; messages and codes. Update the old Admin 404 tests on purpose. Tests `tests/review-seen.test.ts`, `tests/report-access.test.ts`, `tests/reports.test.ts`: AC7, AC8 with injected `now`. Verify: `npx vitest run tests/report-access.test.ts tests/reports.test.ts tests/review-seen.test.ts`.
- [x] BE-3 Review module: `POST /reports/:id/decision`, `GET /review/queue`, `POST /review/bulk-approve`, audit actions, events, `decision` comments. Tests `tests/review-decisions.test.ts`, `tests/review-queue.test.ts`: AC1 to AC6, AC15, double decide, read-only Workspace. Verify: `npx vitest run tests/review-decisions.test.ts tests/review-queue.test.ts`.
- [x] BE-4 Comments: `comment-sanitizer.ts` (`plainText`: strip tags, decode entities, trim; also used for reason, title, note), `POST /reports/:id/comments` with `followUp` in one transaction, batched comment loading in `withHistory`. Reviewer comment calls `markSeen`; author may reply to any non-author comment; every controller passes `{ log: false }`. Tests `tests/report-comments.test.ts`: AC9, AC10, AC21 to AC25. Verify: `npx vitest run tests/report-comments.test.ts tests/review-decisions.test.ts`.
- [x] BE-5 Task module (lists drop tasks of deleted reports) (`model`, `repository`, `service`, `controller`, `routes`, `schema`, `message`, `index`), `GET /tasks`, `PATCH /tasks/:id`, mount in `src/routes/router.ts`. Tests `tests/tasks.test.ts`: AC11, AC12. Verify: `npx vitest run tests/tasks.test.ts`.
- [x] BE-6 Notifications and email: `notify()` extra argument, workspace filter on list, count and read-all, `ReviewNotifier`, hook in `ReportService.submit`, `EmailJobNames.DECISION`, `EmailTemplates.DECISION` in `src/enums/mail/mail.enums.ts`, `idempotencyKey` `decision:<eventId>`, `redactEmails` on logged errors, `src/emails/decision/html.hbs`, `DECISION_EMAILS_ENABLED` in `EnvSchema` and `.env.example` (name only). Tests `tests/review-notifications.test.ts`: AC13, AC14, bullmq mocked, log capture. Verify: `npx vitest run tests/review-notifications.test.ts` plus the earlier review suites.
- [ ] BE-7 (steps 1 to 4 done in be-build, see Validation; the full `npm test` and `npm run build` are left for the final Gate 3) Backend Gate 3, once: `npx biome check <touched files>`, `npx tsc --noEmit`, `npm run check:circular`, the touched suites, `npm test`, `npm run build`, em dash check, durations. Paste under Validation.

## 3. Frontend (repo `reportlee-frontend`, branch `feat/review`), after BE-7 is green
- [x] FE-1 `src/lib/api-types.ts`, `review-api.ts`, `discussion-api.ts`, `tasks-api.ts`, `notifications-api.ts`, `report-errors.ts` codes (incl. `NOT_FOUND`, `INTERNAL`, bulk skip codes), `Call<T>` shape with `fieldErrors`, `/dashboard/` href check in the notification mapper, with `scripts/review-api.test.ts`, `tasks-api.test.ts`, `notifications-api.test.ts` red first. Verify: `npm test`, `npx tsc --noEmit`.
- [x] FE-2 C1: `reviewerLabel` in `src/lib/review.ts`, used in `report-view.tsx`, with `scripts/reviewer-label.test.ts` (Head, no Head, Head author, deactivated Head). Verify: `npm test`.
- [x] FE-3 `review-queue.tsx` on `GET /review/queue`: decisions, reasons, bulk approve, loading, empty, error. Verify: `npx tsc --noEmit`, manual pass.
- [x] FE-4 `report-view.tsx` (seen once, no localStorage tasks), `report-discussion.tsx` (comments and follow-up), `report-timeline.tsx` (server events). Verify: `npx tsc --noEmit`, manual pass.
- [x] FE-5 `task-board.tsx` and `home-screen.tsx` on `GET /tasks` and `PATCH /tasks/:id`, no `SAMPLE_TASKS`; Home requests `viewsFor(viewer)[0]` with inline error and retry; remove the "Show older" control. Verify: `npx tsc --noEmit`, manual pass.
- [x] FE-6 `notifications-screen.tsx` and `notification-bell.tsx` on the API, 60 second poll, scoped by Workspace. Verify: `npx tsc --noEmit`, manual pass.
- [x] FE-7 `docs/ROADMAP.md`: C3 Done row (check it does not exist yet), slice 3 row when verified, Backlog lines. Update Validation.
- [x] FE-8 (build compiled; its type-check step is blocked by the owner dev server, see Validation) Frontend Gate 3: `npx biome check <touched files>`, `npx tsc --noEmit`, `npm test`, `npm run build`, em dash check. Never `npm run format`. Paste under Validation.

## 4. Review, live check, close
- [ ] REV-1 Gate 4 fresh-context review (three lanes, aggregator last), max 3 rounds.
- [ ] LIVE-1 Live check on `http://localhost:5000` with `Origin: http://localhost:3000`, dev fixtures and `@example.com` only: decide, reasons, 403 and 404 cases, seen, comments, tasks, notifications, one decision email to an `@example.com` address. Browser pass or "not verified".
- [ ] DOC-1 Final report.

## Design-review carry-over
Source: `.agents/tasks/review/design-review.md` round 2 and `carryover.md`. Every finding is resolved in the build and in design.md and the specs.

| # | Severity | Finding | Resolution | Test |
|---|---|---|---|---|
| 1 | MEDIUM | `relation()` let the Space Head review a Head-role author's report | `ReportAccess.relation` checks the author's role first: a Head-role author always goes to the Admins. Queue Head scope and `ReviewNotifier.reviewersOf` use the same rule. design D1, "ReportAccess changes", AC26; spec `review-decisions` | `review-seen.test.ts` "makes the Admins the reviewers when the author is a Head in a Space whose Head is someone else"; `review-decisions.test.ts` "gives a Head 404 on a Head-role author's report even in the Head's own Space"; `review-queue.test.ts` "leaves a Head-role author's report out of the Head's queue"; `review-notifications.test.ts` "tells the Admins, not the Space's Head, about a Head's submission" |
| 2 | MEDIUM | FE call shape `Call<T>`/`fieldErrors` vs real `ApiResult<T>`/`fields` | design "API modules" now says `ApiResult<T>` via `apiCall`, `result.fields`, status 0 under `SIMULATED_AUTH`. FE-1 implements it | FE-1 `scripts/*-api.test.ts` (fe-build) |
| 3 | MEDIUM | Comments and tasks on an approved report unspecified | Allowed: `assertComment` does not check state. design E14, AC27; spec `report-comments` | `report-comments.test.ts` "accepts comments and a follow-up on an approved report" |
| 4 | MEDIUM | Decision email carried the reason | Reason removed from locals and template; email links to the report. design D18, AC14; spec `notification-inbox` | `review-notifications.test.ts` "queues one email ... with a stable key and no reason" |
| 5 | NIT | `seen` events from decisions loosely specified | `markSeen(..., { event })`: E12 writes `seen` on each new window; a decision or comment only when `firstSeenAt` was null; reopen never starts a window | `review-decisions.test.ts` events `["submitted","seen","approved","reopened"]`; `review-seen.test.ts` seen count 1 then 2 |
| 6 | NIT | `insertEvent` returned void | Returns the event id; used for `decision:<eventId>` | `review-notifications.test.ts` key `^decision:\d+$`, distinct per decision |
| 7 | NIT | `timestamp` vs `timestamptz` | `report_comments.created_at` and task timestamps are `timestamptz`, models `withTimezone: true` | `migration-0003.test.ts`, `report-comments.test.ts` `at` equals NOW |
| 8 | NIT | Caps truncate silently | Kept at 500, recorded in design Backlog as silent in v1 | none (documented) |
| 9 | NIT | E17 view definitions | Copied into design E17 | `tasks.test.ts` "returns the right tasks per view" |
| 10 | NIT | Deactivated recipients | `ReviewNotifier` and the decision email skip non-active Memberships | `review-notifications.test.ts` "tells nobody about a tag, and skips a deactivated recipient", "skips the email for a deactivated author" |

Other choices made while building (no owner decision needed):
- A draft gets 404 on decide for everyone except its author, who gets 409 `NOT_SUBMITTED` (design E13 step 2).
- `.env.example` gains `DECISION_EMAILS_ENABLED=true` (name and default only). `.env*` files with values were not read.
- One commit (f7e00f6) holds BE-4, BE-5 and BE-6: the comment route creates tasks and calls the notifier, so splitting them would leave a commit that does not type-check.

## Validation
Gate 1 (docs only, no lint, test or build):

- `npx openspec validate review --strict`: Change 'review' is valid

### Backend build (be-build, 2026-11-19), repo `reportlee-backend`, branch `feat/review`
Commits: 2c86109 (BE-1 migration and models), 7e45de8 (BE-2 seen and `admin` relation), 96b988c (BE-3 decisions, queue, bulk), f7e00f6 (BE-4 to BE-6 comments, tasks, notifications, decision email). Not pushed.

Migration (BE-1):
- Environment check by name only: `NODE_ENV=development host=localhost port=5434 db=app` (Docker `app-db`).
- `npm run migrate`: `0002_reports.sql` and `0003_review.sql` applied, "2 applied, 2 skipped". Second run: "0 applied, 4 skipped", every file "already recorded". `0003_review.sql` is LF in the working tree.
- `npx vitest run tests/migration-0003.test.ts tests/migration-0002.test.ts`: 2 files, 19 tests passed, 17.6s.

Red then green per ticket:
- BE-2: `tests/review-seen.test.ts` first run 12 of 13 failed (no `/seen` route, old relation order). After the change: `report-access`, `reports`, `review-seen` 3 files, 83 tests passed, 56s. The old `reports.test.ts` case that expected 404 for an Admin on a headed Space's Staff report was changed on purpose for V2.
- BE-3: `review-decisions` and `review-queue` written before the module; green: 2 files, 31 tests (one fixture fix in the bulk test), 40s.
- BE-4 to BE-6: `report-comments`, `tasks`, `review-notifications` 3 files, 38 tests; 1 failed first (the log check missed winston output), fixed by also spying `logger.write`, then passed.

Gate 3 backend steps 1 to 4 (run in order, each started only after the previous one passed):
1. `npx biome check <58 touched .ts files>`: exit 0, "Checked 58 files. No fixes applied.", 7s. No new diagnostics.
2. `npx tsc --noEmit`: exit 0, no errors, 58s.
3. `npm run check:circular`: 1 cycle, `modules/user/user.model.ts > modules/user/user-role.model.ts`, the known one. No new cycle. 32s.
4. `npx vitest run tests/migration-0002.test.ts tests/migration-0003.test.ts tests/report-access.test.ts tests/reports.test.ts tests/review-seen.test.ts tests/review-decisions.test.ts tests/review-queue.test.ts tests/report-comments.test.ts tests/tasks.test.ts tests/review-notifications.test.ts`: 10 files, 171 tests passed, 0 failed, 435s (setup 114s, tests 288s). Over 3 minutes for one step: it is ten suites on the real Postgres and the time is known slow on this machine; no failure.
- Em dash and en dash check on the touched non-test files (`Select-String "[\u2014\u2013]"`, `rg` is not installed): 2 hits, both in comments I did not write (`.env.example` line 20, `src/db/postgres.schema.ts` line 1). No hit in a user-facing string.
- Not run here, by instruction: the full `npm test` and `npm run build` (final Gate 3).

The live check adds its results here.


### Frontend build (fe-build, 2026-11-19), repo `reportlee-frontend`, branch `feat/review`
Commits (not pushed): `b72adf7` FE-1 and FE-2 (API calls, error codes, `reviewerLabel`), `52bbc8b` FE-3 (review queue, `decisionGuard`), `be27315` FE-4 (report page, discussion), `304c4af` FE-5 (board and Home), `eefba98` FE-6 (notifications and bell), `d00d115` FE-7 (ROADMAP: C3 Done row dated 2026-11-18, review Backlog lines).

Red then green (Node test runner):
- `review-api`, `discussion-api`, `tasks-api`, `notifications-api` and `reviewer-label` tests were written first. First run: all failed with `ERR_MODULE_NOT_FOUND` or a missing export, because the modules did not exist. After the change: green.
- `decision-guard.test.ts`: red with "does not provide an export named 'decisionGuard'", then 4 of 4.
- `countAfterPoll` test: red with the same missing export, then `notifications-api.test.ts` 10 of 10.

Gate 3 frontend (`.agents/tasks/review/g3-fe.out`; the 21 touched .ts and .tsx files are listed in `touched.txt`):
1. `npx biome check <21 touched files>`: exit 0, "Checked 21 files. No fixes applied", 5s.
2. `npx tsc --noEmit`: the only errors are 8 syntax errors inside `.next/dev/types/routes.d.ts` and `validator.ts`. The owner's running `next dev` wrote a corrupt generated line (`/dashboard/leads">> = Specific`). No error is in `src/` or `scripts/`. With `.next` excluded (a temporary `tsconfig.gate.json` covering `src` and `scripts`, deleted afterwards): exit 0, 38s.
3. `npm test`: 356 tests, 356 pass, 0 fail, 27s (311 before this slice).
4. `npm run build`: "Compiled successfully in 4.1min", then its own "Running TypeScript" step failed on the same `.next/dev/types` errors, so the build did not finish. The owner's dev server was not stopped. The run took 398s, over the 3 minute rule, because the compile step alone takes 4.1 min on this machine. Not verified: a clean `next build` exit. To get one, stop `next dev`, run `npm run build`, then start it again.
5. Em dash and en dash check (`Select-String "[\u2014\u2013]"`) on the 21 touched files: 0 hits.
6. No new dependency (`package.json` untouched).

Choices made while building (no owner decision needed):
- Raising a task is part of posting a comment: a reviewer ticks "Add a follow-up task" in the comment box and one `POST /reports/:id/comments` carries both (design E14). The old "Raise a task from this" button on an existing comment is gone, because the server ties a task to the comment that created it.
- `canDecide` locks an approved report, which also disabled Reopen. `decisionGuard` applies the state rule per decision: an approved report accepts only Reopen, and only an approved report can be reopened.
- The tasks call is `updateTaskStatus`, not `moveTask`, because `src/lib/tasks.ts` already exports `moveTask`.
- Task moves are allowed in a read-only Workspace (D21), so the board no longer passes `readOnly` to the local guard.
- The author sees the reply box only after someone else has commented. The server still refuses a start with `REVIEWER_MUST_START`.
- `getReport` now maps `taskId: null` to no `taskId` through `reportFrom`, so every screen sees one comment shape.
- Names and the "Reviewed by" line come from `listMembers`. If that call fails the label reads "Not available" and names read "Former member".

Not verified here: the screens in a browser (no browser pass in this step) and the 60 second poll.

### Gate 3 final and integration check (gate3, 2026-11-20), both repos, branch `feat/review`
Integration (read, round 1): the seams match. Ids are strings in task, comment, report, queue and bulk DTOs (`TaskDto`, `CommentDto`, `ApiBulkResult`). Notification `id` is still a number (existing shape, additive); `notificationFrom` converts it to a string and `workspaceId` is a string. The notification list answers `{ data, total, page, limit }` and the frontend reads `data`. Unread count is `{ count }`, mark read `{ updated }`, bulk approve `{ approved, skipped:[{id,code}] }`, and the review error codes in `api-types.ts` match `REVIEW_CODES`. No mismatch found.

Frontend (`.agents/tasks/review/g3-fe.out`), chained, stops at first failure:
1. `npx biome check` on 21 touched files: exit 0, 5.4s.
2. `npx tsc --noEmit`: the plain command fails with 8 syntax errors, all in `.next/dev/types/routes.d.ts` and `validator.ts` (corrupt generated files from the owner's running `next dev`, not source). With a temporary tsconfig that leaves out `.next` (deleted afterwards): exit 0, 34s.
3. `npm test`: 356 tests, 356 pass, 0 fail, 24.9s.
4. `npm run build`: exit 0, 295s. Its own TypeScript step reads `.next/dev/types` too, so the corrupt `types` folder was moved (not deleted) to `.agents/tasks/review/next-dev-types-corrupt-backup` first. `next dev` was not stopped and regenerates that folder. The step took over 3 minutes: Turbopack compile 24s, TypeScript 2.8 min.
5. `rg -n "[\u2014\u2013]"` on the 21 touched files: no hits.

Backend (`.agents/tasks/review/g3-be.out`), chained:
1. `npx biome check` on 58 touched files: exit 0, 5.2s.
2. `npx tsc --noEmit`: exit 0, 38.4s.
3. `npm run check:circular`: only the known cycle `user.model <-> user-role.model`, no new one. 8.8s.
4. Touched suites (8 files: migration-0003, report-comments, reports, review-decisions, review-notifications, review-queue, review-seen, tasks): 156 tests pass, 433s.
5. Full `npm test`: 37 files, 488 tests, 488 pass, 0 fail, 370s.
6. `npm run build`: exit 0, 6.1s.
