## 1. Spec and approval
- [ ] 1.1 (FE repo, docs) Author the OpenSpec change `reports`, run `openspec validate reports --strict`, paste the result under Validation. Test: validate exits 0.
- [ ] 1.2 Design review, then approval line appended here (done by the orchestrator, not this ticket).

## 2. Backend (repo `reportlee-backend`, branch `feat/reports`). Order matters. Each ticket: tests red first, then green. Run only the touched suites.
- [x] BE-1 Migration `src/db/migrations/0002_reports.sql`, models (`schedule.model.ts`, `report.model.ts`, `workspace.model.ts` column), `TableNames`, `postgres.schema.ts`, `tests/helpers/db.ts` and `factories.ts`. Test `tests/migration-0002.test.ts`: objects exist; applied twice without error; unique live draft per person per period; soft delete frees the slot; CHECKs refuse bad rows. Then print `NODE_ENV`, confirm local DB port 5434, `npm run migrate` twice (second applies 0). Verify: `npx vitest run tests/migration-0002.test.ts tests/migration-0001.test.ts`, `npx tsc --noEmit`, `npm run check:circular`.
- [x] BE-2 `period-calendar.ts` with `tests/period-calendar.test.ts`: five cadences in Africa/Lagos, DST in America/New_York and Europe/London, gap and ambiguous local times, midnight gap zone, schedule version change, one stub label per cadence, current period with a stub shorter than a day (D7), 168 hour grace across DST. Verify: `npx vitest run tests/period-calendar.test.ts`.
- [x] BE-3 Add `sanitize-html` and `@types/sanitize-html`, `report-sanitizer.ts`, `tests/report-sanitizer.test.ts` (script and contents, `on*`, `javascript:`, `data:`, `style`, `iframe`, `svg`, `img`, `h1` to `h6`, relative, protocol-relative and obfuscated `javascript:` hrefs, idempotence, forced link attributes, length refusal, and `visibleTextLength` with the shared `report-text.cases.json`; `htmlToText` ported line for line from `src/lib/report-draft.ts`). Verify: `npx vitest run tests/report-sanitizer.test.ts`; `npm audit` result noted.
- [x] BE-4 `CodedConflict.ts`, `error.ts` branches (`CodedConflictError` and `DrizzleQueryError`, D25) logging one `console.error` line of `pgCode`, method and path, with the sentinel test (temporary SQL CHECK on `reports`, dropped in `afterEach`), four `AuditAction` values, export `timeZone` from `workspace.schema.ts`, `schedule.constants.ts`, `ensureBaseline`, `WorkspaceService.update` taking the period lock, then `lockWorkspace`, then calling it when `timeZone` is sent (D26, D31), `dayOfMonth` stored null when `lastDay` is true, schedule module, period service, E1 to E4, `tests/schedule.test.ts`: default shown, no write on GET, staff and head PUT 403 whatever the body, admin PUT 200 with `appliesFrom` `2026-11-01T23:00:00.000Z` at the assumed now, a change leaves old periods, stub period cases, field errors (`time`, `weekday`, `timeZone`, `dayOfMonth`, unknown key `anchor_date`), non-member 404 "Workspace not found.", ten parallel `current` give one row, `open` set, 17:00:00.000 current-period edge, Workspace zone change leaves periods unchanged (AC29), a zone change racing ten `current` requests and a PUT ends with no 500 (D31), a suspended user gets 401 on E1 to E4, `2147483648` is 400. Verify: `npx vitest run tests/schedule.test.ts tests/workspace-guards.test.ts tests/workspaces.test.ts`.
- [x] BE-5 Report module, `scope.ts` (`resolveOrNotFound`), `ReportAccess`, E5 to E11, `tests/reports.test.ts` and `tests/report-access.test.ts`: AC10 to AC23 and AC28 to AC31, a suspended user getting 401 on E5 to E11 (`ReportAccess.load` uses `resolveOrNotFound`), duplicate KPI template names (first row gets the value) (one test per adjacent pair in "Order of checks", insert-do-nothing then `FOR UPDATE` draft save, submit lock and concurrency test, `NO_SPACE`, E5 `null` after submit, batched E8 loading). Includes log capture with `tests/helpers/log-capture.ts`. Verify: `npx vitest run tests/reports.test.ts tests/report-access.test.ts tests/schedule.test.ts`.
- [x] BE-6 Backend Gate 3: `npx biome check <touched files>` (never `biome:lint` or `biome:format`), `npx tsc --noEmit`, `npm run check:circular`, once `npm test`, then `npm run build`, with durations. Paste under Validation. Commit per step in the repo's git log style. No push.

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

Approved 2026-11-17 by owner (pre-approved via orchestrator): R1 to R4 and the brief scope. No new owner-level product decision found. Open design-review findings (3 MEDIUM, 4 LOW, implementation-level) are carried into the build via .agents/tasks/reports/carryover.md.

### Backend build (repo `reportlee-backend`, branch `feat/reports`, base `main` fff9b38), 2026-11-18
Commits, oldest first (none pushed):
- `0ff7d5e` feat: add reports and schedule migration with models (BE-1)
- `6960f43` feat: add reporting period calendar (BE-2)
- `9cff559` feat: add report html sanitizer with sanitize-html (BE-3)
- `760bf32` feat: add schedule and reporting period endpoints (BE-4)
- `b196359` feat: add reports module with ReportAccess choke point (BE-5)

`git diff --stat main...HEAD`: 47 files changed, 5330 insertions, 5 deletions.

Red then green per step (touched suites only, `npx vitest run <files>`):
| Step | Red (why it failed) | Green |
|---|---|---|
| BE-1 | `tests/migration-0002.test.ts` with the SQL file moved aside: ENOENT, 9 skipped, file failed | `npx vitest run tests/migration-0002.test.ts tests/migration-0001.test.ts`: 17 passed (2 files), 92.9s. After adding the CRLF case: 0002 alone 9 passed |
| BE-2 | `tests/period-calendar.test.ts` before `period-calendar.ts` existed: module not found, no tests | 30 passed, 43.3s |
| BE-3 | `tests/report-sanitizer.test.ts` before `report-sanitizer.ts`: module not found. First implementation: 2 failed on link attribute order | 33 passed |
| BE-4 | `tests/schedule.test.ts` run with the two router lines removed (the implementation was written before the test, so red was shown by unmounting it): 17 of 17 failed with 404. `tests/error-handler-db.test.ts` against the old `error.ts` (stashed): 2 of 2 failed (SQL text in the body, no `code` on 409). Two test-side errors fixed on the way to green: a session that expired when the clock moved 6 days, and a wrong hand-computed Cairo offset (see design "Build notes") | `npx vitest run tests/schedule.test.ts tests/error-handler-db.test.ts`: 19 passed. Slice 1 regression `tests/workspace-guards.test.ts tests/workspace.test.ts tests/role-guards.test.ts`: 51 passed, 63s |
| BE-5 | `tests/reports.test.ts` before the module: 63 failed, 1 passed (that one asserts a 404, which a missing route also returns) | `npx vitest run tests/reports.test.ts tests/report-access.test.ts tests/schedule.test.ts`: 87 passed, 61s. Mutation check: an Admin always counted as a reviewer and the edit window never closing made 3 tests fail (AC17, AC20, the E10 order pair). Reverted |

Local migration (database checked first, no `.env*` file read; a throwaway script printed only the URI parts and was deleted):
```
NODE_ENV=development host=localhost port=5434 db=app     (docker ps: app-db 0.0.0.0:5434->5432)
$ npm run migrate   ->  ~ 0000 (already recorded), ✓ 0001_workspaces_people.sql, ✓ 0002_reports.sql   "2 applied, 1 skipped"
$ npm run migrate   ->  all three "already recorded"   "0 applied, 3 skipped"
```
0001 ran again on the first run because the CRLF working copy of 0001 hashes differently from the LF text that was recorded before. That is the known `core.autocrlf` risk. It was harmless because 0001 is idempotent.

Migration hash: `0002_reports.sql` sha256 `62E3DC7FD6EE41BA07C9F8FAD989AB644E37AEEBBD9BB02C7540C5D1A1FB8510`. The same value comes from the working file, the committed blob (`git ls-files --eol`: `i/lf w/lf`) and `dist/migrations/0002_reports.sql` after the build. One commit touches the file, and it was not edited after it was applied. Risk: a fresh checkout with `core.autocrlf=true` writes it as CRLF, which changes the hash and makes the runner apply it once more. `tests/migration-0002.test.ts` "applies cleanly again in its CRLF form" proves that second run is harmless. `.gitattributes` stays a Backlog line.

Gate 3 (backend):
```
npx biome check <new files>                 -> exit 0, no diagnostics (new files formatted with biome check --write on those files only)
npx biome lint <edited existing files>      -> exit 0 (formatter not run on them: they are CRLF working copies, and running it would add whitespace churn)
npx tsc --noEmit                            -> exit 0 (35s to 253s; the machine was slow)
npm run check:circular                      -> 216 files, 1 cycle: user.model.ts > user-role.model.ts (the known one)
npm test                                    -> 30 files passed, 396 tests passed, 0 failed. Duration 296.7s (setup 168.4s, tests 94.0s)
npm run build                               -> "Build complete.", 6s
npm audit --omit=dev                        -> 4 high, all pre-existing (dotenvx, nodemailer, fdir, picomatch). None from sanitize-html
em/en dash search over the 47 changed files -> 1 hit: src/db/postgres.schema.ts:1, a code comment that was there before. No user-facing hit
```
The API on :5000 and the email worker were left running. No email was sent: the tests use the queue recorder, and every address is `@example.com`.

## Design-review carry-over
From `.agents/tasks/reports/design-review.json` (3 MEDIUM, 4 LOW). Full text in design.md, "Responses to design review round 3".
| # | Severity | Resolution | Test |
|---|---|---|---|
| 1 | MEDIUM | The baseline is written on a Workspace zone change only when a period exists, so a day-one correction makes the default follow the new zone. Spec `schedule` scenario and AC29 rewritten | `schedule.test.ts` "lets the default follow a zone corrected before any period exists" |
| 2 | MEDIUM | `ReportAccess.assertSubmit`: none 404, reviewer `NOT_AUTHOR`, Admin, read-only, already submitted. Used by E7. Spec `report-access` scenario added | `reports.test.ts` "E7: 404 before NOT_AUTHOR", E7 order pairs |
| 3 | MEDIUM | Open periods exclude those that ended before `workspaces.created_at` (the current period is kept). D8, AC9 and spec `reporting-periods` updated | `period-calendar.test.ts` "never lists a period that ended before notBefore"; `schedule.test.ts` "does not open a period that ended before the Workspace was created" |
| 4 | LOW | The locked read is `WHERE id AND deleted_at IS NULL FOR UPDATE`, and every check runs on that locked row | `reports.test.ts` "ends a delete racing a submit with no 500" |
| 5 | LOW | Frontend work (FE-1): `getDraft` maps `data ?? null`. The backend's `data: null` is tested | `reports.test.ts` "returns null when the caller has no draft" |
| 6 | LOW | `created_at` and `updated_at` set from the request `now` (D3) | the draft shape test asserts `updatedAt` equals the fixed clock |
| 7 | LOW | Noted: an unknown key `message` shows as a plain message (accepted) | none needed |

`openspec validate reports --strict` after these edits: `Change 'reports' is valid`.
