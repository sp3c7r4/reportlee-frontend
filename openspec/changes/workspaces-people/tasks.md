## 1. Backend (repo `reportlee-backend`, branch `feat/workspaces-people`)

Run commands inside the repo folder. Before any migration print `NODE_ENV` and confirm the database is the local Docker `app-db` on port 5434. Never run `migrate:rebuild` or `rebuild-db.ts`. While iterating run only the touched suites (`npx vitest run <files>`).

- [ ] 1.1 BE: test harness. `tests/helpers/db.ts` and `tests/helpers/factories.ts` connect to a local test database, refuse to run on a non-local host, truncate the slice tables between tests, and create users and Memberships. `vitest.config.ts` is not touched. Verify: `npx vitest run tests/helpers-smoke.test.ts` (insert and read).
- [ ] 1.2 BE: migration and models (AC15). Write `src/db/migrations/0001_workspaces_people.sql` exactly as in design.md, the five `*.model.ts`, the `user.model.ts` column, `postgres.schema.ts` exports and `TableNames`. Test first: `tests/migration-0001.test.ts` runs the file twice on an empty database and checks tables, CHECKs and unique indexes (a second Admin-with-Space row fails, a duplicate lower-cased slug fails). Verify: `npx tsc --noEmit`, `npm run migrate` twice, the test.
- [ ] 1.3 BE: membership choke point and guards (AC3, AC10). `MembershipService.resolve`, `requireMembership`, `requireWorkspaceRole`, doc comment on `requireAdmin`, `GET /me/memberships`, `PUT /me/last-workspace`. Tests: non-member 404, deactivated 404, platform admin without Membership 404, Staff on an Admin route 403, no token 401, role in body ignored, stale last Workspace returns null, two Workspaces with two roles (AC2). Verify: `npx vitest run tests/membership.test.ts tests/workspace-guards.test.ts`.
- [ ] 1.4 BE: workspace module (AC1, AC9, AC12). `POST /workspaces`, `GET /workspaces/slug-available`, `GET` and `PATCH /workspaces/:wsId`, audit module. Tests: happy path shape, field errors, reserved and malformed slug 400, duplicate slug 409 in different case, unverified 403, slug not patchable, Staff patch 403, other Workspace 404, creation is atomic (forced audit failure leaves no Workspace), reserved list equals the frontend list. Verify: `npx vitest run tests/workspace.test.ts`.
- [ ] 1.5 BE: space module (AC8, AC13). List, create, patch (rename, Head, archive, restore, `kpiTemplate`). Tests: name clash in any case 409, archive with members 409, Head edits own template 200 and another Space 403, Head sends `name` 403, Head appointment outside the Space 400, appointing replaces the old Head, 51st Space 422, foreign Workspace 404. Verify: `npx vitest run tests/space.test.ts`.
- [ ] 1.6 BE: members module (AC5, AC14). Roster (email for Admin only), `PATCH` member with the rules in design.md. Tests: demote or deactivate the last Admin 409, two concurrent demotions leave one Admin, Admin with a Space 400, Staff to Head when the Space has a Head 409, deactivated Head frees the Head slot, reactivate over the limit 422, non-Admin patch 403, foreign membership id 404, audit rows exist and hold no email. Verify: `npx vitest run tests/members.test.ts`.
- [ ] 1.7 BE: invitations (AC4, AC6, AC7, AC11). Create, list, revoke, preview, accept, email template `src/emails/invitation/html.hbs`, `EmailTemplates.INVITATION`. Tests: Head inviting Admin 403, Head inviting into another Space 403, Staff inviting 403, seats count pending invites 422, a batch over the limit creates none, revoke frees a seat, expired token (clock moved 7 days) 404, accept twice and concurrent accepts give one Membership, wrong email 403, unverified 403, existing member 409, token stored only as sha256, `inviteUrl` absent from the list response, no token or email in captured log output, queue failure still returns 201. Verify: `npx vitest run tests/invitation.test.ts`.
- [ ] 1.8 BE: Gate 3. `npx biome check <touched files>`, `npx tsc --noEmit`, `npm run check:circular` (only the known cycle), the touched suites, then once `npm test` and `npm run build`. Record counts and durations in Validation. Fix and rerun everything on any failure.

## 2. Frontend (repo `reportlee-frontend`, branch `feat/workspaces-people`). Starts only after 1.8 passes.

- [ ] 2.1 FE: API layer (AC12). Create `src/lib/api.ts` by moving `request` and `authed` from `auth.ts` with no logic change, add `api-types.ts`, `workspaces.ts`, `spaces-api.ts`, `members.ts`, `invitations.ts`. Tests first: `scripts/api.test.ts`, `scripts/workspaces-api.test.ts`, `scripts/invitations-api.test.ts` with an injected `fetch` (envelope parsing, string ids, 400 field map, 404, 409, 422, network error). Verify: `npm test` (the existing auth suites pass untouched) and `npx tsc --noEmit`. Stop and ask if `auth.ts` needs a logic change.
- [ ] 2.2 FE: shell and switcher (AC2, AC16). Client `ShellProvider` loads `GET /me/memberships`, skeleton, retry error, redirect to `/onboarding` when empty, switch via `PUT /me/last-workspace`, remove the sample arrays from `src/data/viewer.ts`. Files: `app/dashboard/layout.tsx`, `components/dashboard/shell*.tsx`, `workspace-switcher.tsx`, `create-workspace-dialog.tsx`. Verify: `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 2.3 FE: onboarding (AC1, AC9, AC16). Workspace, Spaces and Team steps call the API as in design.md. Debounced slug check, field errors beside fields, resumable Space creation, Copy link per invited row. `onboarding.ts` keeps validation only. Verify: `npm test` (`onboarding-access.test.ts` still passes), `npx tsc --noEmit`, `npm run build`.
- [ ] 2.4 FE: People and Spaces (AC4, AC5, AC6, AC8, AC13, AC16). `components/people/*`, `setup-banner.tsx`. Loading, empty and error states, server 409 and 422 messages, UI guards kept as explanations. Verify: `npm test` (`people.test.ts`, `spaces.test.ts`), `npx tsc --noEmit`, `npm run build`.
- [ ] 2.5 FE: invite page (AC7, AC17). `app/invite/[token]/page.tsx`, `components/invite/*`, pure `pendingInvite` helper with a test. States: signed out, loading, ready, invalid, wrong email, unverified, accepted, already a member. Verify: `npm test`, `npx tsc --noEmit`, `npm run build`.
- [ ] 2.6 FE: Gate 3. `npx biome check <touched files>`, `npx tsc --noEmit`, `npm test`, `npm run build`, and `rg -n "[\u2014\u2013]" <touched files>` with no hit in a user-facing string. Confirm no new dependency. Record in Validation.

## 3. Docs, approval and review

- [ ] 3.1 FE: `docs/ROADMAP.md` rows. Backlog lines: stale `AGENTS.md` backend notes ("backend does not exist", "journal stops at 0004"), missing generator for `src/data/members.ts`, roster pagination, invitation resend, Head picker in onboarding, Super Admin plan limits, last Admin deleting their account (D22), em dashes found in untouched files if any.
- [ ] 3.2 Owner approval of this change (migration, permissions, token in a response body). Not a build step. Record the answer on P1 to P9.
- [ ] 3.3 Gate 4: fresh-context review with three lanes (spec conformance, behaviour against ACs, command-running), at most 2 rounds.

## Validation

Spec validation, run on branch `feat/workspaces-people` (docs only, so no lint, tests or build):

```
$ openspec validate workspaces-people --strict
Change 'workspaces-people' is valid
```

Build validation sections for the backend and the frontend are filled in at Gate 3 (tasks 1.8 and 2.6).
