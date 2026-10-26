## Why

A new Workspace cannot yet do the two things setup exists for: choose its Spaces and get people into it. The
onboarding flow in the app builds a Workspace in local state and then forgets it, and there is no way to see
or manage the people already in one. These two screens close that gap before the reporting surfaces grow.

## What Changes

- Add `/onboarding` completion for an existing Workspace: resume setup, finish Spaces, finish invitations.
- Add `/dashboard/spaces`: Space cards with Head, member count and this period's submission bar, plus the
  Space page with Reports, Members and the KPI template tabs.
- Add `/dashboard/members`: the member table with filter chips, invitations in the same table, and the invite
  flow with its role rules.
- Apply the invitation rules: Admins invite any role; a Head of Space invites Staff only, into their own Space.
- Archived Spaces: hidden from pickers, kept with their Reports, restorable.
- No new dependency. No backend.

## Capabilities

### New Capabilities

- `workspace-setup`: the setup steps for an existing Workspace, what counts as finished, and resuming.
- `people-management`: the member table, invitations and their role rules, Space assignment and archiving.

### Modified Capabilities

None.

## Impact

- New: `src/lib/setup.ts`, `src/lib/people.ts`, `src/components/members/`, `src/components/spaces/`,
  `src/app/dashboard/members/page.tsx`, `src/app/dashboard/spaces/page.tsx`,
  `src/app/dashboard/spaces/[id]/page.tsx`, `scripts/people.test.ts`.
- Touched: `src/data/viewer.ts` for Space records, `src/lib/onboarding.ts` for resume state.
- The invite email itself is out of scope: no mail provider is wired.
