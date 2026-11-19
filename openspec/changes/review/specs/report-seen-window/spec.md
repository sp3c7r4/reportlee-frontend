## Purpose
Defines how a reviewer's first look starts the author's edit window, and how an edit after a look follows the same rule.

## ADDED Requirements

### Requirement: Seen starts the window
The system SHALL let a designated reviewer of a submitted report mark it seen. The first call SHALL set the first seen time once and the window start when it is empty, and record one `seen` event. Later calls in the same window SHALL change nothing and answer 200 with the stored times. Only the designated reviewer SHALL start the window. The author, Staff, an Admin who is not a designated reviewer, a draft and other Workspaces SHALL NOT.

#### Scenario: First look
- **WHEN** the Head of the Space marks an unseen report as seen
- **THEN** the first seen time and the window start are set and one `seen` event exists

#### Scenario: Second look
- **WHEN** the same reviewer marks it seen again
- **THEN** the times and the events are unchanged

#### Scenario: Author calls seen
- **WHEN** the author calls seen on their own report
- **THEN** the response is 403 with code `NOT_REVIEWER` and nothing changes

#### Scenario: Admin browsing a headed Space
- **WHEN** an Admin who is not a designated reviewer calls seen
- **THEN** the response is 403 with code `NOT_REVIEWER` and the author's window is not started

#### Scenario: Other Workspace
- **WHEN** a caller from another Workspace calls seen
- **THEN** the response is 404

### Requirement: Delete stops after seen
The system SHALL refuse deleting a report once its first seen time is set, and SHALL keep refusing after an edit.

#### Scenario: Delete after seen
- **WHEN** the author deletes a report that a reviewer has seen
- **THEN** the response is 403 with code `REPORT_SEEN`

### Requirement: Edit window and edits after a look
The system SHALL allow the author to edit a seen, pending report for the Workspace's edit window (30 minutes by default) from the window start. An edit SHALL clear the window start. The next look by a designated reviewer SHALL start a new window and leave the first seen time unchanged. After that window closes, an edit SHALL be refused with code `EDIT_WINDOW_CLOSED`. A decision by a reviewer SHALL also count as a look. A rejected report SHALL stay editable after the window.

#### Scenario: Edit inside the window
- **WHEN** the author edits 10 minutes after the first look
- **THEN** the edit is saved and the window start is cleared

#### Scenario: Edit, then a new look, then a late edit
- **WHEN** the author edits, the reviewer looks again, and the author edits 31 minutes later
- **THEN** the response is 403 with code `EDIT_WINDOW_CLOSED`

#### Scenario: Look after an edit keeps the first seen time
- **WHEN** a reviewer looks again after the author edited
- **THEN** the window start is new and the first seen time is the original

#### Scenario: Rejected stays editable
- **WHEN** the author edits a rejected report after the window
- **THEN** the edit is saved

#### Scenario: Reopen clears the window
- **WHEN** an approved report is reopened
- **THEN** the window start is empty until the next look by a designated reviewer
