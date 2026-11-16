## 1. Backend (repo `reportlee-backend`, branch `feat/workspaces-people`)

Run commands inside the repo folder. Before any migration print `NODE_ENV` and confirm the database is the local Docker `app-db` on port 5434. Never run `migrate:rebuild` or `rebuild-db.ts`. While iterating run only the touched suites (`npx vitest run <files>`).

- [x] 1.1 BE: test harness (D18, review 5). `vitest.config.ts` and `tests/setup.ts` are not touched. No `TEST_DB_URI`. `tests/helpers/db.ts` checks `config.db.uri` (`POSTGRES_URI` from `.env.test` or the shell) and throws unless the host is `localhost` or `127.0.0.1` and the database name ends in `_test`, prints the database name only, applies `0001_workspaces_people.sql` in `beforeAll` with its own 6 line `splitStatements(sql)` (split on `--> statement-breakpoint`, trim, drop empty, copies the logic of `app/migrate.ts`) and no catch around any statement, and truncates the slice tables between tests. The header comment of the helper documents the `.env.test` variable by name (never the value). Also in this task: export `type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0]` from `src/db/postgres.db.ts` (D6). Add `tests/helpers/log-capture.ts` that captures `console.*`, `process.stdout.write` and `process.stderr.write`. `tests/helpers/auth.ts` stubs `CacheService` with an in-memory map, signs a real access token, and writes the cache entry `{ id, authId, emailVerified, action }`. `tests/helpers/app.ts` builds the app from the real `router`. Services and repositories follow D6 (`getDb().transaction`, `(tx: Tx, ...)` repository functions that do not extend `RelationalRepository`). `tests/helpers/factories.ts` creates users and Memberships. First confirm that `auth.service.ts` writes `id` into the cache entry (D24). Verify: `npx vitest run tests/helpers-smoke.test.ts` (insert, read, and an authenticated request to `GET /me/memberships` returns 200).
- [x] 1.2 BE: migration and models (AC15). Write `src/db/migrations/0001_workspaces_people.sql` exactly as in design.md, the five `*.model.ts`, the `user.model.ts` column, `postgres.schema.ts` exports and `TableNames`. Test first: `tests/migration-0001.test.ts` runs the file twice on an empty database and checks tables, CHECKs and unique indexes (a second Admin-with-Space row fails, a duplicate lower-cased slug fails, slugs "-ab", "ab-" and "a--b" fail the CHECK). `tests/migration-0001-schema.test.ts` asserts from `information_schema` and `pg_indexes` that every expected table, the three enums, every index and constraint in the SQL, and `users.last_workspace_id` exist (D28), and, because the test helper applies each statement with no catch, any error (including 42P07, 42710, 42P16, 42701, 42704) fails the test by construction (D28). Verify: `npx tsc --noEmit`, then print `NODE_ENV`, confirm the local DB on port 5434, run `npm run migrate` twice and assert that the first run's output contains `✓ 0001_workspaces_people.sql` and does not contain "already present", then the test.
- [x] 1.3 BE: membership choke point and guards (AC3, AC10, AC18). First add the coded 403: `src/errors/CodedForbidden.ts` (`CodedForbiddenError(message, code)`), export it from `src/errors/index.ts`, and add the one `instanceof CodedForbiddenError` branch in `src/middlewares/error.ts` that adds `code` to the error body (D27). Add `send-response.ts` option `{ log?: boolean }` (default true) with a test that existing callers still log and `{ log: false }` does not (D29). Add the shared `idString` (D7). `MembershipService.resolve`, `requireMembership`, `requireWorkspaceRole`, doc comment on `requireAdmin`, `GET /me/memberships`, `PUT /me/last-workspace`. Tests: non-member 404, deactivated 404, platform admin without Membership 404, Staff on an Admin route 403, no token 401, role in body ignored, stale last Workspace returns null, two Workspaces with two roles (AC2), a cache entry with no `id` gets 401 (AC18), a deleted or suspended user gets 401, a non-digit or over-length id param gets 400, and the ids `"0"`, `"007"`, `"2147483648"` and `"9999999999"` each get 400 as a param and as a body field. A route test throws `CodedForbiddenError` and asserts the body is `{ error: { message, code } }`, and that a plain `ForbiddenError` body has no `code`. Verify: `npx vitest run tests/membership.test.ts tests/workspace-guards.test.ts tests/send-response.test.ts`.
- [x] 1.4 BE: workspace module (AC1, AC9, AC12). `POST /workspaces`, `GET /workspaces/slug-available`, `GET` and `PATCH /workspaces/:wsId`, audit module. Tests: happy path shape, field errors, reserved and malformed slug 400, duplicate slug 409 in different case, unverified 403, slug not patchable, Staff patch 403, other Workspace 404, creation is atomic (forced audit failure leaves no Workspace), reserved list equals the frontend list, unknown key 400 (`.strict`, status only, the field map key is the parent path), empty `PATCH` body 400, Head `PATCH /workspaces/:id` 403, a stale cache entry saying verified for an unverified row gets 403 `EMAIL_NOT_VERIFIED` and the body carries `code` (AC18), deleted user 401, slug "-bad-" and "a--b" 400. Verify: `npx vitest run tests/workspace.test.ts`.
- [x] 1.5 BE: space module (AC8, AC13). List, create, patch (rename, Head, archive, restore, `kpiTemplate`). Tests: name clash in any case 409, archive with members 409, Head edits own template 200 and another Space 403, Head sends `name` 403, Head appointment outside the Space 400, appointing replaces the old Head, 51st Space 422, foreign Workspace 404, Staff `POST` and `PATCH` Space 403, empty `PATCH` body 400, unknown key 400, non-digit Space id 400, same `headMembershipId` as current Head 200 and no change, rename and restore and `kpiTemplate` write `space.updated`, a Head swap writes `space.updated` plus two `role.change` rows (AC14), `PATCH` with a Space id from another Workspace 404. Verify: `npx vitest run tests/space.test.ts`.
- [x] 1.6 BE: members module (AC5, AC14). Roster (email for Admin only), `PATCH` member with the rules in design.md. Tests: demote or deactivate the last Admin 409, two concurrent demotions leave one Admin, Admin with a Space 400, Staff to Head when the Space has a Head 409, deactivated Head frees the Head slot, reactivate over the limit 422, non-Admin patch 403, foreign membership id 404, audit rows exist and hold no email, promote Staff to Head with an empty slot then `GET spaces` shows `headMembershipId`, Admin whose user is soft-deleted or suspended is not counted as an active Admin or a seat (AC19, three cases: last-Admin, seats, `memberCount`), Head `PATCH /members/:id` 403, `PATCH` member with a Space from another Workspace 400, empty body 400, unknown key 400, non-digit id 400. Verify: `npx vitest run tests/members.test.ts`.
- [x] 1.7 BE: invitations (AC4, AC6, AC7, AC11). Create, list, revoke, preview, accept, email template `src/emails/invitation/html.hbs`, `EmailTemplates.INVITATION`. Tests: Head inviting Admin 403, Head inviting into another Space 403, Staff inviting 403, seats count pending invites 422, a batch over the limit creates none, revoke frees a seat, expired token (clock moved 7 days) 404, accept twice and concurrent accepts give one Membership, wrong email 403, unverified 403, existing member 409, token stored only as sha256, `inviteUrl` absent from the list response, no token or email in captured log output, queue failure still returns 201. Review additions: add `inviteurl` to `SENSITIVE_KEYS` in `src/helpers/log-redact.helper.ts` with a case in `tests/log-redact.test.ts` (D29). All new controllers (tasks 1.3 to 1.7) call `sendSuccessResponse` with `{ log: false }`. The log test uses `tests/helpers/log-capture.ts` (`console.*`, `process.stdout.write`, `process.stderr.write`) during `GET members` as Admin, invitation create and accept, and asserts no email, raw token or `inviteUrl` value appears. Email job: add `EmailJobNames.INVITATION = "invitation"` in `src/enums/queue/queue.enums.ts`, an optional `opts?: JobsOptions` third parameter on `BaseQueueService.add` (spread last, existing callers unchanged, with a test), and enqueue with `removeOnComplete: true`, `removeOnFail: { age: 86400 }`, `message.subject` "You are invited to join {workspaceName} on Reportlee" and `idempotencyKey = "invitation:" + invitationId`; a test asserts these options and that a retry with the same key is deduplicated. Duplicate invite messages: active member or pending gives the shared message, a deactivated member gives "That person already has an account here. Reactivate them from People." Re-accept: a deactivated Membership on an `accepted` row by the same user gets 409, not 200. Zod `unrecognized_keys` tests assert status 400 only. Bad body 400: batch of 0, 6, duplicate email in the batch, invalid email, `head` without `spaceId`, `admin` with `spaceId`, unknown key, over-length email. Wrong role 403: Staff `GET /invitations`. Cross-workspace: revoke an invitation from another Workspace 404, Head revoking another inviter's invitation 403, Head list shows own Space rows only. Preview masks the email, a revoked token 404, re-accept by the same user returns 200 with one Membership, accept into an archived Space 409, accept as Head when the slot is taken 409 and the invitation stays pending, accept with a deactivated Membership 409 with the "access was turned off" message and the invitation stays pending, accept with an active Membership 409. Verified state read from the user row: stale cache says verified but the row does not gives 403 `EMAIL_NOT_VERIFIED` on create, preview and accept, and the body carries `code`; wrong email gives `INVITE_EMAIL_MISMATCH`. Expiry: revoke on an unswept expired row 200, on a swept row 404 (AC20), expired rows do not count as seats. Concurrency: two simultaneous invitation creates near the seat limit leave at most the limit. Verify: `npx vitest run tests/invitation.test.ts`.
- [x] 1.8 BE: Gate 3. `npx biome check <touched files>`, `npx tsc --noEmit`, `npm run check:circular` (only the known cycle), the touched suites, then once `npm test` and `npm run build`. Record counts and durations in Validation. Fix and rerun everything on any failure.

## 2. Frontend (repo `reportlee-frontend`, branch `feat/workspaces-people`). Starts only after 1.8 passes.

- [x] 2.1 FE: API layer (AC12). Create `src/lib/api.ts` by moving `request` and `authed` from `auth.ts` with no logic change, add `api-types.ts`, `workspaces.ts`, `spaces-api.ts`, `members.ts`, `invitations.ts`. Tests first: `scripts/api.test.ts`, `scripts/workspaces-api.test.ts`, `scripts/invitations-api.test.ts` with an injected `fetch` (envelope parsing, string ids, 400 field map, 403 with and without `code`, 404, 409, 422, network error). Verify: `npm test` (the existing auth suites pass untouched) and `npx tsc --noEmit`. Stop and ask if `auth.ts` needs a logic change.
- [x] 2.2 FE: shell and switcher (AC2, AC16). Client `ShellProvider` loads `GET /me/memberships`, skeleton, retry error, redirect to `/onboarding` when empty, switch via `PUT /me/last-workspace`, remove the sample arrays from `src/data/viewer.ts`. Files: `app/dashboard/layout.tsx`, `components/dashboard/shell*.tsx`, `workspace-switcher.tsx`, `create-workspace-dialog.tsx`. Verify: `npx tsc --noEmit`, `npm test`, `npm run build`.
- [x] 2.3 FE: onboarding (AC1, AC9, AC16). Workspace, Spaces and Team steps call the API as in design.md. Debounced slug check, field errors beside fields, resumable Space creation, Copy link per invited row. `onboarding.ts` keeps validation only. Verify: `npm test` (`onboarding-access.test.ts` still passes), `npx tsc --noEmit`, `npm run build`.
- [x] 2.4 FE: People and Spaces (AC4, AC5, AC6, AC8, AC13, AC16). `components/people/*`, `setup-banner.tsx`. Loading, empty and error states, server 409 and 422 messages, UI guards kept as explanations. The seat bar passes `invitations.filter(i => !i.expired).length` to `seatUsage` (AC20). Verify: `npm test` (`people.test.ts`, `spaces.test.ts`), `npx tsc --noEmit`, `npm run build`.
- [x] 2.5 FE: invite page (AC7, AC17). `app/invite/[token]/page.tsx`, `components/invite/*`, pure `pendingInvite` helper with a test. States: signed out, loading, ready, invalid, wrong email (`code` INVITE_EMAIL_MISMATCH), unverified (`code` EMAIL_NOT_VERIFIED), accepted, already a member, access turned off. The page branches on `code`, never on message text. Verify: `npm test`, `npx tsc --noEmit`, `npm run build`.
- [x] 2.6 FE: Gate 3. `npx biome check <touched files>`, `npx tsc --noEmit`, `npm test`, `npm run build`, and `rg -n "[\u2014\u2013]" <touched files>` with no hit in a user-facing string. Confirm no new dependency. Record in Validation.

## 3. Docs, approval and review

- [ ] 3.1 FE: `docs/ROADMAP.md` rows. Backlog lines: stale `AGENTS.md` backend notes ("backend does not exist", "journal stops at 0004"), missing generator for `src/data/members.ts`, roster pagination, invitation resend, Head picker in onboarding, Super Admin plan limits, last Admin deleting their account (D22), em dashes found in untouched files if any, **unlimited Workspace creation and invite emails (P10): unlimited invite emails could get the owner's Gmail sender (about 500 a day) suspended**, framework logs print emails in Zod 400 request logs because `email` is not in `SENSITIVE_KEYS`, `EmailWorkerService` logs `recipient` for every job, and older routes still log full responses through `sendSuccessResponse` (new routes opt out with `{ log: false }`).
- [ ] 3.2 Owner approval of this change (migration, permissions, token in a response body). Not a build step. Record the answer on P1 to P10. Approval summary line for the owner: **P10 abuse limits default to none (decided B). Unlimited invite emails could get the owner's Gmail sender (about 500 a day) suspended. Say "A" at approval to add a cap of 5 Workspaces per user and 20 invitation emails per Workspace per hour.**
- [ ] 3.3 Gate 4: fresh-context review with three lanes (spec conformance, behaviour against ACs, command-running), at most 2 rounds.

## Validation

Spec validation, iteration 2 after the design review (the em dash search over the change folder and docs/ROADMAP.md found no hit), run on branch `feat/workspaces-people` (docs only, so no lint, tests or build):

```
$ openspec validate workspaces-people --strict
Change 'workspaces-people' is valid
```

Spec validation, iteration 3 after design review round 2 (12 findings resolved, docs only, em dash search over the change folder found no hit):

```
$ openspec validate workspaces-people --strict
Change 'workspaces-people' is valid
```

Build validation sections for the backend (below) and the frontend are filled in at Gate 3 (tasks 1.8 and 2.6).

Approval record: 2026-11-16, owner (pre-approved via orchestrator) approved design direction, defaults P1 to P9, P2, P9 and no rate limits (P10); no new owner-level decision after spec fix round 3. Open design-review-2 items are NITs only.

### Backend build validation (task 1.8), branch `feat/workspaces-people`, 2026-11-16

Environment: Windows, `NODE_ENV=development` for the migration (printed before running; shell value empty, `.env.development` supplies `development`), database `app` on Docker `app-db`, `localhost:5434` (confirmed local, not production). Tests use database `app_test` on the same container (`.env.test` `POSTGRES_URI` now points at it, host `localhost`, name ends in `_test`; the file is tracked, value not printed). `migrate:rebuild` and `rebuild-db.ts` were never run.

```
$ npm run migrate          (run 1, 45.6 s)
  ~ 0000_clear_rage.sql (already recorded)
  [applied] 0001_workspaces_people.sql        -> "1 applied, 1 skipped."
$ npm run migrate          (run 2, 32.5 s)
  ~ 0000_clear_rage.sql (already recorded)
  ~ 0001_workspaces_people.sql (already recorded)  -> "0 applied, 2 skipped."
```
Note: run 1 printed the success line for 0001 and did not print "already present". (The success glyph is mangled by the Windows console code page, so the check was on the "1 applied" count and the absence of "already present".)

Red then green (each by switching the router mount off, running the suite, restoring it, running again):

| Step | Suite | Red | Green |
|---|---|---|---|
| 1.2 migration | `tests/migration-0001.test.ts` | migration file moved away: 3 suites fail (ENOENT) | 8 of 8 pass, 15.7 s |
| 1.3 guards, /me | `tests/membership.test.ts` | 14 of 14 fail | 32 of 32 pass with `tests/workspace-guards.test.ts`, 28.4 s |
| 1.4 workspaces | `tests/workspace.test.ts` | 27 of 29 fail | 29 of 29 pass, 20.8 s |
| 1.5 spaces | `tests/space.test.ts` | 18 of 19 fail | 19 of 19 pass |
| 1.6 members | `tests/members.test.ts` | 22 of 23 fail | 23 of 23 pass |
| 1.7 invitations | `tests/invitation.test.ts` | 39 of 39 fail | 39 of 39 pass, 40.7 s |
| shared | `tests/invite-support.test.ts`, `tests/helpers-smoke.test.ts` | n/a | 3 of 3 and 3 of 3 pass |

Gate 3 chain:
```
npx biome check <79 touched .ts files>    9 s    no errors, 1 warning (useOptionalChain, style, in invitation.service.ts)
npx tsc --noEmit                          72 s   0 errors
npm run check:circular                    45 s   1 cycle: user.model.ts > user-role.model.ts (the known one, no new cycle)
npm test (full suite, once)               222.8 s wall  21 files passed, 216 tests passed, 0 failed
                                          (vitest: setup 117.9 s, tests 76.8 s)
npm run build                             9 s    "Build complete."
```
Em dash search over the touched `src/` files: 2 hits, both in old comments of files not changed in those lines (`src/db/postgres.schema.ts:1`, `src/modules/user/user.service.ts:352`); no user-facing string.

Deviations and notes for reviewers:
- Field errors for service-level rules (a Space on an Admin, a missing Space, a bad Head target) are returned as `400 { message }`, not as a Zod field map, because they are thrown from services. Zod body and param failures still return the field map.
- Controllers read the Zod-validated body (`validatedBody(c)`), because `c.req.json()` returns the raw body and skips trim and lower-casing. `ZodEngine.validate.body` gained an optional `{ log: false }` (default unchanged) so invitation bodies (email, token) are not logged on success or on a 400.
- `getReader()` in `src/db/postgres.db.ts` casts the pool handle to `Tx` so one set of `(tx, ...)` repository functions serves reads and locked writes.
- `throwUnprocessableError` and `UnprocessableError` (422) were added; no existing helper covered 422.
- `membership.service.ts` imports `space.repository` functions directly (head slot, Space lookup) to avoid a service-level import cycle between membership and space.
- A deactivated Head keeps `role = head` with the Space slot cleared; reactivation re-takes the slot if empty, else 409 `HEAD_EXISTS`.
- The two-Admin concurrency test sends both requests from one caller, so both pass the guard before either commits. When two different Admins demote each other, the loser can get 404 (the winner already removed them) instead of 409; both leave one Admin.
- Design review 2 had 0 HIGH open (verdict APPROVED, two NITs: the `send-response.ts` path and the `Tx` type source). Both are honoured in the build: `src/helpers/response/send-response.ts` is the file changed and `Tx` derives from `ReturnType<typeof getDb>`. No HIGH to fix.
- Docker Desktop was found stopped mid-run (the `app-db` and `app-cache` containers had exited); only those two containers were restarted, the `stockpulse-*` ones were left alone.
- Windows line endings: files are stored LF in the working tree and git warns it will convert to CRLF. The migration runner hashes file content, so a CRLF checkout of `0001_workspaces_people.sql` would hash differently and re-run the (idempotent) file once. Same applies to `0000`. Worth a `.gitattributes` Backlog line.

### Iteration 1: cross-part integration check and Gate 3, both repos (2026-11-16)
Seams checked by reading both sides (no mismatch found):
- Paths: `/me/memberships`, `/me/last-workspace`, `/workspaces`, `/workspaces/slug-available`, `/workspaces/:wsId`, and its `/spaces`, `/members`, `/invitations`, plus `/invitations/preview` and `/invitations/accept`, match `src/lib/{workspaces,spaces-api,members,invitations}.ts` and the backend `router.ts`.
- DTOs: `WorkspaceDto`, `MembershipDto`, `SpaceSummaryDto`, `RosterMemberDto`, `InvitationDto` and the preview body match `src/lib/api-types.ts`, `src/data/viewer.ts` and `src/data/members.ts` field by field. Ids are strings on both sides.
- Errors: a coded 403 sends `error: { message, code }` (`error.ts`) and the frontend reads `error.code` (`EMAIL_NOT_VERIFIED`, `INVITE_EMAIL_MISMATCH`). A Zod 400 sends a flat field map, which `extractError` reads.
- Fix made: one Biome warning (`useOptionalChain`) in `invitation.service.ts` revoke. Behaviour is unchanged.

Backend (`check:circular` allowed only the known `user.model <-> user-role.model` cycle):
```
biome check (79 touched files)   exit 0    14 s   0 errors, 0 warnings
tsc --noEmit                     exit 0   118 s
check:circular                   exit 0    33 s   1 cycle, the known one
vitest (9 touched suites)        exit 0   297 s   156 tests passed (setup 142 s; over the 3 minute cap)
npm test (full)                  exit 0   158 s   21 files, 216 tests passed, 0 failed
npm run build                    exit 0     9 s   Build complete.
```
Frontend:
```
biome check (34 touched files)   exit 0     4 s
tsc --noEmit                     exit 0    33 s
npm test                         exit 0    17 s   275 passed, 0 failed
npm run build                    exit 0    64 s
```