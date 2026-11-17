## 1. Spec and approval
- [ ] 1.1 (FE repo, docs) Author the OpenSpec change `reports`, run `openspec validate reports --strict`, paste the result under Validation. Test: validate exits 0.
- [ ] 1.2 Design review, then approval line appended here (done by the orchestrator, not this ticket).

## 2. Backend (repo `reportlee-backend`, branch `feat/reports`). Order matters. Each ticket: tests red first, then green. Run only the touched suites.
- [ ] BE-1 Migration `src/db/migrations/0002_reports.sql`, models (`schedule.model.ts`, `report.model.ts`, `workspace.model.ts` column), `TableNames`, `postgres.schema.ts`, `tests/helpers/db.ts` and `factories.ts`. Test `tests/migration-0002.test.ts`: objects exist; applied twice without error; unique live draft per person per period; soft delete frees the slot; CHECKs refuse bad rows. Then print `NODE_ENV`, confirm local DB port 5434, `npm run migrate` twice (second applies 0). Verify: `npx vitest run tests/migration-0002.test.ts tests/migration-0001.test.ts`, `npx tsc --noEmit`, `npm run check:circular`.
- [ ] BE-2 `period-calendar.ts` with `tests/period-calendar.test.ts`: five cadences in Africa/Lagos, DST in America/New_York and Europe/London, gap and ambiguous local times, midnight gap zone, schedule version change, one stub label per cadence, current period with a stub shorter than a day (D7), 168 hour grace across DST. Verify: `npx vitest run tests/period-calendar.test.ts`.
- [ ] BE-3 Add `sanitize-html` and `@types/sanitize-html`, `report-sanitizer.ts`, `tests/report-sanitizer.test.ts` (script and contents, `on*`, `javascript:`, `data:`, `style`, `iframe`, `svg`, `img`, `h1` to `h6`, relative, protocol-relative and obfuscated `javascript:` hrefs, idempotence, forced link attributes, length refusal, and `visibleTextLength` with the shared `report-text.cases.json`; `htmlToText` ported line for line from `src/lib/report-draft.ts`). Verify: `npx vitest run tests/report-sanitizer.test.ts`; `npm audit` result noted.
- [ ] BE-4 `CodedConflict.ts`, `error.ts` branches (`CodedConflictError` and `DrizzleQueryError`, D25) logging one `console.error` line of `pgCode`, method and path, with the sentinel test (temporary SQL CHECK on `reports`, dropped in `afterEach`), four `AuditAction` values, export `timeZone` from `workspace.schema.ts`, `schedule.constants.ts`, `ensureBaseline`, `WorkspaceService.update` taking the period lock, then `lockWorkspace`, then calling it when `timeZone` is sent (D26, D31), `dayOfMonth` stored null when `lastDay` is true, schedule module, period service, E1 to E4, `tests/schedule.test.ts`: default shown, no write on GET, staff and head PUT 403 whatever the body, admin PUT 200 with `appliesFrom` `2026-11-01T23:00:00.000Z` at the assumed now, a change leaves old periods, stub period cases, field errors (`time`, `weekday`, `timeZone`, `dayOfMonth`, unknown key `anchor_date`), non-member 404 "Workspace not found.", ten parallel `current` give one row, `open` set, 17:00:00.000 current-period edge, Workspace zone change leaves periods unchanged (AC29), a zone change racing ten `current` requests and a PUT ends with no 500 (D31), a suspended user gets 401 on E1 to E4, `2147483648` is 400. Verify: `npx vitest run tests/schedule.test.ts tests/workspace-guards.test.ts tests/workspaces.test.ts`.
- [ ] BE-5 Report module, `scope.ts` (`resolveOrNotFound`), `ReportAccess`, E5 to E11, `tests/reports.test.ts` and `tests/report-access.test.ts`: AC10 to AC23 and AC28 to AC31, a suspended user getting 401 on E5 to E11 (`ReportAccess.load` uses `resolveOrNotFound`), duplicate KPI template names (first row gets the value) (one test per adjacent pair in "Order of checks", insert-do-nothing then `FOR UPDATE` draft save, submit lock and concurrency test, `NO_SPACE`, E5 `null` after submit, batched E8 loading). Includes log capture with `tests/helpers/log-capture.ts`. Verify: `npx vitest run tests/reports.test.ts tests/report-access.test.ts tests/schedule.test.ts`.
- [ ] BE-6 Backend Gate 3: `npx biome check <touched files>` (never `biome:lint` or `biome:format`), `npx tsc --noEmit`, `npm run check:circular`, once `npm test`, then `npm run build`, with durations. Paste under Validation. Commit per step in the repo's git log style. No push.

## 3. Frontend (repo `reportlee-frontend`, branch `feat/reports`)
- [ ] FE-1 `src/lib/api-types.ts` types and code constants, `src/lib/reports-api.ts`, `src/lib/schedule-api.ts`, `src/lib/periods.ts`, with `scripts/reports-api.test.ts` (including dotted field keys mapped by first segment), `scripts/schedule-api.test.ts`, `scripts/periods.test.ts` red first, and `scripts/report-text.cases.json` run by `scripts/report-draft.test.ts` against `htmlToText`. Verify: `npm test`.
- [ ] FE-2 Retire the simulated functions in `src/lib/reports.ts`, keeping every export a mock screen imports. Update `scripts/report-storage.test.ts` and `scripts/report-view.test.ts` with equivalents, deleting none. Verify: `npm test`, `npx tsc --noEmit`.
- [ ] FE-3 `submit-report.tsx`: loading, autosave states, field errors, late, closed, Admin, read-only, `NO_SPACE` and edit states; colleague picker from `listMembers`; no `localStorage` draft backup; submitted-report reload through `listMyReports` with `periodId`. Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-4 `report-view.tsx` and `report-timeline.tsx`: list (loading, empty, error, load more) and detail (not found, retry, delete confirm, server answer wins). Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-5 `settings-screen.tsx` schedule: Admin form with `getSchedule` and `putSchedule`, read-only for Staff and Head, `appliesFrom` shown, pending note. Verify: `npx tsc --noEmit`, manual pass.
- [ ] FE-6 Frontend Gate 3: `npx biome check <touched files>`, `npx tsc --noEmit`, `npm test`, `npm run build`, `rg -n "[\u2014\u2013]" <touched files>`. Paste under Validation. Commit per step. No push.

## 4. Review, live check, close
- [ ] REV-1 Gate 4 fresh-context review (three lanes, aggregator last), max 3 rounds.
- [ ] LIVE-1 Live check on `http://localhost:5000` with `Origin: http://localhost:3000` and `@example.com` accounts only: current period; draft autosave; submit on time and late (seed a past `due_at` locally); edit; delete; another member cannot read the draft; staff PUT schedule is 403; script tags stripped. Browser pass or "not verified".
- [ ] DOC-1 ROADMAP rows and Backlog lines (see design Backlog). Final report.

## Validation
### `openspec validate reports --strict`
```
$ openspec validate reports --strict
Change 'reports' is valid
```
Re-run after design review round 1 (all 24 findings addressed, see the end of `design.md`):
```
$ openspec validate reports --strict
Change 'reports' is valid
```
Re-run after design review round 2 (all 10 findings addressed, see "Responses to design review round 2" in `design.md`):
```
$ openspec validate reports --strict
Change 'reports' is valid
```
Em dash check (no `rg` on this machine, PowerShell `Select-String` for U+2014 and U+2013 over `openspec/changes/reports/**`): 0 hits.
