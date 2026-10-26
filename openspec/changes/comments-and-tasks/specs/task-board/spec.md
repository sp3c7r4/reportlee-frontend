# task-board

## Purpose

Follow-up tasks as work: a board with three columns, views that differ by role, and a completion that keeps
a note.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions in
`src/lib/reports.ts`. Who may move a card is a server rule; the board mirrors it.

## ADDED Requirements

### Requirement: Views depend on the role

A Staff member MUST see "Assigned to me". A Head of Space MUST see "Assigned to me", "Assigned by me" and
"My Space". A Workspace Admin MUST see "Assigned by me" and "Everyone", and MUST NOT be offered
"Assigned to me", because an Admin authors no Reports.

#### Scenario: An Admin opens the board

- **WHEN** a Workspace Admin opens the board
- **THEN** the views are Assigned by me and Everyone

### Requirement: Only the assignee moves a card

A card MUST be draggable only in "Assigned to me", and only by its assignee. In every other view a card MUST
show its column and MUST NOT be draggable.

#### Scenario: A reviewer tries to drag

- **WHEN** a Head tries to drag a card in "My Space" that is assigned to someone else
- **THEN** the card does not move and nothing is written

### Requirement: A due date is required and never in the past

Every task MUST carry a due date, entered in the Workspace's timezone, MUST refuse a date in the past, and MUST
show the days remaining on the card.

#### Scenario: Yesterday

- **WHEN** a due date is set to yesterday
- **THEN** the field refuses it and names today as the earliest allowed

### Requirement: The board filters

The board MUST offer filters for Space, assignee, assigner and Overdue in every view, and MUST keep the filter in
the address so a filtered board can be linked.

#### Scenario: Overdue only

- **WHEN** the Overdue filter is on
- **THEN** only cards past their due date remain, and the address carries the filter

### Requirement: Done is a 14 day window

A Done column MUST show only cards completed in the last 14 days, with a "Show older" control that reveals the
rest. The limit MUST be stated, not silent.

#### Scenario: Old completions

- **WHEN** the Done column is opened
- **THEN** it says the last 14 days are shown and Show older reveals the rest

### Requirement: Moves appear on the Report timeline

A task attached to a Report MUST add its status changes to that Report's timeline as task events, without
changing the Report's own state.

#### Scenario: Moved to In progress

- **WHEN** the assignee moves a task attached to a Report
- **THEN** the Report's timeline gains a task event naming the move

### Requirement: A read-only Workspace accepts no moves

In a read-only Workspace cards MUST NOT move, dragging MUST be disabled, and the board MUST say why.

#### Scenario: Read-only board

- **WHEN** the board is opened in a read-only Workspace
- **THEN** no card moves and the reason is shown

### Requirement: Completing a task keeps a note

Moving a card to Done MUST offer an optional note and an optional file, MUST record the completion time, and MUST
NOT block the move when both are skipped. Moving a card out of Done MUST clear its completed time, its note and
its completion file.

#### Scenario: Completed, then reopened

- **WHEN** a completed card is moved back to In progress
- **THEN** its completed time and completion note are cleared

### Requirement: The phone moves cards without dragging

At every width each card MUST offer a "Move to" menu listing the other two columns, operable from the keyboard.
Drag is an addition for those with a pointer and MUST NOT be the only way.

#### Scenario: Keyboard only

- **WHEN** a card's Move to menu is opened from the keyboard on a desktop
- **THEN** every other column is reachable and choosing one moves the card

#### Scenario: A pointer

- **WHEN** a card is dragged in Assigned to me
- **THEN** it moves, and the menu is still there for the next person

### Requirement: The board has the four states

The board MUST have a loading state, an error state with Retry, an empty state per column and an empty state
per view.

#### Scenario: An empty column

- **WHEN** Done has no cards
- **THEN** the column says so rather than collapsing

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Board | `GET /api/v1/tasks?view=` | none | `FollowUpTask[]` | 401, 403 |
| Move | `PATCH /api/v1/tasks/:id` | `{ status, note?, attachment? }` | `FollowUpTask` | 401, 403, 404, 409 |

Guards: `jwt.validateToken`, then the assignee check for a move, then the view's scope on the server.

## Frontend

- `/dashboard/tasks`: view switcher, three columns, cards with due date and origin, completion dialog,
  Move to menu at 390, the four states.
- Reached from the nav's Tasks item and the Tasks tab on a phone.
- Types: `TaskStatus = "todo" | "in-progress" | "done"`, `TaskView`, `FollowUpTask` in `src/lib/tasks.ts`.
