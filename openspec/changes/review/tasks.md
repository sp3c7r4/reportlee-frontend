## 1. Spec and approval
- [x] 1.1 (FE repo, docs) Author the OpenSpec change `review`, run `openspec validate review --strict`, paste the result under Validation. Test: validate exits 0.
- [ ] 1.2 Design review, then the approval line appended here (done by the orchestrator, not this ticket).

## 2. Backend (repo `reportlee-backend`, branch `feat/review`). Order matters. Each ticket: tests red first, then green. Run only the touched suites. `npx tsc --noEmit` stays green after each ticket. Commit per ticket, no push.
- [ ] BE-1 Migration `src/db/migrations/0003_review.sql` (LF, idempotent, as in design.md), models (`report-comment.model.ts`, `task.model.ts`, `notification.model.ts` columns), `NotificationType`, `TableNames`, `postgres.schema.ts`, `tests/helpers/db.ts`, `factories.ts`. Test `tests/migration-0003.test.ts` (copy of `migration-0002.test.ts`): objects exist, applied twice with the no-catch helper, CRLF case, CHECKs refuse bad rows, unique comment link, notification columns and four enum values. Print `NODE_ENV`, confirm `app-db` on 5434, `npm run migrate` twice (second says already recorded). Never `migrate:rebuild`. Verify: `npx vitest run tests/migration-0003.test.ts tests/migration-0002.test.ts`, `npx tsc --noEmit`.
- [ ] BE-2 `ReportAccess`: relation `admin`, `assertSeen`, `assertDecide`, `assertComment`, `assertRead` for `admin`; `markSeen` in `report.repository.ts`; `POST /reports/:id/seen`; `ReportDto.comments` becomes `CommentDto[]`; messages and codes. Update the old Admin 404 tests on purpose. Tests `tests/review-seen.test.ts`, `tests/report-access.test.ts`, `tests/reports.test.ts`: AC7, AC8 with injected `now`. Verify: `npx vitest run tests/report-access.test.ts tests/reports.test.ts tests/review-seen.test.ts`.
- [ ] BE-3 Review module: `POST /reports/:id/decision`, `GET /review/queue`, `POST /review/bulk-approve`, audit actions, events, `decision` comments. Tests `tests/review-decisions.test.ts`, `tests/review-queue.test.ts`: AC1 to AC6, AC15, double decide, read-only Workspace. Verify: `npx vitest run tests/review-decisions.test.ts tests/review-queue.test.ts`.
- [ ] BE-4 Comments: `comment-sanitizer.ts` (`plainText`: strip tags, decode entities, trim; also used for reason, title, note), `POST /reports/:id/comments` with `followUp` in one transaction, batched comment loading in `withHistory`. Reviewer comment calls `markSeen`; author may reply to any non-author comment; every controller passes `{ log: false }`. Tests `tests/report-comments.test.ts`: AC9, AC10, AC21 to AC25. Verify: `npx vitest run tests/report-comments.test.ts tests/review-decisions.test.ts`.
- [ ] BE-5 Task module (lists drop tasks of deleted reports) (`model`, `repository`, `service`, `controller`, `routes`, `schema`, `message`, `index`), `GET /tasks`, `PATCH /tasks/:id`, mount in `src/routes/router.ts`. Tests `tests/tasks.test.ts`: AC11, AC12. Verify: `npx vitest run tests/tasks.test.ts`.
- [ ] BE-6 Notifications and email: `notify()` extra argument, workspace filter on list, count and read-all, `ReviewNotifier`, hook in `ReportService.submit`, `EmailJobNames.DECISION`, `EmailTemplates.DECISION` in `src/enums/mail/mail.enums.ts`, `idempotencyKey` `decision:<eventId>`, `redactEmails` on logged errors, `src/emails/decision/html.hbs`, `DECISION_EMAILS_ENABLED` in `EnvSchema` and `.env.example` (name only). Tests `tests/review-notifications.test.ts`: AC13, AC14, bullmq mocked, log capture. Verify: `npx vitest run tests/review-notifications.test.ts` plus the earlier review suites.
- [ ] BE-7 Backend Gate 3, once: `npx biome check <touched files>`, `npx tsc --noEmit`, `npm run check:circular`, the touched suites, `npm test`, `npm run build`, em dash check, durations. Paste under Validation.

## 3. Frontend (repo `reportlee-frontend`, branch `feat/review`), after BE-7 is green
- [ ] FE-1 `src/lib/api-types.ts`, `review-api.ts`, `discussion-api.ts`, `tasks-api.ts`, `notifications-api.ts`, `report-errors.ts` codes (incl. `NOT_FOUND`, `INTERNAL`, bulk skip codes), `Call<T>` shape with `fieldErrors`, `/dashboard/` href check in the notification mapper, with `scripts/review-api.test.ts`, `tasks-api.test.ts`, `notifications-api.test.ts` red first. Verify: `npm test`, `npx tsc --noEmit`.
- [ ] FE-2 C1: `reviewerLabel` in `src/lib/review.ts`, used in `report-view.tsx`, with `scripts/reviewer-label.test.ts` (Head, no Head, Head author, deactivated Head). Verify: `npm test`.
- [ ] FE-3 `review-queue.tsx` on `GET /review/queue`: decisions, reasons, bulk approve, loading, empty, error. Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-4 `report-view.tsx` (seen once, no localStorage tasks), `report-discussion.tsx` (comments and follow-up), `report-timeline.tsx` (server events). Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-5 `task-board.tsx` and `home-screen.tsx` on `GET /tasks` and `PATCH /tasks/:id`, no `SAMPLE_TASKS`; Home requests `viewsFor(viewer)[0]` with inline error and retry; remove the "Show older" control. Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-6 `notifications-screen.tsx` and `notification-bell.tsx` on the API, 60 second poll, scoped by Workspace. Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-7 `docs/ROADMAP.md`: C3 Done row (check it does not exist yet), slice 3 row when verified, Backlog lines. Update Validation.
- [ ] FE-8 Frontend Gate 3: `npx biome check <touched files>`, `npx tsc --noEmit`, `npm test`, `npm run build`, em dash check. Never `npm run format`. Paste under Validation.

## 4. Review, live check, close
- [ ] REV-1 Gate 4 fresh-context review (three lanes, aggregator last), max 3 rounds.
- [ ] LIVE-1 Live check on `http://localhost:5000` with `Origin: http://localhost:3000`, dev fixtures and `@example.com` only: decide, reasons, 403 and 404 cases, seen, comments, tasks, notifications, one decision email to an `@example.com` address. Browser pass or "not verified".
- [ ] DOC-1 Final report.

## Validation
Gate 1 (docs only, no lint, test or build):

- `npx openspec validate review --strict`: Change 'review' is valid

BE-7, FE-8 and the live check add their results here.
