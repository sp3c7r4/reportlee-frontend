## Why

The four surfaces that make the product administrable and trustworthy are missing: the settings an Admin
changes, the Assistant that reads the Workspace, the operator console behind the product, and the audit pass
that proves the whole thing holds together. Without them an Admin cannot change a schedule, an operator cannot
help a locked-out Workspace, and nothing in the app has been checked as a whole.

## What Changes

- Add `/dashboard/settings`: General, Reporting (schedule, edit window, location), AI features, Plan and
  billing, Audit log and Data export, each with its own address.
- Add the Assistant: a docked panel and a full page with history, a context chip, source links and the off
  state, for Workspace Admins only.
- Add the Super Admin console: Workspace list and detail, plan management, URL rename and the platform audit
  log, behind a role that belongs to no Workspace.
- Add the polish and audit pass across every screen: both themes, phone widths, keyboard only, reduced motion,
  contrast, and the empty, loading and error states.
- No new dependency. No backend, and no deploy or infrastructure change.

## Capabilities

### New Capabilities

- `workspace-settings`: the settings area, what each page changes, and the read-only banner.
- `assistant`: who sees it, what the context chip may widen, and how every claim links to its sources.
- `super-admin-console`: the operator's screens, plan management, URL rename and the audit requirement.
- `polish-audit`: the finish criteria every screen must hold before the backend starts.

### Modified Capabilities

None.

## Impact

- New: `src/lib/settings.ts`, `src/lib/assistant.ts`, `src/lib/super-admin.ts`,
  `src/components/settings/`, `src/components/assistant/`, `src/components/super-admin/`, the routes under
  `src/app/dashboard/settings/` and `src/app/super-admin/`, plus a test beside each lib module.
- Touched: the shell for the Assistant panel and the read-only banner; every screen for the audit pass.
- Money is shown, never computed: plan and billing display what the API returns and add no arithmetic.
