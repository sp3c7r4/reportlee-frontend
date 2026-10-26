## Why

Sign-in now lands on the marketing page because there is no signed-in frame. Every screen in phases 2 to 5
needs that frame first: a sidebar that changes with the role, a top bar, a Workspace switcher and a user
menu. Building the screens before the frame means each one invents its own chrome.

## What Changes

- Add the signed-in frame at `/dashboard`, the same path for every role. A role changes what the sidebar
  and pages show, never the URL.
- Add one pure nav module that returns, for a role, both the sidebar groups and the phone tab items. The
  two lists are different, not one scaled down from the other.
- Add sample data shaped like the real model: a User holds a name and an email; a Membership holds a
  Workspace, a role and a Space. Three sample Workspaces, and one constant choosing the active
  Membership. No query parameter and no cookie may choose the role.
- Add the desktop shell: sidebar, slim top bar, Workspace switcher with a Create workspace modal, user menu
  with a two-way theme control, bell and search shells, and an Admin plan-usage card.
- Add a slide-in drawer below the large breakpoint, so the shell is usable on a phone before the tab bar
  exists. The bottom tab bar is UI-3b, built from the same nav module.
- State plainly, in the module and in the spec, that this is sample data and that hiding a nav item is
  tidiness, not a guard.
- Switch Workspace in memory only: one User holds all three sample Memberships, `ACTIVE_MEMBERSHIP_ID` picks
  the initial one, a reload resets the choice, and nothing stored can choose the role.
- Render every dialog, menu, sheet and toast inside the shell root, so the shell's theme class reaches them.
- Carry a plan, a member limit and an AI flag per Workspace, so the usage card shows a bar on Starter and a
  count on Team, and the Assistant greys out where AI is off.
- Give the sidebar a search field at the top and the person's row at the bottom, and leave the top bar's
  action slot to the page.
- Fix every sign-in destination (password, provider, code, onboarding), add sign-out through the existing
  session helper, and send a session-less visit to `/dashboard` back to `/login` as a convenience.
- Meet the accessibility floor: landmarks, a skip link, keyboard operation, `aria-current`, and a drawer that
  traps focus, closes on Escape and closes on navigation.
- Ship two page wrappers, data and reading, and keep one Menu control at any width.

## Capabilities

### New Capabilities

- `dashboard-shell`: the signed-in frame, its per-role navigation, its phone navigation, and the Workspace
  and user controls it carries.

### Modified Capabilities

- None. The status vocabulary and the theme rules from `ui-foundations` are consumed as they stand.

## Impact

- Added: `src/data/viewer.ts` (or equivalent), `src/lib/nav.ts`, `src/app/dashboard/layout.tsx` and a
  placeholder page, shell components under `src/components/dashboard/`, `scripts/nav.test.ts`.
- Changed: `src/lib/otp.ts` only to send a verified sign-in to `/dashboard` again.
- Untouched: `src/lib/session.ts`, `src/lib/auth.ts`, every auth screen, the backend (parked).
- No dependency is added. Every control is already installed through `@base-ui/react` and
  `src/components/ui/`.
