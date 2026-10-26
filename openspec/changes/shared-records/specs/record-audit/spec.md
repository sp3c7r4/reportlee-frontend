# record-audit

## Purpose

The records every screen writes into: a comment, the audit log, and the stream of things a person is told
about.

No backend exists. These modules are the shape the server will own; today they are written by the `simulate*`
functions in `src/lib/reports.ts` and read by the Audit and Notifications screens.

## ADDED Requirements

### Requirement: One comment shape, with a decision kind

`src/data/reports.ts` MUST declare `Comment` once, carrying `id`, `reportId`, `authorMembershipId`, `body`,
`at`, `kind`, `attachments` and an optional `taskId`. `kind` MUST include `"comment"` and `"decision"`. A
rejection or reopen reason MUST be stored as a `decision` comment, never as a field on the Report.

#### Scenario: A rejection reason

- **WHEN** a Report is rejected with a reason
- **THEN** a `decision` comment carries that reason, and the Report page shows it without a second copy

#### Scenario: A reply

- **WHEN** the author replies to a decision comment
- **THEN** a `comment` entry is added under it, and the decision comment is unchanged

### Requirement: Every simulated write records itself

Every `simulate*` function that changes state MUST append an audit entry: decisions and reopens, role and Space
changes, invitations, schedule and setting changes, the AI switch, and an edit after a Report was seen. An entry
MUST carry `at`, `actorMembershipId`, `action`, `target` and a short human summary.

#### Scenario: A role change

- **WHEN** an Admin changes somebody's role
- **THEN** an audit entry names the actor, the person and the old and new role

#### Scenario: An edit after seen

- **WHEN** an author edits a Report a reviewer has already seen
- **THEN** an audit entry records the edit, with the revision count

#### Scenario: A read is not a write

- **WHEN** somebody opens a page
- **THEN** nothing is appended, except the Super Admin console's own audit-before-read, which belongs to that
  capability

### Requirement: Events reach one person

`src/lib/events.ts` MUST turn a state change into zero or more events, each belonging to exactly one
Membership, and MUST route "a new Report needs review" through the review queue's own scope function rather than
its own copy of the rule.

#### Scenario: A decision notifies the author

- **WHEN** a Report is rejected
- **THEN** one event exists for the author and none for the reviewer

#### Scenario: A new Report

- **WHEN** a Report is submitted
- **THEN** the events go to whoever the queue scope says must review it, which is the same function the queue
  uses

### Requirement: Tagging sends nothing

Adding or removing a tagged colleague MUST NOT create an event or a notification. A tag grants no access and
asks nothing of the person.

#### Scenario: Tagged without being told

- **WHEN** a colleague is tagged on a Report
- **THEN** they receive no event and their notification count is unchanged

### Requirement: The records are append-only and readable

The audit log MUST be append-only in the UI, with no edit or delete control anywhere. Both records MUST survive
a page reload on this device and MUST be cleared for a Membership at sign out with the rest of its stored state.

#### Scenario: Reload

- **WHEN** the page is reloaded
- **THEN** the entries are still there and still in order

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Audit log | `GET /api/v1/audit-log?cursor=&action=` | none | `AuditEntry[]` | 401, 403 |
| Comments | `GET /api/v1/reports/:id/comments` | none | `Comment[]` | 401, 403, 404 |
| Post a comment | `POST /api/v1/reports/:id/comments` | `{ body, task?, attachments? }` | `Comment` | 401, 403, 400 |
| Notifications | `GET /api/v1/notifications?state=` | none | `{ items: Notification[], unread: number }` | 401 |

Guards: `jwt.validateToken`, then the Membership from the token. The audit log is Workspace Admin only; the
comment routes use the same Report scope the page uses.

## Frontend

- Nothing renders here: the Audit and Notifications pages, and the discussion on a Report, read these modules.
- Types: `Comment`, `CommentKind`, `Attachment` in `src/data/reports.ts`; `AuditEntry`, `AuditAction` in
  `src/lib/audit.ts`; `Notification` in `src/lib/notifications.ts`.
