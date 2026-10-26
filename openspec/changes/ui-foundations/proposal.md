## Why

The shell (UI-3) is the next task, and it needs two things that do not exist yet: one agreed name and
colour for every state a report can be shown in, and a written ruling on which appearance options the
product offers. Without them the shell invents a label per screen and a tone per component.

## What Changes

- Add the status vocabulary as one pure module: three report statuses (pending, approved, rejected) and
  four states (draft, submitted, late, missing), each with one fixed label, one tone and one icon. Draft
  is author-only: a person with only a draft reads as missing to every reviewer.
- **BREAKING (internal)**: remove the two-state theme helpers `nextTheme` and `themeToggleLabel` from
  `src/lib/theme.ts`. Nothing imports them, and a two-state toggle is the wrong shape for a control the
  shell has not designed yet.
- Rename the theme cookie to `reportlee-theme` and scope it to `reportlee.app` and `*.reportlee.app`, so
  the choice follows a person across Workspace subdomains.
- Record, as requirements, that the User record is the source of truth once signed in with the cookie as
  a first-paint mirror, and that Light, Dark and System are the offered appearances while System stays
  deferred until a theme control exists.
- No dependency is added. No backend, no database, no new component.

## Capabilities

### New Capabilities

- `report-status`: the fixed name, tone and icon for every state a report can be shown in.
- `theme`: which appearance options the product offers, and how the stored choice is read.

### Modified Capabilities

- None. `openspec/specs/` is empty, so this is the first capability set in this repo.

## Impact

- Added: `src/lib/status.ts`, `scripts/status.test.ts`, `scripts/theme.test.ts`.
- Changed: `src/lib/theme.ts`, the cookie name and scope change, and two unused exports are removed.
- Untouched: every screen, every component, `package.json`, `package-lock.json`, and the backend, which
  does not exist yet.
- Replaces no existing spec. No migration.
