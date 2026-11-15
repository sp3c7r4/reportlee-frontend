## Why

Today the frontend sends `role: "admin"` on every signup and the backend stores whatever role the client sends.
Anyone who signs up becomes an admin. Admin must be a role that another admin grants, never one a person picks
for themselves.

Gate 1 approval: the user approved decisions 1 to 4 on 2026-11-12.

1. A new account is never an admin at signup, and the server enforces it (the client is not trusted).
2. Every new user is saved as `member` (shown as staff in the UI).
3. After signup and email verification the person goes straight to the dashboard as staff. Onboarding is for
   admins only, and a staff user who opens onboarding is redirected to the dashboard.
4. Only an existing admin can grant or remove the admin role, through a new backend endpoint.

## What Changes

- BE: signup ignores any client role. Email verification always saves `member`. `selectRole` rejects `admin`.
- BE: new `PATCH /api/v1/user/:id/role`, admin only, one role per user, last admin protected, live sessions of
  the target updated.
- FE: signup sends no role. A new account lands on `/dashboard`. Onboarding redirects non-admins to `/dashboard`.
- No data change and no migration.

## Capabilities

### New Capabilities
- `signup-roles`: which role a new account gets, and who may change a role afterwards.

### Modified Capabilities
None. The `auth` capability still lives unarchived inside `auth-backend-wiring`, so this change does not edit it.

## Impact

- Backend repo `reportlee-backend`: auth validators, auth service, user module (route, controller, service,
  repository, session registry), README, new tests.
- Frontend repo: `src/lib/auth.ts`, `src/lib/otp.ts`, `src/lib/onboarding.ts`, `onboarding-flow.tsx`, tests.
- Existing admins created by the old signup are not touched. See design, "Existing data".
