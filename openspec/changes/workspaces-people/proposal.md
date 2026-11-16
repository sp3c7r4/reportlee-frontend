## Why

Signed-in users today have no Workspace, Space or Membership on the server. The dashboard shell, onboarding, People and Spaces screens all read mock arrays, so nobody can create a Workspace, invite a colleague or hold a role. Every later domain (reports, review, analytics) is scoped by Membership, so this slice must land first. The owner wants real people using the product soon, so it ships as real API calls, not more mocks.

## What Changes

- Add a server-side Workspace, Space, Membership, Invitation and audit-log model in the backend, with one hand-written idempotent migration `0001_workspaces_people.sql` (additive only: new tables plus one nullable column on `users`).
- Add one choke point that answers "who is this caller in this Workspace" (`MembershipService.resolve`) and two guards built on it. Role and Space are never read from a token, body or query.
- Add 16 endpoints under `/api/v1`: `/me/*`, `/workspaces/*` and `/invitations/*` (listed in `design.md`).
- Enforce on the server the rules the frontend already encodes: Admin belongs to no Space, Head invites only Staff into their own Space, Staff cannot invite, at least one active Admin always, pending invitations reserve seats, invitations last 7 days and work once for one verified email, slug rules, Space name uniqueness, no archive while a Space has members.
- Switch the frontend from mock to API through `src/lib` only: dashboard shell and Workspace switcher, onboarding, People, Spaces, and a new `/invite/[token]` page. Tokens stay in memory and the base URL stays `NEXT_PUBLIC_API_URL`.
- Extract the shared `request` and `authed` helpers from `src/lib/auth.ts` into `src/lib/api.ts` (move only, no auth behaviour change).
- **No BREAKING change.** `/auth/me`, login and every existing response keep their shape. `user_roles` is untouched: `admin` there stays the platform Super Admin.
- Owner-visible defaults (recorded, not yet approved): see "Planner decisions" in `design.md` (P1 to P10). The three that most need a yes: P10 (no limit on Workspaces or invite emails, so the owner's Gmail sender could be suspended at about 500 a day), P2 (the invite link appears once in a create response body) and P4 (a pending invite token is held in `sessionStorage` across login).

## Capabilities

### New Capabilities
- `workspace-access`: who the caller is in a Workspace, the list of their Workspaces, last Workspace, and the access rule that non-members learn nothing.
- `workspaces`: creating a Workspace, its slug rules and its editable settings.
- `spaces`: creating, renaming, archiving, restoring Spaces, appointing a Head, and the KPI template.
- `members`: the roster, role and Space changes, deactivation, reactivation and the last-Admin rule.
- `invitations`: inviting by email and link, seats, expiry, single use, revoke and accept.

### Modified Capabilities
None. `openspec/specs/` is empty, so nothing is modified.

## Impact

- Backend repo `reportlee-backend` (branch `feat/workspaces-people`): new modules `workspace`, `space`, `membership`, `invitation`, `audit`, `me`; `src/middlewares/auth/workspace-guards.ts`; `src/routes/router.ts`; `src/db/postgres.schema.ts`; `TableNames`; `user.model.ts` (one nullable column); one email template; a real-Postgres test helper. No new dependency.
- Frontend repo (branch `feat/workspaces-people`): `src/lib/api.ts` (new), `workspaces.ts`, `members.ts`, `invitations.ts`, `spaces-api.ts` (new), `onboarding.ts`, `people.ts`, `spaces.ts` (types only), `src/data/viewer.ts`, `src/data/members.ts` (types only, generated file), `src/app/dashboard/layout.tsx`, `src/components/dashboard/*`, `src/components/onboarding/*`, `src/components/people/*`, new `src/app/invite/[token]/page.tsx` and `src/components/invite/*`. No new dependency.
- Approval triggers hit: a migration, permissions, a token in a response body (the invite link). The change stops for owner approval before any build.
