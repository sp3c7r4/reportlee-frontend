## Context

Backend `reportlee-backend` (Hono, Drizzle, Postgres, Redis, BullMQ, Zod, Vitest, Biome with tabs, alias `@/` = `src/`) has no Workspace, Space or Membership. It has `user_roles` (global `admin | member`) and guards that read it on every call (`src/middlewares/auth/guards.ts`). Frontend `reportlee-frontend` (Next.js 16, React 19, strict TypeScript) reads mock arrays in `src/data/viewer.ts` and `src/data/members.ts`. The rules are already coded in `src/lib/people.ts`, `spaces.ts` and `onboarding.ts`. The stack is locked as above. **No new dependency in either repo.**

Inputs: `.agents/tasks/backend-endpoints-gate0.md` (Gate 0), `.agents/tasks/workspaces-people/brief.md` and `plan.md`. Fixed owner decisions, not re-asked: **D-Q1** roles staff, head, admin live on a Membership and `user_roles` is unchanged (`admin` there is the platform Super Admin). **D-Q2** many Workspaces per user, one Membership per (user, Workspace). **D-Q3** any signed-in user creates a Workspace and becomes Admin, everyone else joins by invitation only.

Out of scope: reports, schedule, KPI values, periods, notifications beyond the invite email, an audit read endpoint, the Super Admin console, billing, subdomain routing, Google sign-in.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Workspace roles `staff`, `head`, `admin` are a new pg enum `membership_role` on `memberships`. `user_roles` and `user_role` are not touched. (D-Q1) | `user_role` also types `notifications.role`; coupling would break it. |
| D2 | One Membership per (user, Workspace), unique `(user_id, workspace_id)`. People are deactivated, never deleted. (D-Q2) | History stays attributed (CONTEXT.md). |
| D3 | `POST /workspaces` needs a verified email and makes the caller Admin. Joining an existing Workspace is by invitation only. (D-Q3) | No self-join. |
| D4 | One choke point: `MembershipService.resolve(userId, workspaceId)`. It reads the DB on every call and is the only code that decides role or Space. | Deactivation must take effect at once, same pattern as `roleOf` in `guards.ts`. |
| D5 | A non-member and a missing Workspace both get 404 with the same body. A member with too low a role gets 403. | Does not leak that a Workspace exists. |
| D6 | Every write that depends on a count (last Admin, seats, Head slot) runs in `getDb().transaction(async (tx) => ...)` that first locks the Workspace row (`SELECT ... FOR UPDATE`). Lock order is always the Workspace row first. All SQL inside such a transaction goes through plain functions in each module's `*.repository.ts` with the signature `(tx: Tx, ...)`. `type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0]` is exported from `src/db/postgres.db.ts`. These functions do not extend `RelationalRepository` (the design needs explicit control of soft-delete and `deleted_at` filtering). Cross-module calls go service to service and pass `tx`. Reads outside a transaction use the normal `RelationalRepository` singletons. (Round 2 finding 2) | One lock is simpler than three and rules out deadlocks. Concurrent requests serialise per Workspace. A Drizzle transaction is a different type from `DbClient`, so the singleton repositories cannot take it. |
| D7 | Database ids stay `integer generated always as identity`. The API serves every id as a string and accepts ids as digit strings. One shared Zod `idString = z.string().regex(/^[1-9][0-9]{0,9}$/).refine(v => Number(v) <= 2147483647)` is used for every param, body field and `workspaceId`, so an id past the integer range is a 400 and never a Postgres 22003 (500). (Round 2 finding 6) | Matches existing tables and the frontend's string ids. |
| D8 | New `GET /me/memberships` instead of extending `/auth/me`. | Keeps auth responses byte-identical (AGENTS.md: auth changes stop for approval). |
| D9 | Invitation token: 32 random bytes, base64url, shown once. The database stores sha256 hex. The email job in Redis necessarily carries the link (see P2 and rule 6 for its retention). 7 day expiry. Acceptance is one conditional `UPDATE ... WHERE status='pending' AND expires_at > now()` plus a row count check. | Single use holds under concurrent accepts. |
| D10 | `invitation_status` has `pending`, `accepted`, `revoked`, `expired`. Before any create in a Workspace, pending rows past `expires_at` are set to `expired` in the same transaction. | Frees the partial unique indexes and seats without a scheduler. |
| D11 | The roster list is not paginated in this slice: `data` is an array, hard cap 1000 rows. | Screens filter client-side today and Starter caps at 10. Deviates from plan.md (pagination meta). Pagination goes to Backlog. |
| D12 | A Head is set only through `PATCH /spaces/:spaceId` (`headMembershipId`). `PATCH /members/:id` with `role: "head"` is allowed only when the Space has no Head or the target already is Head. | One path replaces a Head, so the one-Head rule has one owner. |
| D13 | `DELETE /invitations/:id` answers 200 `{ id, status }`, not 204. | `sendSuccessResponse` always writes the envelope. |
| D14 | Audit rows are written in the same transaction as the change. Summaries hold ids and role names, never emails, names or tokens. | AGENTS.md logs rule. |
| D15 | The slug is stored, validated and unique. Nothing routes by it yet. The frontend routes by the held `workspaceId`. | No domain yet. |
| D16 | The dashboard loads Memberships client-side with a skeleton. `layout.tsx` stays a server component for the theme cookie only. | The access token lives in memory (`tokens.ts`), so a server component cannot call the API. |
| D17 | `request` and `authed` move from `auth.ts` to `src/lib/api.ts` unchanged. | Later slices reuse one client. |
| D18 | Backend tests run against a real local Postgres through a new helper under `tests/helpers/`. There is no `TEST_DB_URI`: the pool in `src/db/postgres.db.ts` is built from `config.db.uri` (`POSTGRES_URI`) at import time, before any helper runs. The suite runs only when `POSTGRES_URI` (from `.env.test` or the shell) points at `localhost` or `127.0.0.1` and the database name ends in `_test`. `vitest.config.ts` is not touched. | AGENTS.md Gate 2. Guards and last-Admin are SQL behaviour. |
| D19 | Workspace `PATCH` accepts `name`, `timeZone`, `locationTagging` only. `aiFeatures` is served read-only. `editWindowMinutes` has no column yet. | AI gating needs the plan matrix and the edit window belongs to reports. Deviates from the Gate 0 table. |
| D20 | Migrations stay hand-written SQL. The Drizzle snapshot is not maintained. Models are the type source. | Gate 0 default. |
| D21 | Accepting an invitation does no seat check: the pending invitation already holds the seat. | Net seat change is zero. Deviates from plan.md (422 at accept). |
| D22 | Existing `DELETE /user/account` is not changed. A last Admin deleting their account is a known gap, logged to Backlog. `resolve` ignores soft-deleted users. | Changing an existing endpoint needs its own approval. |
| D23 | New API types live in `src/lib/api-types.ts`. The generated `src/data/members.ts` is not hand-edited. | AGENTS.md says do not hand-edit it. |
| D24 | Caller id is `Number(authData.id)`, the same field `guards.ts` reads. `IAuthData` does not declare `id`, so the new guards read it through a typed helper `callerId(c)` that returns 401 "Authentication required." when it is missing or not a positive integer. Verify at build that `auth.service.ts` writes `id` into the cache entry. If it does not, `callerId` falls back to `grabUserIdFromAuthId(authId)`. (Review 3) | One reader, one failure path, and a test pins it. |
| D25 | Anything that depends on the caller's email or verified state reads the **user row**, never the Redis snapshot (30 minute TTL). `POST /workspaces`, `POST /invitations/preview` and `POST /invitations/accept` call `UserService.assertVerified(userId)`: it loads `email`, `email_verified`, `deleted_at`, `suspended_at` by id, answers 401 "Authentication required." for a deleted or suspended user, 403 `EMAIL_NOT_VERIFIED` for an unverified one, and returns the lower-cased email. `requireEmailVerified` is not used on these three routes. (Review 2) | The invitation's email binding is what stops a leaked link being used by someone else. A cached claim cannot carry that. |
| D26 | **Active Membership** means `memberships.active = true` joined to `users` with `users.deleted_at IS NULL AND users.suspended_at IS NULL`. It is the only definition used by last-Admin, seats, `memberCount`, Head candidates and the roster. (Review 6) | A Workspace whose only Admin deleted their account must count zero Admins, not one. |
| D27 | 403 errors on the email checks carry a stable machine code beside the message: `{ "message": "...", "code": "EMAIL_NOT_VERIFIED" }` or `"INVITE_EMAIL_MISMATCH"`. The code is additive. The frontend branches on `code`, never on message text. Services have no Hono context, so they throw a new `CodedForbiddenError(message, code)` (`src/errors/CodedForbidden.ts`, `extends HTTPException`, status 403, exported from `src/errors/index.ts`). `errorHandler` in `src/middlewares/error.ts` gets one additive branch: when `err instanceof CodedForbiddenError` it adds `code: err.code` to the object it passes to `sendErrorResponse`. Every other error body stays byte-identical. The guards throw the same class. A route test asserts the body is `{ error: { message, code } }`. (Review 10, round 2 finding 1) | `errorHandler` drops everything but `message`, so a code can only reach the client through the error class. A string match on copy breaks the first time the text changes. |
| D28 | A migration that would reach the runner's swallow path (codes 42710, 42P07, 42P16, 42701, 42704) is a build failure, not a pass. The test helper applies each statement with no catch, so any error (including those five codes) fails the test by construction. `npm run migrate` is run twice against the local DB and the first run's output must contain `✓ 0001_workspaces_people.sql` and must not contain "already present". A schema assertion test lists every expected table, enum, index, constraint and the `users.last_workspace_id` column after the migration. (Review 4, round 2 finding 4) | The runner records the file as applied after swallowing, so objects could be silently missing. |
| D29 | Log control. `sendSuccessResponse` in `src/helpers/send-response.ts` gets a fourth optional parameter `options?: { log?: boolean }`, default `true`, so every existing caller is byte-identical. Every new controller passes `{ log: false }`, so the roster, invitations, `/me/memberships` and create responses (names, emails, links) are never written to logs. `inviteurl` is also added to `SENSITIVE_KEYS` in `src/helpers/log-redact.helper.ts` with a case in `tests/log-redact.test.ts`, as defence in depth. `email` is **not** added to `SENSITIVE_KEYS`, because that changes existing log output. The log promise is "no email, token, link, OTP or password in response logs for these routes". The Zod failure line (`ZodEngine.handleResult` logs the parsed request on a 400) still logs a body that can hold an email, so that one stays a Backlog line. (Review 1, round 2 finding 8) | AGENTS.md: never log personal data. This slice is what adds the volume, so it fixes it per call and leaves old routes alone. |
| D30 | `setupState` is derived in the client from `GET spaces`, `GET members` and `GET invitations`. The server enforces nothing about it and there is no endpoint. (Review 14) | It is guidance for the banner, not a rule. |

### Planner decisions (recommended defaults, MARKED FOR THE OWNER)

Each is applied in this design. Reply "as recommended" to accept all.

| # | Question | Recommended default | Alternative if refused |
|---|---|---|---|
| P1 | Plan and seats | Every new Workspace is `starter`, `member_limit` 10, no billing, no trial columns. The server enforces the limit (members plus pending invitations). Raising a limit is a database update for now. | Gate 0 suggested a 30 day Team trial. Rejected: it needs plan status and trial logic, which is money territory. |
| P2 | Invitation delivery | Email through `EmailQueueService` plus a copyable link `<FRONTEND_URL>/invite/<token>`. The create response returns the link once, to the inviter only. It is not stored in the database (only the hash) and not written to any log or list response. It is held in the email job in Redis until the job is removed (see Invitation create rule 6). No resend in this slice. | Email only, no Copy link button. Removes the only token in a response body. |
| P3 | Memberships endpoint | New `GET /me/memberships`. `lastWorkspaceId` stored in `users.last_workspace_id` (one nullable column). `/auth/me` unchanged. | Add fields to `/auth/me` (changes an existing response, needs approval). |
| P4 | Invited email at signup | No auto-accept. A logged-out visitor on `/invite/<token>` is told to sign in or sign up with the invited address and goes to login or signup. The page keeps the token in `sessionStorage` under `reportlee.pendingInvite` (tab-scoped, removed on use) so the post-login landing can return to `/invite/<token>`. No change to the auth module or forms. | Pass the token as `?next=` through the auth forms (touches auth files, needs approval). |
| P5 | Head invitations | The backend accepts `head`, `staff` and `admin` invites. The onboarding step stays Staff and Admin only (CONTEXT.md). The People invite form offers Head to Admins. | The backend refuses `head` invites until the Space picker lands. |
| P6 | Slug | Stored and validated only (D15). `RESERVED_SLUGS` is copied to a backend constant and a test asserts both lists match. | None. |
| P7 | Audit | Rows for `workspace.created`, `workspace.updated`, `space.created`, `space.updated` (rename, restore, `kpiTemplate`, Head set or cleared), `space.archived`, `role.change`, `member.deactivated`, `member.reactivated`, `invitation.sent`, `invitation.revoked`, `member.joined`. A Head swap also writes one `role.change` per Membership whose role flips. Summaries hold ids and key names only. No read endpoint. | None. |
| P8 | Deactivation | Soft. History kept. Frees the seat. A deactivated Head clears the Head slot. Reactivation re-checks seats. | None. |
| P10 | Abuse limits (review finding 11) | **No limits in this slice.** Any verified user may create Workspaces and each may hold 10 pending invitations, so platform email can be sent to arbitrary addresses. Known risk, logged to Backlog: unlimited invite emails could get the owner's Gmail sender (about 500 a day) suspended. The seat limit (D21, P1) already caps pending invitations at 10 per Workspace. | Cap Workspaces at 5 per user (422 "You have reached the Workspace limit.") and invitation emails at 20 per Workspace per hour. Needs a count query or Redis counter and tests. Switch here at approval if wanted. |
| P9 | Roster visibility (ambiguous in the sources) | Every active member sees the roster (name, role, Space, active). Only Admins see emails and deactivated members. Every member sees the Spaces list. | Admin and Head only. AGENTS.md says to ask on what a member may see, so this needs a yes. |

## Backend

All routes are under `/api/v1` and behind `jwtService.validateToken` (applied with `router.use` per module, as in `src/modules/user/user.routes.ts`). Success envelope: `{ timestamp, status, success: true, data }`. Error envelope: `{ timestamp, status, success: false, error }` where `error` is `{ "message": "..." }`, except Zod failures (400) where `error` is a flat map of field path to message, for example `{ "slug": "Use 3 to 32 lowercase letters, digits or hyphens." }` (this is what `ZodEngine.handleResult` already sends). Messages live in each module's `*.message.ts`, contain no em dash, and never include SQL or a stack trace.

Guard order on every `/workspaces/:wsId/*` route: `validateToken` (401), `callerId` (401, D24), Zod params (400), `requireMembership` (404), `requireWorkspaceRole(...)` (403), then the service-level ownership or rule check. Routes 4, 15 and 16 call `UserService.assertVerified` (D25) right after `validateToken` instead of `requireEmailVerified`. The guards live in `src/middlewares/auth/workspace-guards.ts`. Neither reads `user_roles`. `requireAdmin` is unchanged and gets a doc comment saying it is platform Super Admin only.

### Shared JSON shapes (all ids are strings)

```json
Workspace: {
  "id": "12", "name": "Acme Ops", "slug": "acme-ops", "memberCount": 3,
  "plan": "starter", "memberLimit": 10, "aiFeatures": false,
  "timeZone": "Africa/Lagos", "locationTagging": false, "readOnly": false
}
Membership: {
  "id": "31", "userId": "5", "workspaceId": "12", "role": "admin",
  "space": null, "spaceId": null
}
SpaceSummary: {
  "id": "9", "name": "Platform", "headMembershipId": null, "archived": false,
  "kpiTemplate": [{ "name": "Tickets closed", "unit": "count" }], "memberCount": 2
}
RosterMember: {
  "membershipId": "31", "name": "Ada Obi", "role": "staff", "space": "Platform",
  "spaceId": "9", "active": true, "joinedAt": "2026-11-16T09:00:00.000Z",
  "email": "ada@example.com"
}
Invitation: {
  "id": "4", "email": "new.person@example.com", "role": "staff", "space": "Platform",
  "spaceId": "9", "sentAt": "2026-11-16T09:00:00.000Z", "invitedByMembershipId": "31",
  "expired": false
}
```

`memberCount` on Workspace and Space is the number of active Memberships (D26). `email` on RosterMember is present only for Admins. `space` is the Space name (kept so existing screens that match by name keep working) and `spaceId` is the id. `memberLimit` is `null` for no limit. `sentAt` is `invitations.created_at`. The names in these shapes are mirrored in the frontend `src/lib/api-types.ts`.

### Endpoints

All object schemas are `.strict()`: an unknown key is a 400 and no write happens. The field map key is the parent path (`""` at the root of the body) and the message names the key, because Zod's `unrecognized_keys` issue carries the parent path. Tests assert status 400 only, not the field name. Ids in params and bodies use the shared `idString` (D7): digit strings with no leading zero, at most 2147483647.

| # | Method and path | Guards | Request | Success | Errors |
|---|---|---|---|---|---|
| 1 | `GET /me/memberships` | validateToken | none | 200 `{ "user": {"id","name","email"}, "memberships": Membership[], "workspaces": Workspace[], "lastWorkspaceId": "12" or null }`. `name` is first plus last name. Only active Memberships in non-deleted Workspaces. `lastWorkspaceId` is null when it is not among them. | 401 |
| 2 | `PUT /me/last-workspace` | validateToken, then ownership: the caller has an active Membership in that id | body `{ workspaceId: digit string }` | 200 `{ "lastWorkspaceId": "12" }` | 400 field, 401, 404 "Workspace not found." |
| 3 | `GET /workspaces/slug-available?slug=` | validateToken | query `slug`: required string, max 64 | 200 `{ "available": true }` or `{ "available": false, "reason": "taken" or "reserved" or "invalid" }` | 400 when `slug` is missing, 401 |
| 4 | `POST /workspaces` | validateToken, `UserService.assertVerified` (D25) | `{ name: trim 2..120, required; slug: 3..32 matching ^[a-z0-9]+(-[a-z0-9]+)*$, required; timeZone: IANA name, max 64, optional, default "UTC" }` | 201 `{ "workspace": Workspace, "membership": Membership }`. One transaction: workspace row, Admin Membership, audit `workspace.created`, `users.last_workspace_id`. | 400 field errors (a reserved slug is a field error on `slug`), 401 (also deleted or suspended user), 403 `EMAIL_NOT_VERIFIED`, 409 slug taken (case-insensitive) |
| 5 | `GET /workspaces/:wsId` | validateToken, requireMembership | none | 200 `Workspace` | 401, 404 |
| 6 | `PATCH /workspaces/:wsId` | validateToken, requireMembership, requireWorkspaceRole("admin") | `{ name?: 2..120, timeZone?: IANA <= 64, locationTagging?: boolean }`, at least one key. `slug` or any other key is rejected. | 200 `Workspace`. Audit `workspace.updated`. | 400, 401, 403, 404 |
| 7 | `GET /workspaces/:wsId/spaces` | validateToken, requireMembership | none | 200 `SpaceSummary[]` ordered by name, archived included | 401, 404 |
| 8 | `POST /workspaces/:wsId/spaces` | validateToken, requireMembership, requireWorkspaceRole("admin") | `{ name: trim 1..80 }` | 201 `SpaceSummary`. Audit `space.created`. | 400, 401, 403, 404, 409 name clash (lower-case compare), 422 more than 50 Spaces |
| 9 | `PATCH /workspaces/:wsId/spaces/:spaceId` | validateToken, requireMembership, requireWorkspaceRole("admin","head"), then in the service: a Head may send only `kpiTemplate` and only for the Space they head | `{ name?: trim 1..80, headMembershipId?: digit string or null, archived?: boolean, kpiTemplate?: [{ name: trim 1..60, unit: trim 0..20 }] max 20 rows }`, at least one key | 200 `SpaceSummary`. `headMembershipId` equal to the current Head is a no-op and returns 200. Audit: `space.archived` when archiving, otherwise `space.updated` (rename, restore, `kpiTemplate`, Head change, with ids and key names only), plus one `role.change` per Membership whose role flips in a Head swap. | 400 (invalid body, or the Head target is not an active member of this Space), 401, 403 (Staff, Head on another Space, or a Head sending any other key), 404 (Space in another Workspace), 409 (name clash, archive with active members, new Head already heads another Space) |
| 10 | `GET /workspaces/:wsId/members` | validateToken, requireMembership | none | 200 `RosterMember[]` ordered by name. Admin: all rows with `email`. Others: active rows, no `email`. | 401, 404 |
| 11 | `PATCH /workspaces/:wsId/members/:membershipId` | validateToken, requireMembership, requireWorkspaceRole("admin"), then the target must belong to `:wsId` | `{ role?: "staff"/"head"/"admin", spaceId?: digit string or null, active?: boolean }`, at least one key | 200 `RosterMember` (with `email`). Audit `role.change`, `member.deactivated` or `member.reactivated`. | 400, 401, 403, 404 (foreign or missing target), 409, 422 |
| 12 | `GET /workspaces/:wsId/invitations` | validateToken, requireMembership, requireWorkspaceRole("admin","head") | none | 200 `Invitation[]`, pending only, `expired` computed from `expires_at`. Head: own Space rows only. | 401, 403 Staff, 404 |
| 13 | `POST /workspaces/:wsId/invitations` | validateToken, requireMembership, requireWorkspaceRole("admin","head"), then `InvitationService.assertCanInvite` per row | `{ invitations: [{ email: trimmed, lower-cased, valid, <= 255; role: "staff"/"head"/"admin"; spaceId?: digit string or null }] }`, 1 to 5 rows, no duplicate email in the batch | 201 `Array<Invitation & { "inviteUrl": "<FRONTEND_URL>/invite/<token>" }>` in request order. Audit `invitation.sent`. Email queued after commit. | 400, 401, 403, 404, 409, 422 |
| 14 | `DELETE /workspaces/:wsId/invitations/:invitationId` | validateToken, requireMembership, requireWorkspaceRole("admin","head"), then ownership: Admin, or `invited_by_membership_id` equals the caller | none | 200 `{ "id": "4", "status": "revoked" }`. Works on any row with `status = 'pending'`, including one past `expires_at` that has not been swept. Audit `invitation.revoked`. | 401, 403, 404 (missing, other Workspace, or status not pending, which includes a swept `expired` row) |
| 15 | `POST /invitations/preview` | validateToken, `UserService.assertVerified` (D25) | `{ token: string 20..100 }` | 200 `{ "workspaceName": "Acme Ops", "role": "staff", "spaceName": "Platform" or null, "email": "n***@example.com" }` | 400, 401, 403 (`EMAIL_NOT_VERIFIED` or `INVITE_EMAIL_MISMATCH`), 404 invalid |
| 16 | `POST /invitations/accept` | validateToken, `UserService.assertVerified` (D25) | `{ token: string 20..100 }` | 200 `{ "membership": Membership, "workspace": Workspace }`. Audit `member.joined`. Sets `users.last_workspace_id`. | 400, 401, 403 (same two codes), 404, 409 |

Route order: `/workspaces/slug-available` is registered before `/workspaces/:wsId`. New routers `/me`, `/workspaces`, `/invitations` are added to `src/routes/router.ts`. Module folders copy `src/modules/user` (model, schema, repository, service, controller, routes, message, index): `workspace`, `space`, `membership`, `invitation`, `audit` (model, repository, service only) and `me`. Services call each other, never each other's repositories, so `npm run check:circular` keeps its single known cycle. Locked flows follow D6: a service opens one `getDb().transaction`, and passes `tx` to its own repository functions and to other modules' services (`MembershipService.assertNotLastAdmin(tx, ...)`, `SeatService.assertSeat(tx, ...)`, `activeMembershipsOf(tx, ...)` are service-owned, with their SQL in the owning module's `(tx: Tx, ...)` repository functions). All new controllers call `sendSuccessResponse(c, data, status, { log: false })` (D29). Touched shared files: `src/errors/CodedForbidden.ts`, `src/errors/index.ts`, `src/middlewares/error.ts`, `src/helpers/send-response.ts`, `src/helpers/log-redact.helper.ts`, `src/db/postgres.db.ts` (export `Tx`), `src/enums/queue/queue.enums.ts`, `src/bases/services/base.queue.service.ts`.

### Rules and where each is enforced

| Invariant | Owner | Why there |
|---|---|---|
| Caller role and Space | `MembershipService.resolve` (D4) | One reader. Controllers get `c.get("caller")` from the guard. |
| Role is allowed on a route | `requireWorkspaceRole` | Coarse gate, fails fast. |
| Head only edits own template | `SpaceService.update` | Needs the Space row. |
| Admin has no Space, others have one | DB CHECK on `memberships` and `invitations`, and `MembershipService.applyChange` for a clear field error | The CHECK is the last line. The service gives the message. |
| Last active Admin | `MembershipService.assertNotLastAdmin(tx, wsId, ...)` after the Workspace lock (D6) | Counts active Admins inside the lock, so two demotions serialise. |
| One Head per Space, one Space per Head | DB partial unique on `spaces.head_membership_id` plus `SpaceService.setHead` | The index catches a missed path. |
| Seats | `SeatService.assertSeat(tx, wsId, extra)` after the Workspace lock | Counts active Memberships plus pending, unexpired invitations. `member_limit` null means no limit. |
| Invite rules | `InvitationService.assertCanInvite(caller, role, spaceId)`: Admin any role, Head only `staff` into `caller.spaceId`, Staff never | Port of `inviteRules` in `people.ts`. |
| Archive guard | `SpaceService.assertCanArchive`: any active Membership with this `space_id` refuses | Port of `archiveGuard`. |
| Slug unique | DB unique index on `lower(slug)`. The service maps unique violation 23505 to 409 | The index is the only race-free check. |
| Single-use token | Conditional `UPDATE` in `InvitationService.accept` (D9) | The row count is the truth. |
| Verified email and identity | `UserService.assertVerified` reads the user row (D25) | Only the database is fresh. |
| Caller id | `callerId(c)` (D24) | One field, one 401. |
| Active Membership | One query helper `activeMembershipsOf(tx, wsId)` joined to `users` (D26) | Every count shares it. |
| Onboarding limits vs server limits | Frontend `SPACE_LIMIT` 4 and `INVITE_LIMIT` 5 are onboarding-form limits only. The server limits are 50 Spaces per Workspace and 1 to 5 rows per invitation request. A tester must not expect the server to refuse a 5th Space. | Documented so the difference is intentional (review 15). |
| `setupState` | Derived in the client, not enforced (D30) | Guidance only. |

### Member change rules (`PATCH /members/:membershipId`)

Inside the Workspace lock, with `next` = current values overlaid by the body:
1. `next.role = admin`: `spaceId` must be absent or null (else 400 on `spaceId`), and `next.spaceId = null`.
2. `next.role` is staff or head and the target is currently Admin: `spaceId` is required (400).
3. Any non-null Space must exist in this Workspace and not be archived (400 on `spaceId`).
4. `next.role = head`: requires `next.active`, and the Space's Head slot is empty or this member (409 "This Space already has a Head. Replace the Head from the Space page."). On success set `spaces.head_membership_id = target` in the same transaction. Test: promote Staff to Head with an empty slot, then `GET spaces` shows `headMembershipId`.
5. A current Head who stays Head cannot change Space (409). Leaving the Head role, or deactivating, clears `spaces.head_membership_id`.
6. A current active Admin who would no longer be an active Admin: `assertNotLastAdmin` (counts per D26) (409 "A Workspace needs at least one active Admin.").
7. `active` false to true: `assertSeat(tx, wsId, 1)` (422).
8. Write, audit, return the row.

### Space head rule (`PATCH /spaces/:spaceId` with `headMembershipId`)

Admin only. The target must be an active Staff or Head member whose `space_id` is this Space (else 400 on `headMembershipId`) and must not head another Space (409). The previous Head becomes `staff` in the same Space. `null` clears the Head and the former Head becomes `staff`. Sending the id of the current Head changes nothing and returns 200. All in one locked transaction. Each role flip (new Head to `head`, old Head to `staff`) writes a `role.change` audit row, and the Space write itself writes `space.updated`.

### Invitation create rules (per request, in one transaction)

1. Lock the Workspace. Set pending rows past `expires_at` to `expired` (D10). The sweep runs only here. Every other read treats `pending` and past `expires_at` as expired without changing it (list shows `expired: true`, seat counts skip it, accept and preview answer 404, revoke still works).
2. `assertCanInvite` per row: Head with another role is 403, Head with a Space other than their own is 403, Staff is 403. A Head's omitted `spaceId` becomes their own.
3. Role admin with a Space, or staff or head without one: 400 on `invitations.N.spaceId`. The Space must exist, belong to this Workspace and not be archived (400).
4. The email already has an active Membership here or a pending invitation: 409 "That person is already in this Workspace or has a pending invitation." The email has a deactivated Membership: 409 "That person already has an account here. Reactivate them from People." Role head where a pending Head invitation exists for that Space, or the Space already has a Head: 409.
5. `assertSeat(tx, wsId, rows.length)` once for the whole batch: 422 "This Workspace is at its member limit (10 of 10 seats used)." Nothing is created on any failure.
6. Insert rows with the token hash and `expires_at = now() + 7 days`. After commit, enqueue one email per row through `EmailQueueService` with `EmailJobNames.INVITATION = "invitation"` (new value in `src/enums/queue/queue.enums.ts`), template `EmailTemplates.INVITATION`, `message.subject` "You are invited to join {workspaceName} on Reportlee" (no em dash) and `idempotencyKey = "invitation:" + invitationId`, so a retry does not send twice. The job data holds the link, so it sits in Redis in clear while the job exists. `BaseQueueService.add` today uses fixed options (3 attempts, `removeOnComplete` age 1 hour, `removeOnFail` age 24 hours, then `...this.jobOptions` from the constructor) and takes no per-call options. Task 1.7 adds an optional third parameter `opts?: JobsOptions` to `add`, spread last, so existing callers are unchanged. Invitations pass `{ removeOnComplete: true, removeOnFail: { age: 86400 } }`: the link leaves Redis when the send succeeds, and at most 24 hours after the last failed attempt. `EmailWorkerService` logs `recipient` for every job today. That is existing behaviour for all mail and is recorded as a Backlog line, not changed here. An enqueue failure is logged at `warn` with the invitation id only and does not change the response.

### Invitation accept rules

Preview and accept run these steps in this order (review 13). Step (a) first calls `UserService.assertVerified` (D25).
- (a) Hash the token and load the row by hash. No row: 404 "This invitation is not valid. Ask for a new one."
- (b) Accept only: status `accepted`, `accepted_by_user_id` is the caller and the Membership exists and is active: return it with 200 (idempotent). If the Membership is inactive, fall through to the step (e) 409 "Your access was turned off. Ask an Admin to reactivate you." instead of returning 200. Preview on such a row answers 404.
- (c) Not `pending`, or past `expires_at`: the same 404.
- (d) The verified user-row email must equal `invitations.email` ignoring case, else 403 `INVITE_EMAIL_MISMATCH` "This invitation was sent to n***@example.com. Sign in with that address."
- (e) Accept only, one transaction with the Workspace lock:
  1. Caller has an active Membership here: 409 "You already belong to this Workspace." Caller has an inactive Membership here: 409 "Your access was turned off. Ask an Admin to reactivate you." The invitation stays pending in both cases.
  2. Space archived: 409 "This Space is archived. Ask for a new invitation." Role head and the Space has a Head: 409 "This Space already has a Head." (the invitation stays pending).
  3. Conditional update to `accepted`. Zero rows: 404 (a concurrent accept won).
  4. Insert the Membership, set `spaces.head_membership_id` if role is head, set `users.last_workspace_id`, audit `member.joined`.

### Error table (user-facing strings in `*.message.ts`)

| Condition | Status | Message |
|---|---|---|
| Not a member, or no such Workspace | 404 | "Workspace not found." |
| Role too low | 403 | "You do not have permission to do this." |
| Email not verified (`code: EMAIL_NOT_VERIFIED`) | 403 | "Email not verified. Please verify your email to continue." (same text as the existing `requireEmailVerified`, constant `EMAIL_NOT_VERIFIED_MESSAGE`) |
| Invitation sent to another email (`code: INVITE_EMAIL_MISMATCH`) | 403 | "This invitation was sent to {maskedEmail}. Sign in with that address." |
| Deleted or suspended caller | 401 | "Authentication required." |
| Existing inactive Membership on accept | 409 | "Your access was turned off. Ask an Admin to reactivate you." |
| Already an active member on accept | 409 | "You already belong to this Workspace." |
| Archived Space on accept | 409 | "This Space is archived. Ask for a new invitation." |
| Slug taken | 409 | "That address is already taken." |
| Space name clash | 409 | "{name} is already a Space." |
| Archive with members | 409 | "Move its members out before archiving this Space." |
| Last Admin | 409 | "A Workspace needs at least one active Admin." |
| Seat limit | 422 | "This Workspace is at its member limit ({used} of {limit} seats used)." |
| Active member or pending invitation on invite | 409 | "That person is already in this Workspace or has a pending invitation." |
| Deactivated member on invite | 409 | "That person already has an account here. Reactivate them from People." |
| Invitation invalid | 404 | "This invitation is not valid. Ask for a new one." |

Recoverable: every 4xx above (the caller changes the request and retries). Fatal: unexpected errors become the generic 500 from `errorHandler` with no detail. Logging: 4xx are not logged by this module. 5xx and queue enqueue failures are logged at error and warn level with ids only. Never log an email, token, link or request body from module code. Framework logging: `sendSuccessResponse` logs `redactLog(data)` by default, so the new controllers pass `{ log: false }` (D29) and none of their responses are logged. `inviteurl` is also in `SENSITIVE_KEYS` as defence in depth. `ZodEngine.handleResult` still logs the parsed body and issues on a 400, which can hold an email. The existing redaction does not cover `email`, and adding it would change existing log output, so that line stays a Backlog item.

## Data

Migration file: `reportlee-backend/src/db/migrations/0001_workspaces_people.sql`. Hand written. The runner (`app/migrate.ts`) hashes content, splits on `--> statement-breakpoint`, wraps each file in `BEGIN` and `COMMIT` on a `Pool` (which does not guarantee a single connection), and swallows "already exists" codes. So every statement is idempotent, so a partial run is safe to repeat, and nothing relies on the swallow. Additive only: five new tables, one nullable column on `users`, three new enums. Never edit it after it has been applied. A fix is `0002_*.sql`.

```sql
DO $$ BEGIN CREATE TYPE "public"."membership_role" AS ENUM('staff', 'head', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."workspace_plan" AS ENUM('starter', 'team', 'enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"name" varchar(120) NOT NULL,
	"slug" varchar(32) NOT NULL,
	"plan" "workspace_plan" DEFAULT 'starter' NOT NULL,
	"member_limit" integer DEFAULT 10,
	"ai_features" boolean DEFAULT false NOT NULL,
	"time_zone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"location_tagging" boolean DEFAULT false NOT NULL,
	"read_only" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL REFERENCES "users"("id"),
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("slug") BETWEEN 3 AND 32)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_lower_uq" ON "workspaces" (lower("slug"));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spaces" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"workspace_id" integer NOT NULL REFERENCES "workspaces"("id"),
	"name" varchar(80) NOT NULL,
	"head_membership_id" integer,
	"kpi_template" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spaces_workspace_name_lower_uq" ON "spaces" ("workspace_id", lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spaces_head_uq" ON "spaces" ("head_membership_id") WHERE "head_membership_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"workspace_id" integer NOT NULL REFERENCES "workspaces"("id"),
	"role" "membership_role" NOT NULL,
	"space_id" integer REFERENCES "spaces"("id"),
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_admin_space_chk" CHECK (("role" = 'admin') = ("space_id" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_workspace_uq" ON "memberships" ("user_id", "workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_workspace_role_idx" ON "memberships" ("workspace_id", "role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_workspace_space_idx" ON "memberships" ("workspace_id", "space_id");
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "spaces" ADD CONSTRAINT "spaces_head_membership_fk" FOREIGN KEY ("head_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"workspace_id" integer NOT NULL REFERENCES "workspaces"("id"),
	"email" varchar(255) NOT NULL,
	"role" "membership_role" NOT NULL,
	"space_id" integer REFERENCES "spaces"("id"),
	"token_hash" char(64) NOT NULL,
	"invited_by_membership_id" integer NOT NULL REFERENCES "memberships"("id"),
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by_user_id" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_email_lower_chk" CHECK ("email" = lower("email")),
	CONSTRAINT "invitations_admin_space_chk" CHECK (("role" = 'admin') = ("space_id" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_hash_uq" ON "invitations" ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_pending_email_uq" ON "invitations" ("workspace_id", "email") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_pending_head_uq" ON "invitations" ("space_id") WHERE "status" = 'pending' AND "role" = 'head';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_workspace_status_idx" ON "invitations" ("workspace_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"workspace_id" integer NOT NULL REFERENCES "workspaces"("id"),
	"actor_membership_id" integer REFERENCES "memberships"("id") ON DELETE SET NULL,
	"action" varchar(64) NOT NULL,
	"target" varchar(120) NOT NULL,
	"summary" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_workspace_created_idx" ON "audit_logs" ("workspace_id", "created_at" DESC);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_workspace_id" integer;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_last_workspace_fk" FOREIGN KEY ("last_workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Notes on the SQL:
- The circular reference between `spaces.head_membership_id` and `memberships.space_id` is broken by adding the Head FK after both tables exist.
- Every statement is idempotent, so a partial run is safe to repeat. A single `CREATE TABLE IF NOT EXISTS` with inline constraints is atomic. The migration test runs the file twice on an empty database and asserts the second run changes nothing.
- The runner swallows 42710, 42P07, 42P16, 42701 and 42704, rolls back and still records the file as applied. A single pre-existing object (for example an index made by hand) would therefore skip the whole file. D28 makes reaching that path a build failure (the test helper has no catch, and `npm run migrate` output is checked), and the schema assertion test (task 1.2) checks every table, enum, index, constraint and `users.last_workspace_id` from `information_schema` and `pg_indexes` after the run.
- The slug CHECK matches the API regex: no leading, trailing or double hyphen, and a length of 3 to 32.
- `ADD VALUE` is not used, so no enum value is needed in the same transaction.
- Soft-deleted (`deleted_at`) Workspaces keep their slug reserved, because the unique index has no `WHERE`.
- Backward compatible: nothing existing changes. `users.last_workspace_id` is nullable. Backend deploys first, the old frontend never reads the new tables.
- The audit repository exposes insert and list only. No update or delete.

Models (all use new `TableNames` entries, `WORKSPACES`, `SPACES`, `MEMBERSHIPS`, `INVITATIONS`, `AUDIT_LOGS`, and the `timestamps` helper):

| File | Exports |
|---|---|
| `src/modules/workspace/workspace.model.ts` | `workspacePlan` pgEnum, `workspaces` |
| `src/modules/space/space.model.ts` | `spaces` |
| `src/modules/membership/membership.model.ts` | `membershipRole` pgEnum, `memberships` |
| `src/modules/invitation/invitation.model.ts` | `invitationStatus` pgEnum, `invitations` |
| `src/modules/audit/audit-log.model.ts` | `audit_logs` (`createdAt` only) |
| `src/modules/user/user.model.ts` (edit) | add `lastWorkspaceId: integer("last_workspace_id")`, nullable, with no import of `workspaces` (the FK lives in SQL only, to avoid a new import cycle) |
| `src/db/postgres.schema.ts` (edit) | export the five new model files |
| `src/enums/table-names.enum.ts` (edit) | the five new names |

Indexes written in models use Drizzle `sql` templates for `lower(...)` and partial `WHERE` so they match the SQL file.

Environment: `FRONTEND_URL` already exists in `EnvSchema` (default `http://localhost:3000`), so no new variable. The email template is a new folder `src/emails/invitation/html.hbs` plus `EmailTemplates.INVITATION = "invitation"` in `src/enums/mail/mail.enums.ts`. Its locals are `workspaceName`, `role`, `inviteUrl`, `expiresInDays`. No em dash in the copy.

## Frontend

Rules: calls only through `src/lib`. No `fetch` in a component. Base from `NEXT_PUBLIC_API_URL` only. Tokens in memory. Return shape `{ ok: true, data } | { ok: false, status, message, code?, fields? }` where `code` copies `error.code` when present and `fields` maps field name to message (400 maps `error` straight, other statuses give `message` from `error.message`). Types are mirrored by hand in `src/lib/api-types.ts` from the Shared JSON shapes above. `Role` stays from `src/lib/nav.ts`.

### Files

| File | Change |
|---|---|
| `src/lib/api.ts` | New. `request`, `authed` and envelope parsing moved from `auth.ts` unchanged, plus a typed `ApiResult<T>`. |
| `src/lib/auth.ts` | Import only. No logic change. Auth is an approval area. If a logic change is needed, stop and ask. |
| `src/lib/api-types.ts` | New. `Workspace`, `Membership`, `SpaceSummary`, `RosterMember`, `Invitation`, `MeMemberships`. |
| `src/lib/workspaces.ts` | New. `getMemberships`, `setLastWorkspace`, `createWorkspace`, `checkSlug`, `updateWorkspace`. |
| `src/lib/spaces-api.ts` | New. `listSpaces`, `createSpace`, `updateSpace`. |
| `src/lib/members.ts` | New. `listMembers`, `updateMember`. |
| `src/lib/invitations.ts` | New. `listInvitations`, `createInvitations`, `revokeInvitation`, `previewInvitation`, `acceptInvitation`. |
| `src/data/viewer.ts` | Keep the types. Remove the sample arrays (`WORKSPACES`, `MEMBERSHIPS`, `USER`, `ACTIVE_MEMBERSHIP_ID`). Tests that need samples build their own. |
| `src/data/members.ts` | Generated. Not hand-edited. Types are still imported. A Backlog line records the missing generator and that `RosterMember`, `SpaceSummary` and `Invitation` here differ from `api-types.ts` by the added `spaceId`, `joinedAt`, `memberCount`, `email`. |
| `src/app/dashboard/layout.tsx` | Server component reads only the theme cookie. Renders a client `ShellProvider`. |
| `src/components/dashboard/shell-context.tsx`, `shell.tsx`, `workspace-switcher.tsx`, `create-workspace-dialog.tsx`, `setup-banner.tsx` | Load and hold the Memberships, active Workspace and role. |
| `src/components/onboarding/*` and `src/lib/onboarding.ts` | Call the API. `onboarding.ts` keeps validation only. |
| `src/components/people/*` and `src/lib/people.ts`, `spaces.ts` | Call the API. The guard functions stay as UI explanations. |
| `src/app/invite/[token]/page.tsx`, `src/components/invite/*` | New. |
| `scripts/api.test.ts`, `workspaces-api.test.ts`, `invitations-api.test.ts`, `onboarding-access.test.ts` (kept) | Plain `node --test` with an injected `fetch`. |

### Screens, states and calls

**Shell (every `/dashboard/*` page).** Call `GET /me/memberships`.
- Loading: a skeleton of the sidebar and a content block, no role-based items shown.
- Success with at least one Membership: the active one is the Workspace with `lastWorkspaceId`, else the first. Role and Space come only from that Membership. Switching calls `PUT /me/last-workspace` then updates state. If the call fails, state is unchanged and a toast says "Could not switch Workspace. Try again."
- Success with no Memberships: redirect to `/onboarding`.
- 401: the existing session-expired path in `auth.ts` runs (refresh, else go to login). No new auth code.
- Network error or 5xx: full-page error "We could not load your Workspaces." with a Retry button.

**Onboarding `/onboarding` steps workspace, spaces, team.**
- Workspace step: slug is `slugify(name)` until edited. A debounced (400 ms) `GET /workspaces/slug-available`. Shows Checking, Available, "That address is already taken.", "Reserved." or the format message. Submit calls `POST /workspaces` once (button disabled while sending). 400 field errors show beside `name`, `slug`, `timeZone`. 409 shows beside the slug. 403 with `code === "EMAIL_NOT_VERIFIED"` shows "Verify your email to continue." with a link to `/verify`. Other errors: a message above the buttons, the form keeps its values. Success stores the Workspace and Membership in the shell context and moves on.
- Spaces step (up to `SPACE_LIMIT` 4 rows): each non-empty row calls `POST /workspaces/:id/spaces` in order. A row that fails (409, 400) shows its message on that row and stops, rows already created are not created again on retry (the step remembers created ids). Empty list is blocked: setup needs at least one Space.
- Team step (up to `INVITE_LIMIT` 5 rows, roles staff or admin): one `POST /invitations` call. On 201 shows each row as sent with a Copy link button. 400 maps `invitations.N.email` to row N. 422 shows the seat message. 409 shows the duplicate message on the row. Skip is allowed and goes to the dashboard.
- Entry guard: `canEnterOnboarding` stays. A person with no Membership enters. A person with a Workspace who opens `/onboarding` still sees the "Create workspace" flow (a second Workspace), the Workspace step only.

**Create workspace dialog (switcher).** Same fields and calls as the Workspace step. On success it switches to the new Workspace and opens `/onboarding?step=spaces`.

**People `/dashboard/members`.** Calls `GET /workspaces/:id/members` and, for Admin or Head, `GET /workspaces/:id/invitations`.
- Loading: table skeleton. Empty (only the caller): "You are the only member. Invite your team." with an Invite button for Admin or Head, none for Staff. Error: message with Retry. 404: "This Workspace is not available to you." with a link to switch Workspace.
- Role change, Space change, deactivate and reactivate call `PATCH /members/:id`. The UI guards (`roleChangeGuard`, `deactivateGuard`, `moveSpaceReason`) disable the control with the reason. The server is still the rule: 409 and 422 messages show in a row-level alert, and the row is refetched.
- Invite form: Admin offers staff, head, admin. Head offers staff into the fixed Space. Staff has no form. Calls `POST /invitations`. Seat bar uses `seatUsage` fed from the active members count plus `invitations.filter(i => !i.expired).length`, matching the server seat count. Each created row shows the Copy link once. After closing, the link is gone, and the pending list shows the email with Revoke.
- Revoke calls `DELETE /invitations/:id`. 404 refetches silently.
- Staff does not call the invitations list, and sees no emails.

**Spaces `/dashboard/spaces`, `/dashboard/spaces/[id]`, `/dashboard/space`.** `GET /workspaces/:id/spaces` plus the members call for counts and the Head picker. Admin: create, rename, archive, restore, appoint or clear Head, edit KPI template. Head: edit KPI template for their own Space only (`canEditTemplate`). Staff: read only. Archive with members shows the 409 message ("Move its members out before archiving this Space."). Empty: "No Spaces yet." with a Create button for Admin. Stats shown on these pages that need reports (`SpaceStats`) stay as they are today and are out of this slice, shown as "Not available yet". Loading and error states as above.

**Invite page `/invite/[token]` (public route, outside the dashboard).**
1. Read the token from the path. Never log it or send it anywhere but the two invitation calls.
2. No access token in memory (signed out): store the token under `sessionStorage["reportlee.pendingInvite"]`, then show "Sign in or create an account with the email this invitation was sent to" with Log in and Sign up buttons. After login the dashboard shell checks the key: if set, it redirects to `/invite/<token>` once.
3. Signed in: `POST /invitations/preview`. States: loading; ready ("Join {workspaceName} as {role}" plus the Space name) with an Accept button; 404 "This invitation is not valid. Ask for a new one."; 403 with `code === "INVITE_EMAIL_MISMATCH"`: show the server message naming the masked email and a "Sign out and use another account" button; 403 with `code === "EMAIL_NOT_VERIFIED"`: "Verify your email to continue." with a link to `/verify` (the frontend branches on `code`, never on message text, D27); error with Retry.
4. Accept calls `POST /invitations/accept`. 200: clear the key, update the shell, go to `/dashboard`. 409: show the message and a link to the dashboard. 404: the invalid state.

### Mirrored types that change

`src/lib/api-types.ts` (new). `Membership` in `src/data/viewer.ts` gains optional `spaceId: string | null`. `Workspace` there is unchanged (the API shape is a match). `RosterMember`, `SpaceSummary` and `Invitation` in `src/data/members.ts` are not edited, and `api-types.ts` exports wider versions that extend them. Backend counterparts: the Shared JSON shapes above.

### Testability

Unit tested with `node --test`: `api.ts` envelope parsing and error mapping, string ids, field error mapping, the pending-invite helper (pure get, set, clear on an injected storage), and the unchanged guard functions in `people.ts`. Integration tested only in the live check and the manual browser pass (no component test framework, none is added).

Backend unit and integration tested with Vitest against a real Postgres (D18): the service and the HTTP route for every endpoint, plus the migration test.

**Test harness (D18, review 5).** `tests/setup.ts` and `vitest.config.ts` are not touched. New files only:
- Database: no new env var (D18). `tests/helpers/db.ts` checks `config.db.uri` (from `POSTGRES_URI`) and throws unless the host is `localhost` or `127.0.0.1` and the database name ends in `_test`, then prints the database name only. The required `.env.test` value is documented in the helper header comment (names only, never the value), because AGENTS.md forbids printing `.env*`. `beforeAll` applies `0001_workspaces_people.sql` with a 6 line `splitStatements(sql)` in the same file (split on `--> statement-breakpoint`, trim, drop empty), which copies the logic of `app/migrate.ts` (a top-level script with no exports, so it cannot be imported). Each statement runs with no catch. `beforeEach` truncates the slice tables and users it created.
- Cache: route tests do not need Redis. `tests/helpers/auth.ts` stubs `CacheService` with an in-memory map (the one seam `JwtService.validateToken` reads through), signs a real access token with the test key, and writes the cache entry `{ id, authId, emailVerified, action }` for the test user. The `emailVerified` flag is set stale on purpose in one test to prove D25 reads the user row.
- App: the test builds the Hono app from the real `router`, so guards, Zod and the error handler run for real.
- Queue: `EmailQueueService` is stubbed with a recorder (one test makes it throw).
- Logs: the AC11 test captures both `console.log` (and `console.info`, `console.warn`, `console.error`) and `process.stdout.write` plus `process.stderr.write`, because `serviceLogger` (winston) may not use `console.log`.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| Reuse `user_roles` for Workspace roles | Contradicts D-Q1 and would grant platform-wide rights. |
| Add memberships to `/auth/me` | Changes a response auth already uses. Needs auth approval. |
| Per-row locks (members, then Spaces, then invitations) | Deadlock risk. One Workspace lock is enough at this scale. |
| `SELECT ... FOR UPDATE` only on admin rows for the last-Admin check | Does not cover seats or Head slot, so there would be three lock styles. |
| Auto-accept an invitation at signup | Needs a change to the auth module and a verified email first. |
| Put the invite token in `?next=` through login | Puts a token in a URL and touches auth forms. |
| Email-only invitations | Safer, but the owner asked for a copyable link. It is kept as the fallback for P2. |
| Dashboard as a server component calling the API | The access token lives in memory only. |
| A Drizzle-generated migration | The journal and snapshot do not match the folder. Gate 0 says write SQL by hand. |
| Pagination on the roster now | Starter caps at 10 members. Deferred (D11). |
| Mock-based backend tests | AGENTS.md requires a real test Postgres. |
| 204 on revoke | The envelope helper always writes JSON (D13). |
| `aiFeatures` and `editWindowMinutes` in the Workspace PATCH | Belong to later slices (D19). |

## Order of work

Migration, then backend, then frontend. Everything backend is additive, so the backend can deploy alone and the old frontend keeps working.

1. BE-T0 test harness. 2. BE-1 migration and models, run `npm run migrate` twice on the local DB (print `NODE_ENV` and confirm host port 5434 first). 3. BE-2 membership choke point, guards, `/me`. 4. BE-3 workspaces. 5. BE-4 spaces. 6. BE-5 members. 7. BE-6 invitations and email template. 8. BE-7 Gate 3 backend. 9. FE-1 API layer. 10. FE-2 shell and switcher. 11. FE-3 onboarding. 12. FE-4 People and Spaces. 13. FE-5 invite page. 14. FE-6 Gate 3 frontend. 15. Docs.

Never run `migrate:rebuild`, `rebuild-db.ts` or a migration against anything but the local database.

## Acceptance checks

- **AC1** A verified signed-in user creates a Workspace and is its only active Admin, with no Space, on plan `starter` with limit 10. An unverified user gets 403 and nothing is created.
- **AC2** A user in two Workspaces holds a different role in each. `GET /me/memberships` lists both and the switcher shows both. `PUT /me/last-workspace` for a foreign Workspace is 404.
- **AC3** A non-member gets 404 with the same body on every `/workspaces/:wsId/*` route, as does a deactivated member. A Staff member on an Admin route gets 403. Unauthenticated gets 401.
- **AC4** A Head inviting an Admin, or Staff into another Space, gets 403. Staff inviting gets 403. A Head inviting Staff into their own Space succeeds.
- **AC5** The last active Admin cannot be demoted or deactivated (409). Two simultaneous demotions of two Admins leave exactly one Admin.
- **AC6** Pending invitations count toward the member limit of 10 (422 at the limit). Revoking frees the seat. A batch that would exceed the limit creates nothing.
- **AC7** An invitation works once, expires after 7 days, and only for its verified invited email (403 otherwise). Two simultaneous accepts create one Membership. Expired, revoked, used and unknown tokens all give the same 404.
- **AC8** A Space with active members cannot be archived (409). Space names are unique per Workspace ignoring case (409).
- **AC9** The slug is 3 to 32 of a-z, 0-9 and hyphens, not reserved, unique ignoring case (409), and cannot be patched (400). The backend reserved list equals `RESERVED_SLUGS` in `onboarding.ts` (test).
- **AC10** A user with `user_roles.admin` and no Membership gets 404 on a Workspace route.
- **AC11** No email, token, invite link, OTP or password appears in response logs for these routes (new controllers pass `{ log: false }`). A test captures `console.*`, `process.stdout.write` and `process.stderr.write` during `GET members` as Admin, invitation create and accept, and finds no email, raw token or `inviteUrl` value. `tests/log-redact.test.ts` covers `inviteurl`. The invitation list response has no `inviteUrl`. The database holds only the token hash. The email job in Redis holds the link until removed (removed on success, kept at most 24 hours after failure). The Zod 400 log line can still hold a request email (Backlog line).
- **AC12** `/auth/me`, login and every existing response are unchanged (the existing auth tests pass untouched).
- **AC13** A Head edits only their own Space's `kpiTemplate` (403 for any other key or Space).
- **AC14** Every guarded mutation writes its audit row in the same transaction: workspace create and update, space create, update (rename, restore, `kpiTemplate`, Head change) and archive, each `role.change` including both flips in a Head swap, member deactivate and reactivate, invitation send, revoke and accept. No audit summary contains an email.
- **AC15** The migration runs twice on an empty local database with no error, and the second run changes nothing. A schema assertion test finds every expected table, enum, index, constraint and `users.last_workspace_id` after the first run. Hitting the runner's swallow path fails the build (D28).
- **AC16** The frontend shows loading, empty and error states on the shell, People, Spaces and Invite screens. Server 409 and 422 messages are shown to the user. No user-facing string contains an em dash.
- **AC17** `/invite/<token>` for a signed-out visitor stores the token only in `sessionStorage`, returns the visitor after login, and removes the key after accept.
- **AC18** Verified state and email for create, preview and accept come from the user row. A cache entry that says `emailVerified: true` for a user whose row is unverified gets 403 `EMAIL_NOT_VERIFIED`. A deleted or suspended user gets 401. A cache entry with no `id` gets 401. Both 403 codes are present in the response body.
- **AC19** Last-Admin, seat, `memberCount` and Head-candidate counts ignore Memberships of deleted or suspended users (D26).
- **AC20** Revoking a pending invitation that is past `expires_at` but not yet swept returns 200. A swept (`expired`) row returns 404. The frontend seat bar excludes expired rows.

## Responses to review findings

Iteration 2, after `.agents/tasks/workspaces-people/design-review.md` (CHANGES_REQUESTED, 4 HIGH, 9 MEDIUM, 4 NIT). D-Q1 to D-Q3 are unchanged.

| # | Severity | Response |
|---|---|---|
| 1 | HIGH | Addressed. D29 adds `inviteurl` to `SENSITIVE_KEYS` with a test. `email` is not added because it changes existing log output, so AC11 and the logging paragraph now say "no token, OTP, password or invite link". Task 1.7 lists `log-redact.helper.ts` and `tests/log-redact.test.ts`. |
| 2 | HIGH | Addressed. D25: user row is read for routes 4, 15, 16. |
| 3 | HIGH | Addressed. D24 and AC18. Build step verifies `auth.service.ts` writes `id`, else falls back to `grabUserIdFromAuthId`. |
| 4 | HIGH | Addressed. D28, SQL notes, AC15, task 1.2. |
| 5 | MEDIUM | Addressed. Test harness paragraph under Testability, task 1.1. |
| 6 | MEDIUM | Addressed. D26 and AC19. |
| 7 | MEDIUM | Addressed. P7, endpoint 9, Space head rule, specs/spaces, AC14. |
| 8 | MEDIUM | Addressed. Member change rule 4. |
| 9 | MEDIUM | Addressed. Invitation create rule 1, endpoint 14, frontend seat bar, AC20. |
| 10 | MEDIUM | Addressed. D27, Error table, frontend branches on `code`. Message equals the existing guard text. `sendErrorResponse` takes an object, so extra keys pass through, and a test asserts it. |
| 11 | MEDIUM | Owner decided B: no limits now. Recorded as P10, one line in the owner approval summary, and two Backlog lines (including the Gmail sender suspension risk at about 500 a day). No design change. |
| 12 | MEDIUM | Addressed in tasks 1.3 to 1.7, each missing test is named. |
| 13 | MEDIUM | Addressed. Accept rules (a) to (e) and the inactive-member message. |
| 14 | NIT | Addressed. D30. |
| 15 | NIT | Addressed. Rules table row. |
| 16 | NIT | Addressed. Slug CHECK uses the API regex plus a length check. |
| 17 | NIT | Addressed. Endpoint 9: no-op, 200. |

### Round 2 (after the second design review: 1 HIGH, 7 MEDIUM, 4 NIT)

| # | Severity | Response |
|---|---|---|
| 1 | HIGH | Addressed. D27 now uses `CodedForbiddenError` plus one additive branch in `errorHandler`. Files listed in Backend and task 1.3. Route test asserts `{ error: { message, code } }`. |
| 2 | MEDIUM | Addressed. D6 defines `Tx`, `(tx: Tx, ...)` repository functions not extending `RelationalRepository`, and service to service calls passing `tx`. |
| 3 | MEDIUM | Addressed. D18 and the harness paragraph: no `TEST_DB_URI`, `POSTGRES_URI` guard with `_test` suffix, local `splitStatements`, `.env.test` documented by name. |
| 4 | MEDIUM | Addressed. D28: the helper has no catch, `npm run migrate` run twice with output assertions, spy option removed. |
| 5 | MEDIUM | Addressed. Endpoints preamble: field key is the parent path, tests assert 400 only. |
| 6 | MEDIUM | Addressed. D7 shared `idString` with range refine, tests for `"0"`, `"007"`, `"2147483648"`, `"9999999999"` in task 1.3. |
| 7 | MEDIUM | Addressed. P2 reworded, create rule 6 adds `EmailJobNames.INVITATION`, subject, `idempotencyKey`, and per-call job options (an optional `opts` parameter on `BaseQueueService.add`, since it takes none today). |
| 8 | MEDIUM | Addressed. D29: `sendSuccessResponse` option `{ log: false }`, AC11 reworded, log test on roster. Zod 400 line stays Backlog. |
| 9 | NIT | Addressed. Data wording changed to "idempotent so a partial run is safe". |
| 10 | NIT | Addressed. Accept step (b) requires an active Membership, else the step (e) 409. |
| 11 | NIT | Addressed. Separate message for a deactivated member in rule 4 and the Error table. |
| 12 | NIT | Addressed. The AC11 test captures `console.*` and `process.stdout.write` and `process.stderr.write`. |

No finding needs an owner decision. The `opts` parameter on `BaseQueueService.add` and the `{ log: false }` parameter are additive changes to shared backend files, chosen over changing global retention or logging.

Deviations from `plan.md` are recorded in the Decisions table: D11 (no roster pagination), D13 (200 on revoke), D19 (Workspace PATCH fields), D21 (no seat check on accept), D22 (account deletion gap). The new `invitation_status` value `expired` (D10) and the roster visibility default (P9) are additions the owner should confirm.

## Validation

`openspec validate workspaces-people --strict`: see the result recorded in `tasks.md` under "Validation".
