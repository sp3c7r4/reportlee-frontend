# report-discussion

## Purpose

The conversation under a Report: questions, answers, and the follow-up task a reviewer can turn a comment
into.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions in
`src/lib/reports.ts`. Who may comment is a server rule; the UI mirrors it and must not claim to enforce it.

## ADDED Requirements

### Requirement: Who may comment

Only a reviewer of the Report (its Head of Space or a Workspace Admin) MUST be able to start a thread. The
Report's author MUST be able to reply to one. Nobody else MUST be offered a comment control.

#### Scenario: An author replies

- **WHEN** the author opens a thread a reviewer started
- **THEN** they can reply and cannot start a new thread

#### Scenario: Somebody who may not comment

- **WHEN** a person who is neither the author nor a reviewer reads the Report
- **THEN** no comment control is rendered for them

### Requirement: Comments may carry attachments, metadata only

A comment MUST accept attachments under the same limits and types as a Report. An attachment MUST store name,
size and type only, MUST render as a row saying "Not uploaded in this build", and MUST NOT carry a link.

#### Scenario: Attaching to a comment

- **WHEN** a reviewer comments with a PDF
- **THEN** the comment lists it, the row says Not uploaded in this build, and there is no link

### Requirement: A comment carries a body and, optionally, a task

A comment MUST require a non-empty body. A reviewer MUST be able to attach a follow-up task to it, assigned
to the Report's author, with a due date. The task MUST appear both on the board and in the Report's side
panel, with a link to the comment that created it.

#### Scenario: An empty comment

- **WHEN** Comment is pressed with an empty body
- **THEN** nothing is posted and the field says a body is required

#### Scenario: A follow-up task

- **WHEN** a reviewer comments with a follow-up task attached
- **THEN** the comment shows the task and the task appears in the author's Assigned to me view

### Requirement: Discussion renders untrusted text safely

Comment bodies MUST be rendered as escaped text with line breaks, never as HTML. Links are always text: an
address a person types stays characters and is never turned into an anchor.

#### Scenario: A pasted angle bracket

- **WHEN** a comment body contains a script tag as text
- **THEN** the characters are shown and nothing executes

### Requirement: A read-only Workspace accepts no comments

In a read-only Workspace the composer MUST be absent with the reason, and a post attempted anyway MUST be refused
by the server.

#### Scenario: Read-only discussion

- **WHEN** a reviewer opens a Report in a read-only Workspace
- **THEN** no composer is rendered and the discussion is still readable

### Requirement: Tasks assigned to a deactivated person are flagged

When a task's assignee has been deactivated, the card MUST say so and MUST offer an Admin a reassignment.

#### Scenario: A deactivated assignee

- **WHEN** an Admin opens a task whose assignee was deactivated
- **THEN** the card names the problem and offers Reassign

### Requirement: Discussion states

The discussion MUST have a loading state, an error state that offers Retry, an empty state that invites a
reviewer to start the thread, and a disabled submit while a post is in flight.

#### Scenario: A failed post

- **WHEN** posting a comment fails
- **THEN** the text stays in the composer and a message offers Retry

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| List comments | `GET /api/v1/reports/:id/comments` | none | `Comment[]` | 401, 403, 404 |
| Post a comment | `POST /api/v1/reports/:id/comments` | `{ body, task? }` | `Comment` | 401, 403, 404, 400 |

Guards: `jwt.validateToken`, then the Membership from the token, then the same Report scope the page uses.
A non-reviewer posting a new thread is refused with 403 by the server.

## Frontend

- On `/dashboard/reports/:id`: a discussion section under the report text, open tasks in the side panel,
  a composer for reviewers and a reply box for the author.
- Types: `Comment`, `CommentAuthor`, `FollowUpTask` in `src/data/reports.ts`.
