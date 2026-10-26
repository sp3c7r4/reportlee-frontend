# people-management

## Purpose

Who is in the Workspace, who is invited, and which Space each person reports into.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions. The
invitation rules are server rules; the table mirrors them.

## ADDED Requirements

### Requirement: Guards are explained beside the action

Every blocked action MUST appear disabled with a sentence beside it naming the rule: the last active Workspace
Admin cannot be demoted or deactivated, a Space with members cannot be archived, appointing a Head replaces the
existing one and MUST name both people first, moving a person MUST state that their old Reports stay in the old
Space, promoting to Admin MUST clear the Space, and demoting an Admin MUST require choosing one.

#### Scenario: The last Admin

- **WHEN** the only active Admin tries to demote themselves
- **THEN** the control is disabled and says a Workspace needs at least one active Admin

#### Scenario: A new Head

- **WHEN** a Head is appointed to a Space that already has one
- **THEN** the confirmation names the outgoing Head and the incoming one

#### Scenario: Changing Space

- **WHEN** somebody is moved to another Space
- **THEN** the confirmation says their earlier Reports keep their original Space

### Requirement: People and Spaces can be managed

The area MUST offer: create a Space, rename a Space, assign a Head, reactivate a Membership, revoke an invitation,
change a role and change a Space. Space names MUST be unique within the Workspace, case-sensitively compared after
trimming.

#### Scenario: A duplicate Space name

- **WHEN** a Space is created with a name that already exists
- **THEN** the field refuses it and names the existing Space

#### Scenario: Revoke

- **WHEN** a pending invitation is revoked
- **THEN** it leaves the table and its reserved seat is released

### Requirement: The invite dialog shows the limit

The invite flow MUST show how many seats the plan allows and how many are taken, counting pending invitations as
reserved. At the limit it MUST show an Upgrade link and MUST NOT submit.

#### Scenario: At the limit

- **WHEN** a Starter Workspace with ten members and one pending invitation invites an eleventh person
- **THEN** the dialog says the plan is full and links to Upgrade

#### Scenario: An invitation expires

- **WHEN** an invitation is seven days old
- **THEN** it is expired, its seat is released, and it can be resent

### Requirement: A Head manages their own Space only

A Head of Space MUST reach the member table through My Space, MUST invite Staff only, and MUST NOT change roles or
move people. The KPI template MUST be editable by a Workspace Admin and by the Space's Head, and an existing draft
MUST keep the rows it started with.

#### Scenario: A Head's view

- **WHEN** a Head opens My Space's members
- **THEN** no role control and no move control is rendered for anyone

#### Scenario: Template change with a draft open

- **WHEN** the template gains a field while somebody holds a draft
- **THEN** the draft keeps its original rows

### Requirement: The member table shows members and invitations together

`/dashboard/members` MUST list active members and pending invitations in one table, with filter chips for
role and status, an Invite members primary action, and a row action per person. Email addresses MUST be
visible to Workspace Admins only.

#### Scenario: A pending invitation

- **WHEN** an invitation has not been accepted
- **THEN** it appears in the same table with an Invited state and a Resend action

#### Scenario: A phone

- **WHEN** the table is read at 390px
- **THEN** rows become cards with the same facts

### Requirement: Invitation rules depend on the role

A Workspace Admin MUST be able to invite any role. A Head of Space MUST be able to invite Staff only, into
their own Space. Every invitation MUST name a role and, for Staff and Head, a Space.

#### Scenario: A Head invites

- **WHEN** a Head of Space opens the invite flow
- **THEN** the only role offered is Staff and the Space is fixed to their own

#### Scenario: A missing Space

- **WHEN** a Staff invitation is submitted with no Space
- **THEN** the field says a Space is required and nothing is sent

### Requirement: Leaving a Workspace keeps the record

Deactivating a Membership MUST NOT delete the person's Reports, comments or tasks; they stay attributed. A
deactivated person MUST NOT appear in role pickers.

#### Scenario: Deactivated

- **WHEN** a Member is deactivated
- **THEN** their Reports remain, their name still appears on them, and they are absent from pickers

### Requirement: Spaces are cards with a state

`/dashboard/spaces` MUST show one card per Space with its Head, member count and this period's submission
bar. A Space with no members MUST be archivable, hidden from pickers, and restorable. The Space page MUST
have Reports, Members and the KPI template tabs.

#### Scenario: Archive

- **WHEN** a Space with no members is archived
- **THEN** it disappears from every Space picker and its Reports stay readable

#### Scenario: KPI template

- **WHEN** the KPI template tab is edited by a Head
- **THEN** the new fields prefill the next Report started in that Space

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Members | `GET /api/v1/members` | none | `Member[]` | 401, 403 |
| Invite | `POST /api/v1/invitations` | `{ email, role, spaceId? }` | `Invitation` | 401, 403, 400, 409 |
| Change a Membership | `PATCH /api/v1/members/:id` | `{ role?, spaceId?, active? }` | `Member` | 401, 403, 404 |
| Spaces | `GET /api/v1/spaces` | none | `Space[]` | 401, 403 |
| Archive | `PATCH /api/v1/spaces/:id` | `{ archived: boolean }` | `Space` | 401, 403, 404, 409 |

Guards: `jwt.validateToken`, then the role guard for the action, then the Space scope for a Head. A Head
inviting an Admin or another Head is refused with 403 by the server.

## Frontend

- `/dashboard/members`: table, filters, invite dialog, row menu, states.
- `/dashboard/spaces` and `/dashboard/spaces/:id`: cards, tabs, KPI template editor, archive and restore.
- Reached from the nav's Members and Spaces items, and Settings for the KPI template.
- Types: `Member`, `Invitation`, `SpaceSummary`, `KpiTemplateField` in `src/lib/people.ts` and
  `src/data/viewer.ts`.
