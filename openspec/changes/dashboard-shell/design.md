# Design

## Context

The frame was deleted with the dashboard on 2026-10-26, so nothing of it survives. What exists to build on:
the design tokens and both themes (`src/app/globals.css`), 17 primitives in `src/components/ui/`,
`@base-ui/react` 1.8.0 (dialog, sheet, menu, avatar, tooltip, toast and more), the status vocabulary in
`src/lib/status.ts`, and the theme cookie helpers in `src/lib/theme.ts`.

Read before writing this: `docs/UI.md` (the shell section and the role table), `CONTEXT.md` (Membership,
Workspace, role definitions), ADR 0001 (a User is global, a Membership carries the role), and
`src/lib/theme.ts`.

## Goals and Non-Goals

Goals: the desktop frame at `/dashboard`, a nav module that returns sidebar groups and phone tabs for a
role, the Workspace switcher, the user menu with a two-way theme control, a drawer below the large
breakpoint, and sample data shaped like the real model.

Non-goals: the bottom tab bar (UI-3b), the System appearance (required before the dashboard ships, see the
theme spec), any page content beyond a placeholder, any real data, any guard, and any change to
`src/lib/session.ts`.

## Sample data shape

One file, `src/data/viewer.ts`, so the shape is obvious and swappable:

- `Workspace = { id, name, slug, memberCount, plan, memberLimit, aiFeatures }`, where plan is `starter` or
  `team`. Three records: Arthurite Integrated Group (24, team), Northline Logistics (12, team), Kano
  Programme Office (7 of 10, starter, AI off).
- `User = { name, email }`.
- `Membership = { id, user, workspace, role, space }`, where `space` is a Space name or `null` for an
  Admin, because a Workspace Admin belongs to no Space.
- `Role = "staff" | "head" | "admin"` in this change, and the role names in copy are Staff, Head of Space
  and Workspace Admin.

Three sample memberships, one per role, each in a different Workspace, all belonging to one User, so
switching Workspace actually changes the role. `ACTIVE_MEMBERSHIP_ID` names only the initial Membership. The
switcher swaps in session memory: React state in the shell, seeded from the constant, reset by any reload.
No query parameter, no cookie and no storage selects it. The Admin Membership sits in Kano, so the Starter
usage bar and the greyed Assistant are both visible without switching.

Why a Membership and not a flat viewer: ADR 0001 puts the role on the Membership and the identity on the
User, and the Workspace switcher only makes sense if the same person can hold a different role in each
Workspace. A flat record would have to be thrown away when the API arrives.

`src/lib/onboarding.ts` already declares `InviteRole = "staff" | "admin"`. That union is narrower than the
product's three roles, and widening it belongs to UI-4, which owns the invite step and its Space picker. This
change leaves it alone and does not import it.

## Nav module

`src/lib/nav.ts`, pure, no React:

- `navFor(role: Role): { groups: NavGroup[]; tabs: NavTab[] }`, where `NavGroup` is `{ label, items }` with
  the label drawn from Work, Review, People, Insight or Manage, and `NavItem` is `{ label, href, icon }`.
  Those five labels are the only ones allowed, so a screen cannot invent a sixth.
- Both lists are `Record<Role, ...>` lookups, so a missing role is a compile error, the same guard the
  status module uses.
- `href` values point at `/dashboard`, `/dashboard/reports`, and so on. The pages themselves are
  placeholders in this change; the links are the contract.
- The Assistant item carries `disabledBy: "ai"`, so the shell greys it from the AI switch rather than
  filtering it out of the list. Hiding it would make the switch invisible.
- The module never decides access. Its doc comment says so in one line, and the shell repeats it nowhere
  else, so there is a single place a reader can find the disclaimer.

`scripts/nav.test.ts` asserts the four facts the spec is emphatic about, with literal strings:

1. Admins never get "My reports".
2. Every role gets "Tasks".
3. Each role's sidebar is exactly its own list, in order.
4. Each role's phone tabs are exactly their five items, and the tab list is not a subset of the sidebar.
5. Each role's groups carry the expected labels, and the flattened order matches the table in `docs/UI.md`.

## Shell structure

- `src/app/dashboard/layout.tsx` renders the frame and is the one place the shell root's classes live,
  including `tabular-nums` for the whole signed-in area and the theme class.
- Sidebar: `src/components/dashboard/sidebar.tsx` plus `nav-groups.tsx`, `workspace-switcher.tsx`,
  `usage-card.tsx`.
- Top bar: `src/components/dashboard/top-bar.tsx` with breadcrumbs, the bell as a placeholder trigger, and
  a slot for the page's single primary action.
- User menu: `src/components/dashboard/user-menu.tsx`, using the installed dropdown menu.
- Theme control: `src/components/dashboard/theme-control.tsx`. Two states only. On change it calls
  `writeCookie(themeCookie(next, window.location.hostname))`, which emits the shared parent domain on a
  Workspace subdomain and a host-only cookie on localhost, then flips the class on the shell root. A bare
  hostname is never used as the domain.
- Portals: `@base-ui/react` renders dialogs, menus and sheets through its own Portal, which attaches to
  `document.body` by default and would escape the shell's theme class. The shell exposes one container
  element and every overlay receives it, so `dark` on the shell root reaches menus, dialogs, the drawer and
  toasts. The `dialog`, `sheet` and `dropdown-menu` wrappers gain an optional `container` prop for their
  Portal.
- Session: the shell checks `readSession()` on mount. No session means `router.replace("/login")`, commented
  as a convenience for a build without a backend and explicitly not a guard. Sign out calls `clearSession()`
  and replaces with `/login`; `src/lib/session.ts` is not edited.
- Top bar action: the shell provides an action slot element, and a page fills it with `useTopBarAction(node)`,
  a `createPortal` into that slot. Home fills it with Submit report for Staff and Head of Space, never for an
  Admin.
- Layout wrappers: `src/components/dashboard/page-wrappers.tsx` exports `DataPage` (about 1,440px, centred)
  and `ReadingPage` (720 to 800px column).
- Drawer: `src/components/dashboard/shell-drawer.tsx`, using the installed sheet, opened by the only Menu
  control below the large breakpoint. It renders the same `nav-groups.tsx`, so there is one nav renderer, two
  containers. The sheet traps focus and closes on Escape; choosing an item closes it. In 3b the tab bar
  replaces this control below md.
- Sidebar furniture: a search field at the top showing the shortcut hint and collapsing to an icon, and the
  person's row at the bottom as the user-menu trigger.
- `src/app/dashboard/page.tsx` is a placeholder that proves the frame: title, breadcrumb, and the empty
  state. It exists so `/dashboard` is a real route and the drawer can be used on a phone.

The theme class is applied on the shell root rather than `<html>`, matching what the auth and onboarding
layouts already do, so the landing page stays light.

## Rejected alternatives

**A flat `VIEWER` record.** Smaller today, wrong tomorrow: the role belongs to a Membership, and the
switcher needs two memberships for one person to be meaningful.

**Reading the role from the simulated session.** `src/lib/session.ts` is on the do-not-touch list, and the
session will carry a user id and a session id only, never a role, because the role differs per Workspace.

**A query parameter to preview a role.** A role read from the address bar is the exact bug the rules forbid,
and it teaches a habit that will be copied into the real thing.

**Hiding the Assistant when AI is off.** Hiding makes the switch invisible and looks like a bug; the UI
rules ask for a greyed item with a reason.

## Risks and trade-offs

- The nav module's `href`s point at routes that do not exist yet, so four of eight Admin links 404 until
  their phase. Accepted: the frame needs its links, and the placeholder page is the only one wired in this
  change.
- `Role` here and `InviteRole` in onboarding are two unions with the same two overlapping members.
  Deliberate for now; UI-4 reconciles them when it owns the invite step.
- The sample viewer is a constant, so the frame shows one role at a time. That is the point, and the spec
  requires that nothing else can choose it.

## Migration

None. `/dashboard` was 404 after the removal, and this change makes it a real route again.
