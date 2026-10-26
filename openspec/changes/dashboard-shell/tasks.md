# Tasks

Two tasks: UI-3a is the desktop frame with a drawer, UI-3b is the bottom tab bar. All frontend, all on
sample data. Tests first.

## UI-3a. Desktop frame

- [x] 3a.1 Write `scripts/nav.test.ts` before `src/lib/nav.ts` exists. Assert, with literal strings: the
      Admin sidebar has no "My reports", every role has "Tasks", each role's sidebar is exactly its own
      ordered list, and each role's phone tabs are exactly their five items and are not a subset of the
      sidebar. Run `npm test` and record the failure naming the missing module.
- [x] 3a.2 Write `src/lib/nav.ts`: `Role`, `NavItem`, `NavGroup`, `NavTab`, and `navFor(role)` returning
      `{ groups, tabs }` from `Record` lookups. No React. Run `npm test` until green.
- [x] 3a.3 Write `src/data/viewer.ts`: `Workspace` (with plan, memberLimit, aiFeatures), `User`, `Membership`,
      three Workspaces, three memberships for one User, and `ACTIVE_MEMBERSHIP_ID` as the initial choice only.
      The Admin Membership sits in Kano (Starter, 7 of 10, AI off). The module comment states it is sample data
      and that hiding a nav item is not a guard.
- [x] 3a.3b Wire the switcher to in-memory state seeded from that constant, and confirm a reload resets it.
- [x] 3a.4 Add `src/app/dashboard/layout.tsx` and `src/app/dashboard/page.tsx` (placeholder: page title,
      breadcrumb, empty state). The layout holds the shell root classes, including `tabular-nums` and the
      theme class.
- [x] 3a.5 Build the sidebar: 240 to 260px, collapsible, flush to the three edges, 1px hairline, groups
      rendered from `navFor(role).groups`, the active item marked from the path. Below the large breakpoint
      it is replaced by the drawer. Collapse lives in the shell (76px against 260px, 300ms, reduced motion
      respected, `reportlee-sidebar` on the device), the brand row carries the toggle, and the drawer is
      always expanded.
- [x] 3a.6 Build the Workspace switcher: current Workspace with member count, the list with a tick, and a
      Create workspace modal asking only name and URL, validating the URL with the existing `slugify` and
      `isReservedSlug` from `src/lib/onboarding.ts`, and showing the plan notice.
- [x] 3a.7 Build the top bar: breadcrumbs left; the bell placeholder and a slot for the page's single
      primary action on the right.
- [x] 3a.8 Build the user menu: name, email, role and Space header, then Profile, Notification
      preferences, Theme and Sign out. Theme is a two-way control that writes the cookie for the device and
      flips the shell root immediately.
- [x] 3a.8b Give the sidebar its search field (shortcut hint, collapsing to an icon with a label) and the
      person's row at the bottom as the user-menu trigger.
- [x] 3a.9 Grey the Assistant item when the AI switch is off, keeping it in place with its reason.
- [x] 3a.9b Give the dialog, sheet and dropdown wrappers a portal container and pass the shell's container,
      then check a dark user menu, a dark Create workspace modal and a dark drawer.
- [x] 3a.10 Add the Admin-only usage card: a bar reading "7 / 10 members" on Starter, and the member count
      with no bar on Team. Confirm Staff and Heads never see it.
- [x] 3a.10b Add the top bar action slot and `useTopBarAction`; fill it on Home with Submit report for Staff
      and Head, never for an Admin.
- [x] 3a.10c Add the two page wrappers: data at about 1,440px, reading at 720 to 800px.
- [x] 3a.10d Active item: soft fill, thin orange indicator, `aria-current`. Add `nav` and `main` landmarks, a
      skip link and full keyboard operation. The drawer traps focus, closes on Escape and closes on
      navigation.
- [x] 3a.11 Add the drawer below the large breakpoint, rendering the same nav groups as the sidebar.
- [x] 3a.12 Point every sign-in destination at `/dashboard`: the code flow in `src/lib/otp.ts` (and its
      test), password sign-in, provider sign-in, and onboarding's final step.
- [x] 3a.13 Sign out calls `clearSession()` and lands on `/login`; `/dashboard` without a session redirects to
      `/login`, commented as convenience rather than a guard.
- [x] 3a.14 Confirm one Menu control at any width: the drawer below lg now, the tab bar below md in 3b.

## UI-3b. Phone tab bar

- [x] 3b.1 Render the tab bar from `navFor(role).tabs`, exactly five items, with Menu opening the drawer.
      Do not derive it from the sidebar. `src/components/dashboard/tab-bar.tsx` reads the module and closes
      over nothing else; the Admin Assistant tab carries `disabledBy: "ai"` so the phone greys it on a plan
      with AI off, the same rule as the rail.
- [x] 3b.2 Check that the bar does not double up with the drawer control, and that tap targets reach 44px.
      Measured: 390px shows the bar and no top bar control, 900px shows the top bar control and no bar,
      1024px shows the rail and neither. Rows are 56px.
- [x] 3b.3 Record the tab bar's own result in the roadmap row.

## Validation, both tasks

- [x] V.1 `npx biome check` on the touched files, compared against the previous copy so pre-existing
      diagnostics are not mistaken for new ones.
- [x] V.2 `npx tsc --noEmit`.
- [x] V.3 `npm test`.
- [x] V.4 `npm run build`.
- [x] V.5 Browser pass, per role: `/dashboard` at desktop and phone widths, sidebar items and group labels,
      search field, person row, drawer, Workspace switcher and its in-memory reset, Create workspace modal,
      user menu, theme switch, Assistant greyed, usage bar on Starter, `/dashboard` reached after sign-in,
      `/login` reached with no session.
- [x] V.5b Dark pass with overlays open: user menu, Create workspace modal and drawer all render dark.
- [x] V.6 Console and network: no errors, no request to a host other than the configured ones. Checked at
      390px after the tab bar landed: no console messages, and the only off-host requests were the font CDN.
- [x] V.7 `rg -n "[\u2014\u2013]"` over the touched files, accepting hits only inside comments.
- [x] V.8 Confirm `package.json` is unchanged and that nothing in the diff claims the navigation is a guard.

## Validation, UI-3a

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Tests, red first | `npm test` before `src/lib/nav.ts` existed | `ERR_MODULE_NOT_FOUND` for `nav.ts`, and the flow test failing because sign-in still pointed at `/` |
| Tests, green | `npm test` | 21 tests, 21 pass, 0 fail |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | compiled, 14/14 static pages, `/dashboard` dynamic |
| Lint | `npx biome check` on the touched files, compared with the same files in `reportlee-frontend/` | no new diagnostics. `login-form`, `dialog`, `sheet` and `dropdown-menu` already needed formatting before this change; `oauth-buttons` was formatted because the debt was mine |
| Em dashes | `rg -n "[—–]"` on the touched files | none |
| Dependencies | `diff package.json ../reportlee-frontend/package.json` | unchanged |

Browser, at 1440 and at 390:

- `/dashboard` with no session lands on `/login`; after the simulated sign-in it renders the frame.
- Admin (default, Kano): sidebar groups Work, Review, People, Insight, Manage; items Overview, Tasks, Review, Spaces, Members, Analytics, Settings; no My reports; Assistant present and disabled with "AI off"; usage card reads "Starter plan 7 / 10 members" with `aria-valuenow="7"` and the bar; no Submit report anywhere.
- Switcher: choosing Northline changes the items to the Head list and the label to "Northline Logistics 12 members"; choosing Arthurite gives the Staff list. A reload returns to the Admin Membership, so the choice is memory only.
- Home fills the top bar action slot with Submit report for Staff and Head, and never for Admin.
- Active item: 5% ink fill, a 2px `rgb(255, 107, 44)` indicator at the left edge, `aria-current="page"`.
- Landmarks: `nav` with `aria-label="Main"`, `main#main`, and a skip link to it.
- Dark: shell background `rgb(10, 10, 11)`; the workspace menu and the Create workspace modal both render `rgb(20, 20, 22)` and sit inside the shell's `.dark`, so the portal container works.
- Create workspace: shows the 30-day trial then Starter notice and the fixed-URL notice, rejects a reserved URL, and states that nothing is saved.
- Phone at 390: the sidebar is `display: none`, exactly one Menu control, the drawer opens inside the shell, Escape closes it, and choosing a destination closes it.
- Sign out clears the simulated session and lands on `/login`.
- Console: no errors and no warnings beyond Next's pre-existing `scroll-behavior: smooth` note.

Two defects found and fixed during the pass, both from the first attempt:

1. The theme was read in the client, so the server rendered light and the client dark. React refuses to patch an attribute mismatch, which left the shell light with a dark cookie. The layout now reads the cookie on the server and passes `initialTheme`; `export const instant = false` is set for the same reason the auth layout sets it.
2. `dark` was stacked next to `bg-surface text-ink`, so both background utilities were present and CSS order decided the winner. `.dark` re-declares `--surface`, `--ink` and `--hairline`, so the flag alone now carries the theme.

## Correction, 2026-10-26

3a.5 was ticked while claiming a collapsible rail. The rail is fixed at 260px: `Sidebar` hardcodes
`collapsed = false` and `shell.tsx` owns the width, so there is nothing to toggle. Reopened as 3a.15 rather
than left as a false Done, and the ROADMAP backlog records it.

Also worth knowing from the same pass: four sidebar destinations are 404s (`/dashboard/reports`,
`/dashboard/tasks`, `/dashboard/review`, `/dashboard/spaces`), because the nav module ships its links a phase
before the screens exist.

## Validation, UI-3b

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 22 pass, 0 fail (was 21; one new guard added) |
| Red first | removed the `disabledBy: "ai"` flag from the Admin Assistant tab | 21 pass, 1 fail: `actual: undefined, expected: 'ai'`, so the new guard fails when the behaviour it guards is broken |
| Build | `npm run build` | compiled in 2.3s, 14/14 pages |
| Lint | `npx biome check` on the touched files | no fixes needed |
| Em dashes | `rg -n "[—–]"` on the touched files | no hits |

Browser, 390 by 844 with touch emulation, Admin in Kano Programme Office (Starter, AI off):

- The bar sits flush at the bottom with five tabs, Home active, each 56px tall and focusable, and the
  Assistant tab greyed with the reason in its accessible name.
- Menu opens the same drawer the rail becomes, inside the shell's theme, and Escape closes it. Drawer rows
  measure 44px and up.
- Exactly one visible Menu control at each width: 390 tab bar only, 900 top bar only, 1024 rail only.
- Light and dark both render the bar on `bg-surface` with a hairline top edge, and the inactive labels sit
  at 60% ink so they clear the small-text contrast bar.
- The main region carries bottom padding of the bar's height plus the safe-area inset, so the last row of a
  page is not hidden under it.

## Refinement, 2026-10-26: the bar floats

The bar was a strip welded to the bottom edge with a top hairline. At the user's request it is now a
floating card, inset 12px from both sides and 12px above the bottom edge plus the safe-area inset,
28px radius, elevated on `bg-popover` and `shadow-float` with no border.

- `bg-popover` rather than `bg-surface`: the light page and the light surface are the same #fafafa, so
  the card dissolved into the page it floats over. The layered token is #ffffff in light and #141416 on
  the #0a0a0b dark page.
- Measured at 390px: 366 by 68, 12px side gaps, 12px from the bottom, 20px radius, rows 56px, labels
  11.5px, inactive at 60% ink (7.03:1 on the dark card, 5.25:1 on the light one).
- The main region's bottom padding grew to 6.5rem so the card never sits over the last row of a page.
- The drawer still covers the bar, the bar follows the shell's theme, and one navigation control per
  width is unchanged: 390 bar, 900 top bar, 1024 rail.
- Second pass at the user's request: the corners came down from 28px to 20px, and the selected tab is now a
  filled chip at 14px with the glyph and label in the page colour, so it reads black-on-white in light and
  black-on-white again in dark (the fill drops to the page colour there and takes a hairline, because
  #141416 sitting on #141416 would be invisible). Measured: bar 20px, chip 14px, 71 by 56, fill
  rgb(10, 10, 11) with rgb(250, 250, 250) content in both themes.
- Reverted at the user's request: no filled chip. The selected tab is ink text with a medium label
  again, transparent background, on the same 20px card. Verified in the browser: active background
  `rgba(0, 0, 0, 0)`, colour `rgb(9, 9, 11)`, `aria-current="page"` still present.
