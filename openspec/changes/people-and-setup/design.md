# Design: people-and-setup

| Area | Choice |
|---|---|
| Routes | `/onboarding` for setup, `/dashboard/members`, `/dashboard/spaces`, `/dashboard/spaces/:id` |
| Logic | `src/lib/people.ts` (who may invite whom, table filters, archiving) and `src/lib/setup.ts` (steps) |
| Invitations | one function `inviteRules(viewer)` returning the roles and the fixed Space, so the dialog cannot offer a role the server refuses |
| Spaces | a `SpaceSummary` record with Head, member count and this period's counts, derived once |
| Archiving | a flag on the Space, with pickers filtering archived ones out |
| Record keeping | deactivation is a flag on the Membership; nothing is deleted |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | `inviteRules` is shared by the dialog and the future server guard | Two copies of "a Head invites Staff only" is how a Head invites an Admin |
| D2 | Invitations live in the member table | A second screen for pending invitations is a place people forget to look |
| D3 | Deactivation keeps the name on Reports | The record is the product; erasing a person's history breaks the audit |
| D4 | Archived Spaces keep their Reports | Archiving is tidiness, not deletion |
| D5 | The setup banner is Admin-only | A Staff member cannot fix setup, so the banner would be noise they cannot act on |
| D6 | The KPI template is edited on the Space page | It belongs to the Space, and Settings is a Workspace-level surface |

| D7 | Guards are explained beside the disabled action | A disabled control with no sentence is a dead end |
| D8 | Appointing a Head names both people | Replacing a Head is a demotion, and the old one deserves to see it coming |
| D9 | Pending invitations reserve a seat | Counting only accepted members lets a Starter Workspace exceed ten |
| D10 | Seven day invitation expiry is an assumption | No document fixes it, and one constant changes it |

## Rejected

- A separate invitations page: the table already has the rows.
- Deleting a Membership: it destroys attribution, and the ADRs make the record the point.
- A Space chooser for an Admin's own invitation: an Admin belongs to no Space by definition.
- Sending the invitation email in this change: no mail provider is wired, and a fake send would claim
  something that did not happen.

## Known ceiling

Invitations are simulated rows; no email leaves the machine. Setup state is local, so a second device does
not see a half-finished setup. The five calls above replace the `simulate*` bodies when the backend lands.
