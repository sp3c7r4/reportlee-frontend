## Purpose
Defines which in-app notifications review activity creates, how they are scoped and read, and the email an author gets for a decision.

## ADDED Requirements

### Requirement: Notifications for review activity
The system SHALL create an in-app notification, after the change is saved, for each of these. A decision goes to the report's author. A reviewer's comment goes to the author. The author's reply goes to the report's designated reviewers. A submission goes to the report's designated reviewers. A task goes to its assignee. A tag notifies nobody. An edit after a rejection notifies nobody. A notification SHALL NOT contain the decision reason. A notification SHALL carry the Workspace id and a link to the report or the tasks page. A failure to write a notification SHALL NOT fail the request that caused it.

#### Scenario: Decision
- **WHEN** a reviewer rejects a report
- **THEN** the author has an unread notification of type `decision` linking to the report

#### Scenario: Reviewer comment
- **WHEN** a reviewer comments
- **THEN** the author has a notification and the reviewer has none

#### Scenario: Submission
- **WHEN** Staff submit a report in a Space with a Head
- **THEN** the Head has a notification and Admins do not

#### Scenario: Task
- **WHEN** a reviewer assigns a task
- **THEN** the assignee has a notification of type `task`

#### Scenario: Tag
- **WHEN** a report tags a colleague
- **THEN** no notification is created for the colleague

### Requirement: Inbox per Workspace
The system SHALL list, count and mark read only the caller's own notifications, filtered by Workspace when one is given. Notifications written before this change, which have no Workspace, SHALL stay visible without a Workspace filter. Marking all read SHALL touch only the caller's rows, within the Workspace when given. Marking another user's notification SHALL change nothing.

#### Scenario: Two Workspaces
- **WHEN** a user belongs to Workspaces A and B and asks for the inbox of B
- **THEN** notifications of A are not listed and not counted

#### Scenario: Unread count
- **WHEN** a user has three unread and one read notification
- **THEN** the unread count is 3, and after mark all read it is 0

#### Scenario: Another user's notification
- **WHEN** a user marks another user's notification as read
- **THEN** the other user's notification stays unread

#### Scenario: Malformed read-all body
- **WHEN** mark all read is called with a malformed JSON body
- **THEN** the response is 400 and nothing is marked
#### Scenario: Unsafe link
- **WHEN** a stored link does not start with `/dashboard/`
- **THEN** the screen links to `/dashboard`
#### Scenario: Empty inbox
- **WHEN** a user has no notifications
- **THEN** the screen shows an empty state and no sample items

### Requirement: Decision email
The system SHALL queue one email to the author for an approve or reject decision, after the decision is saved, when `DECISION_EMAILS_ENABLED` is true (default true). It SHALL NOT email for reopen, comments, tasks or submissions. The email SHALL escape the reason and SHALL use a stable key per decision so a retry sends once. A failure to queue SHALL NOT fail the decision. The system SHALL NOT write the address to any log.

#### Scenario: Approve
- **WHEN** a reviewer approves a report
- **THEN** one email job is queued for the author

#### Scenario: Switch off
- **WHEN** `DECISION_EMAILS_ENABLED` is false and a reviewer rejects a report
- **THEN** no email job is queued and the in-app notification still exists

#### Scenario: Reopen
- **WHEN** a reviewer reopens a report
- **THEN** no email job is queued

#### Scenario: Queue down
- **WHEN** the queue refuses the job
- **THEN** the decision still succeeds and an error line without an address is logged
