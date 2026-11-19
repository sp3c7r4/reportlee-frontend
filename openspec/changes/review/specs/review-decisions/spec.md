## Purpose
Defines who reviews a report, how a reviewer approves, rejects or reopens it, how an Admin overrides, and what the review queue shows. A person who may not see a report is told it does not exist.

## ADDED Requirements

### Requirement: Reviewers of a report
The system SHALL compute the reviewers of a submitted report at read time from the current state. The reviewer is the current Head of the report's Space. When the Space has no Head, or the author is a Head, the reviewers are the Workspace Admins. Nobody SHALL decide on their own report, Admins included. A draft SHALL have no reviewer and SHALL never appear in a queue. This requirement supersedes the scenario "Admin reads a Staff report in a Space with a Head" of the `reports` change: an Admin SHALL now read any submitted report in their Workspace.

#### Scenario: Head removed from a Space
- **WHEN** a Space loses its Head after a Staff report was submitted
- **THEN** the Workspace Admins become the designated reviewers of that report on the next read

#### Scenario: Admin reads a Staff report in a Space with a Head
- **WHEN** an Admin asks for a submitted Staff report in a Space that has a Head
- **THEN** they receive it

#### Scenario: Draft is hidden
- **WHEN** an Admin or Head asks for a draft by id
- **THEN** the response is 404

### Requirement: Decide on a report
The system SHALL accept the decisions approve, reject and reopen on a submitted report. The Head of the report's Space MAY decide reports in that Space that they did not write. An Admin MAY decide any submitted report in their Workspace that they did not write. Staff SHALL NOT decide and SHALL get 404, as for any report they may not read. A caller outside the report's Workspace, or a Head outside the report's Space, SHALL get 404. A read-only Workspace SHALL refuse every decision.

#### Scenario: Head approves in own Space
- **WHEN** a Head approves a Staff report in their own Space
- **THEN** the report is approved and an `approved` event is recorded

#### Scenario: Head decides on own report
- **WHEN** a Head tries to decide on their own report
- **THEN** the response is 403 with code `NOT_AUTHOR_CANNOT_DECIDE`

#### Scenario: Head in another Space
- **WHEN** a Head decides on a report in a different Space
- **THEN** the response is 404

#### Scenario: Admin overrides a Head
- **WHEN** a Head has rejected a report and an Admin approves it
- **THEN** the report is approved

#### Scenario: Admin on own report
- **WHEN** an Admin has a report of their own and tries to decide on it
- **THEN** the response is 403 with code `NOT_AUTHOR_CANNOT_DECIDE`

#### Scenario: Staff decides
- **WHEN** a Staff member tries to decide on a colleague's report
- **THEN** the response is 404

#### Scenario: Another Workspace
- **WHEN** a caller who is not an active member of the report's Workspace decides on it
- **THEN** the response is 404

#### Scenario: Read-only Workspace
- **WHEN** a reviewer decides in a read-only Workspace
- **THEN** the response is 403 with code `WORKSPACE_READ_ONLY`

### Requirement: Reasons for reject and reopen
The system SHALL require a reason of 1 to 1000 characters after trimming and sanitizing for reject and reopen. The reason SHALL be stored as a comment of kind `decision` on the report. Approve MAY carry a reason, stored the same way when given.

#### Scenario: Reject without a reason
- **WHEN** a reviewer rejects with no reason or only spaces
- **THEN** the response is 400 with a field error on `reason` and nothing changes

#### Scenario: Reject with a reason
- **WHEN** a reviewer rejects with a reason
- **THEN** the report is rejected and the reason appears in the report's comments with kind `decision`

#### Scenario: Reopen without a reason
- **WHEN** a reviewer reopens an approved report with no reason
- **THEN** the response is 400 with a field error on `reason`

### Requirement: Approved reports lock until reopened
The system SHALL accept only `reopen` on an approved report and SHALL accept `reopen` only on an approved report. Reopen SHALL return the report to pending, clear the edit window start and keep the first seen time. A rejected report SHALL stay editable by its author.

#### Scenario: Decide on an approved report
- **WHEN** a reviewer approves or rejects an approved report
- **THEN** the response is 409 with code `REPORT_APPROVED`

#### Scenario: Edit an approved report
- **WHEN** the author edits an approved report
- **THEN** the response is 403 with code `REPORT_APPROVED`

#### Scenario: Reopen
- **WHEN** a reviewer reopens an approved report with a reason
- **THEN** the report is pending, the author may edit it, and a `reopened` event is recorded

#### Scenario: Reopen a report that is not approved
- **WHEN** a reviewer reopens a pending report
- **THEN** the response is 409 with code `NOT_APPROVED`

### Requirement: Bulk approve
The system SHALL let an Admin approve up to 100 reports of one Workspace in one request. Each report SHALL be decided on its own, under the same rules as a single approve. A report the Admin may not approve SHALL be skipped and reported with its id and the reason code. A skipped report SHALL NOT stop the others. Head and Staff SHALL get 403.

#### Scenario: Mixed batch
- **WHEN** an Admin bulk approves three pending reports, one of which is the Admin's own and one already approved
- **THEN** one is approved and the response lists the other two as skipped with their codes

#### Scenario: Head bulk approves
- **WHEN** a Head calls bulk approve
- **THEN** the response is 403

### Requirement: Review queue
The system SHALL return, for a Workspace and a reporting period, the submitted reports the caller may review and the members who have not submitted. An Admin SHALL see the whole Workspace. A Head SHALL see their own Space. Neither SHALL see their own report. Staff SHALL get 403. The missing list SHALL exclude Admins and deactivated members, and a draft SHALL count as missing.

#### Scenario: Head queue
- **WHEN** a Head loads the queue
- **THEN** only submitted reports of their Space by other people are listed

#### Scenario: Missing list
- **WHEN** a Space has one member with a draft, one deactivated member and an Admin
- **THEN** only the member with the draft is listed as missing, marked as having a draft

#### Scenario: Staff loads the queue
- **WHEN** a Staff member loads the queue
- **THEN** the response is 403
