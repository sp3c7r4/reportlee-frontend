# super-admin-console

## Purpose

The operator's screens: every Workspace, one Workspace in detail, plans, the URL rename, and the platform audit
log. Separate from a Workspace Admin's screens and separate from a Workspace.

No backend exists, and the privileged database role described in ADR 0004 cannot be simulated honestly. The
screens are built against the documented contract and answered by a `simulate*` function, and the UI MUST NOT
suggest it is already privileged.

## ADDED Requirements

### Requirement: An isolated route group, and an operator identity

The console MUST live in its own route group, MUST import nothing from the dashboard, and MUST have its own sample
operator identity: a constant, not a Membership, with no path into the dashboard. A test MUST fail if a console
module imports a dashboard module. The group MUST be marked in code as the thing to extract to
`console.reportlee.app`.

"Open Workspace" MUST be a read-only support view with a non-dismissible banner naming who is viewing and that
the opening is being recorded, and the audit entry MUST be written before the content renders.

#### Scenario: Isolation

- **WHEN** the import graph is checked
- **THEN** no console module imports a dashboard module, and the test fails if one does

#### Scenario: Support view

- **WHEN** an operator opens a Workspace's content
- **THEN** the banner is present, cannot be dismissed, and the audit entry already exists

### Requirement: A Super Admin belongs to no Workspace

The console MUST live outside `/dashboard`, MUST NOT appear in any Workspace's navigation, and a Super Admin
MUST NOT be offered in any Workspace role picker. A Super Admin's screens MUST NOT carry a Workspace switcher.

#### Scenario: Role pickers

- **WHEN** an Admin invites a member
- **THEN** Super Admin is not among the roles

#### Scenario: Navigation

- **WHEN** an operator signs in
- **THEN** they land in the console, not in a Workspace dashboard

### Requirement: The Workspace list and detail

The console MUST list Workspaces with plan, member count, plan status and last activity, with search and
filters. A Workspace's page MUST show its plan, its Admins, its Spaces and its record counts, and MUST offer
plan management and the URL rename.

#### Scenario: Finding a Workspace

- **WHEN** an operator searches for a Workspace by name or URL
- **THEN** the matching rows appear with their plan status

### Requirement: Suspend, restore, and rescue

The console MUST be able to suspend a Workspace and restore it, and MUST be able to recover a locked-out Admin by
issuing a recovery. Suspending MUST NOT delete anything, and both actions MUST be audited.

#### Scenario: Suspended

- **WHEN** a Workspace is suspended
- **THEN** its members see the suspended screen and the console shows it as suspended

#### Scenario: Locked-out Admin

- **WHEN** the only Admin cannot sign in
- **THEN** an operator can issue a recovery, and the action is in the audit log

### Requirement: A URL rename keeps the old address

Renaming a Workspace's URL MUST reuse the creation rules, MUST refuse every reserved word including `console`,
MUST require confirmation naming the consequence, MUST keep the old address redirecting, MUST never allow the old
address to be claimed by another Workspace, and MUST record the change in the platform audit log.

#### Scenario: Rename

- **WHEN** an operator renames a Workspace URL
- **THEN** the old address redirects to the new one and the change is in the audit log

### Requirement: Every opening is audited

Opening a Workspace's content MUST write an audit entry naming who, when and what was opened, before the
content is shown. The console MUST display that log, and MUST NOT offer a way to edit or delete an entry.

#### Scenario: Reading a Report

- **WHEN** an operator opens a Workspace's Reports
- **THEN** an entry exists for that opening and the page states that it was recorded

### Requirement: Money is displayed, never computed

Plan management MUST show the plan catalogue and the Workspace's current plan as the API returns them. The
console MUST NOT compute a price, a proration or a discount.

#### Scenario: Changing a plan

- **WHEN** an operator changes a Workspace's plan
- **THEN** the page shows what the API returned, and no in-app arithmetic appears

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Workspaces | `GET /platform/v1/workspaces?q=&status=` | none | `PlatformWorkspace[]` | 401, 403 |
| One Workspace | `GET /platform/v1/workspaces/:id` | none | `PlatformWorkspaceDetail` | 401, 403, 404 |
| Plan | `PATCH /platform/v1/workspaces/:id/plan` | `{ plan }` | `PlatformWorkspace` | 401, 403, 409 |
| Rename | `PATCH /platform/v1/workspaces/:id/url` | `{ url }` | `PlatformWorkspace` | 401, 403, 409, 400 |
| Audit log | `GET /platform/v1/audit-log?cursor=` | none | `PlatformAuditEntry[]` | 401, 403 |

Guards: `jwt.validateToken`, then a Super Admin guard, then an audit write before any content read. Normal
application code and the Assistant MUST NOT use the privileged role.

## Frontend

- `/super-admin` and `/super-admin/workspaces/:id`, outside the dashboard shell.
- The audit log renders append-only, with no edit or delete control anywhere.
- Types: `PlatformWorkspace`, `PlatformWorkspaceDetail`, `PlatformAuditEntry` in `src/lib/super-admin.ts`.
