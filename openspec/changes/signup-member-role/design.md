## Context
Two repos: `reportlee-backend` (Hono, Drizzle, Postgres, Redis, `/api/v1`) and this frontend. The backend deploys
first, so every backend change is additive. Server enforcement is the real guard. The frontend redirect is
convenience only.

## Decisions
| ID | Decision | Status |
|---|---|---|
| D1 | Signup ignores any client `role`. `createUserSchema.role` becomes optional (still the enum, so an old build that sends `admin` gets 200, not 400). `AuthService.signup` no longer caches a role. | Approved 2026-11-12 |
| D2 | The choke point is `verifyEmail` (VERIFY_EMAIL branch): it always inserts `member` and mints tokens with `member`, ignoring any role cached by an in-flight signup (30 min TTL). | Approved 2026-11-12 |
| D3 | The VERIFY_EMAIL response and cached session include `roles: ["member"]`. Additive. | Default taken, listed in the report |
| D4 | `selectRole` keeps its route. `selectRoleSchema.role` excludes `admin` (400 field error). The service throws 403 for `admin`. The existing "already assigned" 400 stays. | Default taken, listed in the report |
| D5 | Grant endpoint `PATCH /api/v1/user/:id/role`. Guards in order: `validateToken` (401), `requireAdmin` (403), params, body (400), controller. The admin guard runs before body validation so a member never learns the body shape. | Approved 2026-11-12 |
| D6 | One role per user. Grant deletes all `user_roles` rows of the target and inserts the new one in one transaction. The partial unique index exempts admin, so admin and member rows could otherwise coexist and `requireAdmin` could flip. | Default taken, listed in the report |
| D7 | Refuse to remove the last admin (400). Admins counted: `users.deleted_at IS NULL AND users.suspended_at IS NULL`, excluding the target. Covers self demotion. Check, delete and insert run in one transaction under `pg_advisory_xact_lock`. | Approved 2026-11-12 |
| D8 | After commit, `SessionRegistryService.setRolesForUser` scans `auth:{userId}-*` and rewrites `roles` with `SET key value XX KEEPTTL`. Errors are logged and swallowed because guards read the DB. `refresh:*` keys are left alone. | Default taken, listed in the report |
| D9 | Setting the same role returns 200 with `changed: false` and touches no session. | Default taken, listed in the report |
| D10 | No UI to grant roles. Backlog line added. | Default taken, listed in the report |
| D11 | FE: signup sends no role. `FLOWS.signup.destination` is `/dashboard`. `OnboardingFlow` redirects non-admins. The simulated verify for signup returns `staff`. | Approved 2026-11-12 |
| D12 | New capability `signup-roles`, not `auth` (still unarchived in `auth-backend-wiring`). | Default taken, listed in the report |
| D13 | First admin in staging and production: documented runbook only, no script. | Default taken, listed in the report |

## Backend
Endpoint contract:

```
PATCH /api/v1/user/:id/role
Authorization: Bearer <access token of an admin>
Guards: validateToken, requireAdmin, params, body
Params: id = positive integer
Body:   { "role": "admin" | "member" }
200 { timestamp, status: 200, success: true,
      data: { message: "Role updated successfully.",
              user: { id: <number>, roles: ["admin"], previousRoles: ["member"], changed: true } } }
200 same role again: message "That user already has this role.", changed: false
400 invalid id or body: error is a field map, e.g. { "role": "<zod message>" }
400 last admin: error.message = "There must be at least one admin. Make someone else an admin first."
401 no or invalid token
403 caller is not admin: "You are not authorized to access this resource."
404 target missing or soft-deleted: "User not found."
```

Other backend changes:
- `POST /auth/signup`: body role optional and ignored. Cached data holds no role.
- `POST /auth/verify-email` (signup branch): inserts `member`, response and cached session carry `roles: ["member"]`.
- `POST /auth/select-role`: `admin` rejected (400 by schema, 403 in the service). Message: "The admin role cannot be chosen by the account owner. Ask an existing admin to grant it."
- Session update: SCAN `auth:{userId}-*`, merge `roles`, write with `XX` and `KEEPTTL`. The pattern keeps id 1 apart from id 12.

## Data
No data change. No migration: the `user_role` enum already holds `admin` and `member`
(`src/db/migrations/0000_clear_rage.sql`). A grant replaces the row inside one transaction, so the partial unique
index `uq_user_role_single_working` is never violated. If this turns out to be wrong during build, stop and report.

## Frontend
- `signUp` in `src/lib/auth.ts` sends the form input only.
- `FLOWS.signup.destination` in `src/lib/otp.ts` is `/dashboard`.
- `canEnterOnboarding(role)` in `src/lib/onboarding.ts` is true only for `admin`. `OnboardingFlow` redirects to
  `/dashboard` when it is false and renders nothing until the check passes.
- The simulated verify for the signup flow returns `{ role: "staff" }` so both branches share a shape.
- Mirrored types do not change. `toFrontendRole` already maps `admin` to admin and everything else to staff.
- States: loading is a blank render until the role is read. Errors from signup keep the existing field and
  message handling.

## Rejected alternatives
- Keep a role picker at signup: lets anyone pick admin.
- Multiple role rows per user: admin plus member rows make `requireAdmin` unpredictable.
- Delete the `selectRole` route: a breaking removal for little gain.
- Invalidate target sessions on a change instead of updating them: signs the person out for no reason.

## Order of work
1. Backend signup and `selectRole` hardening (additive, deploys first).
2. Backend grant endpoint.
3. Frontend signup and onboarding.

## First admin runbook (staging and production)
Documented only, not automated. The owner with database access picks the user, then in one transaction deletes
that user's `member` row from `user_roles` and inserts an `admin` row. `seed-dev` creates `dev-admin` on local
databases only.

## Existing data
Users who got `admin` through the old signup are not touched. List them with
`SELECT u.id, u.email FROM user_roles r JOIN users u ON u.id = r.user_id WHERE r.role = 'admin'` and demote them
with the new endpoint. Sessions minted before the deploy keep `roles: ["admin"]` in the cache until demoted.

## Acceptance checks
- AC1: signup with `role: "admin"` yields a `member` account after verification.
- AC2: a cached in-flight signup holding `admin` still yields `member`.
- AC3: `selectRole` with `admin` is rejected and creates no row.
- AC4: a member calling the PATCH gets 403.
- AC5: an admin promotes a member and the answer is 200 with the documented JSON.
- AC6: demoting the only active admin gets 400.
- AC7: after a grant the target's cached session carries the new role and keeps its TTL.
- AC8: unknown target gets 404, bad id or body gets 400, no token gets 401.
- AC9: after verification a new person is on `/dashboard`.
- AC10: staff opening `/onboarding` is redirected and the form never renders.
