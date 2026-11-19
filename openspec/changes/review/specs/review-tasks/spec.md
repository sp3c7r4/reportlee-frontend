## Purpose
Defines follow-up tasks that a reviewer assigns from a comment, how the assignee moves them, and what each role sees.

## ADDED Requirements

### Requirement: Create a task from a comment
The system SHALL let a designated reviewer attach a follow-up task to a comment they post. The task SHALL have a title of 1 to 200 characters, an assignee, a due date in the form YYYY-MM-DD and a priority of low, medium, high or critical. The assignee SHALL be an active Staff or Head Membership of the report's Workspace and SHALL NOT be the assigner. The comment and the task SHALL be saved together or not at all. A read-only Workspace SHALL refuse task creation. Only reviewers SHALL attach tasks.

#### Scenario: Reviewer assigns
- **WHEN** a reviewer posts a comment with a valid follow-up
- **THEN** the comment and a `todo` task exist, and the comment carries the task id

#### Scenario: Assignee outside the Workspace
- **WHEN** the follow-up names a Membership of another Workspace
- **THEN** the response is 400 with a field error on `followUp.assigneeMembershipId` and no comment is saved

#### Scenario: Bad due date
- **WHEN** the due date is `2026-13-40` or `18/11/2026`
- **THEN** the response is 400 with a field error on `followUp.dueAt`

#### Scenario: Author attaches a task
- **WHEN** the report's author posts a reply with a follow-up
- **THEN** the response is 403 with code `REVIEWER_MUST_START`

### Requirement: Only the assignee changes status
The system SHALL let only the assignee move a task between `todo`, `doing` and `done`, in any direction. A move to `done` MAY carry a completion note of up to 1000 characters and file metadata (name, size, type). A move to `done` SHALL set the completion time and a move away from `done` SHALL clear it. The assigner, a Head of the Space and an Admin SHALL NOT change status. A move SHALL be allowed in a read-only Workspace.

#### Scenario: Assignee completes
- **WHEN** the assignee moves a task to done with a note
- **THEN** the task is done, the note is stored and the completion time is set

#### Scenario: Assigner moves it
- **WHEN** the assigner tries to move the task
- **THEN** the response is 403 with code `NOT_ASSIGNEE`

#### Scenario: Task in another Workspace
- **WHEN** a caller who is not a member of the task's Workspace moves it
- **THEN** the response is 404

### Requirement: Task views per role
The system SHALL offer the views `mine` and `by` and `space` and `all` by role. Staff SHALL see `mine`. A Head SHALL see `mine`, `by` and `space`. An Admin SHALL see `by` and `all`. `mine` is tasks assigned to the caller, `by` is tasks the caller assigned, `space` is tasks assigned to members of the Head's Space, `all` is every task in the Workspace. A view outside the role SHALL be refused with 403. The `done` tasks SHALL be limited to those completed in the last 14 days.

#### Scenario: Staff asks for all
- **WHEN** a Staff member requests view `all`
- **THEN** the response is 403

#### Scenario: Old done task
- **WHEN** a task was completed 15 days ago
- **THEN** it is not in any list

#### Scenario: Empty board
- **WHEN** a user has no tasks
- **THEN** the board shows an empty state and no sample tasks
