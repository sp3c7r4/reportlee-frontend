# Design

This change is the record of its own decisions: `proposal.md` for why, the two spec deltas for behaviour,
and this file for the implementation shape and the rejected alternatives. The team's earlier gate document
under `docs/superpowers/` was deleted on 2026-10-26, so nothing here depends on it.

## Context

Read before writing this: `src/lib/theme.ts`, `src/app/globals.css`, `package.json`, and the exported
entry points of `@base-ui/react` 1.8.0. Facts that shaped the design:

- `globals.css` already carries both themes, the full token set, the type scale, radii, hairlines and
  shadows. Nothing in UI-1 is missing except a System theme.
- `@base-ui/react` 1.8.0 already exports `toggle`, `toggle-group`, `radio-group`, `progress`, `switch`
  and `toast`, so chips, a segmented control and toasts need no new package.
- Satoshi supports tabular figures. Measured at 40px: `1111` is 52.97px and `8888` is 97.92px by
  default; with `font-variant-numeric: tabular-nums` both are 105.61px.

## Goals and Non-Goals

Goals: one importable vocabulary for report states, with a test that fails if a state is renamed or
dropped. Nothing else.

Non-goals: any component, any screen, the shell, a theme control, a System theme, a toast.

## Implementation

`src/lib/status.ts`:

- `ReportStatus = "pending" | "approved" | "rejected"`.
- `SubmissionStatus = "draft" | "submitted" | "late" | "missing"`.
- `StatusTone = "neutral" | "warning" | "success" | "danger"`. `info` is left out because no state uses
  it, and an unused tone is a colour waiting to be picked by accident.
- `StatusIcon` is a union of seven stable keys (`clock`, `check`, `cancel`, `file-edit`, `sent`, `alert`,
  `minus`). The module holds the key, the pill maps key to a hugeicons component with a `Record`, so a
  missing mapping is a compile error and the test can prove no two states share an icon. Keeping the
  icon components out of the module is what lets a plain Node test import it.
- Draft is an author-only label. The module only names states; which state a viewer is shown is decided
  by the screen that already knows the viewer, so nothing in this module needs to know about roles. The
  rule it does encode is that there is no fifth "missing for reviewers" state: a person with only a
  draft is `missing`, and the reviewer never sees `draft`.
- Two tables typed `Record<ReportStatus, StatusEntry>` and `Record<SubmissionStatus, StatusEntry>`,
  where `StatusEntry` is `{ label: string; tone: StatusTone }`.
- No imports at all: no React, no icon package. The tone to icon map belongs to the component that
  renders a tone, so the module stays loadable by a plain Node test.

Why `Record` and not a `switch`: a `Record` over a union makes a missing member a compile error. A
`switch` with a `default` silently swallows the new case, which is exactly the bug this change exists to
prevent.

`scripts/status.test.ts`:

- Imports only `../src/lib/status.ts`.
- Asserts the label and tone of all seven values as literal strings, so a silent relabel fails the test
  rather than passing because it compared the module to itself.
- Asserts that draft is neither late nor missing, which is the one rule CONTEXT.md is explicit about.

`src/lib/theme.ts`:

- Remove `nextTheme` and `themeToggleLabel`. Nothing imports them (`grep` confirms only their own
  definitions), and a two-state helper would pin the shape of a control the shell has not designed.
- Rename the cookie `iroyin-theme` to `reportlee-theme`. The old name is dropped rather than migrated, so
  everyone falls back to light once. There is no production traffic to protect.
- `themeCookie(theme, hostname?)` gains an optional host and emits `domain=reportlee.app` only when the
  host is `reportlee.app` or ends with `.reportlee.app`. Keeping it a parameter rather than reading the
  location inside the module keeps the function pure and testable, and stops local development on
  `localhost` from setting a domain the browser will reject.
- Everything else stays, so both layouts keep rendering exactly as they do today.

`scripts/theme.test.ts`:

- Pins `parseTheme` defaults: nothing, garbage and `light` all resolve to light, `dark` resolves to dark.
- Pins `themeCookie`: the name, `path=/`, `samesite=lax`, and that the domain attribute appears for
  `reportlee.app` and `team.reportlee.app` and is absent for `localhost` and for a look-alike host such as
  `notreportlee.app`.

## Rejected alternatives

**Per-number `tabular-nums` classes.** Hundreds of call sites, and one forgotten number breaks the column.
The rule is one declaration on the shell root, which every signed-in surface renders inside, so numerals
align everywhere by inheritance and the landing page is untouched. The declaration lands with UI-3, where
the shell root exists; this change only records the decision. `font-variant-numeric` inherits, so one rule
on the shell root is enough.

**A global `font-variant-numeric: tabular-nums` rule.** One line, but it would also change the landing
page's numerals, which `docs/UI.md` explicitly keeps as they are.

**Shipping a `System` theme now.** It cannot be resolved before first paint from a cookie, so it needs
either the whole dark token block duplicated under a `prefers-color-scheme` query or a pre-paint inline
script against a data attribute on each themed wrapper. Both are real complexity for a preference no
person can set yet, since there is no signed-in surface.

**Shipping the pill, skeleton, chips, toggle, error state and guarded action now.** Each is composition
of what exists, and each has a first caller one task away. A component written before its caller gets
its props wrong, and six of them at once is six wrong APIs.

**A toast with `sonner`.** A new dependency for a surface nothing shows yet, when base-ui's toast is
already installed.

## Risks and trade-offs

- The tone name is data, the colour is the component's job. A component could still pick its own colour
  and the module's test would not notice. Guarded by AC5 in the gate-1 spec, which forbids any pill in
  this diff, and by the pill being written in UI-3 against the tone map.
- Labels live in two places: `CONTEXT.md` prose and this module. The test pins the module's strings, so a
  change to one without the other is caught in review, not by the build.
- Deferring System means the shell's switch will be a two-way toggle. If System returns, `theme.ts` and
  the two layouts change together.

## Open from this change

Satoshi passes the tabular-figures check (measured above). The 12 to 14px legibility check in both themes
has not been run. It belongs to UI-1 rather than to any screen, and it is tracked in `docs/ROADMAP.md`.

## Migration

None. No stored value changes meaning, and the two deleted helpers have no callers.
