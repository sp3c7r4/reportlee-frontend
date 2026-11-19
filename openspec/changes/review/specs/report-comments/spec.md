## Purpose
Defines the discussion on a report: who may post, what is stored, and how the text is made safe.

## ADDED Requirements

### Requirement: Thread rules
The system SHALL let a designated reviewer start a thread on a submitted report and the report's author reply to it. Nobody else SHALL post. The author SHALL NOT start a thread. Comments SHALL NOT be edited or deleted in this version. A read-only Workspace SHALL refuse comments.

#### Scenario: Reviewer starts
- **WHEN** a designated reviewer posts the first comment on a report
- **THEN** the response is 201 with the comment

#### Scenario: Author replies
- **WHEN** the author posts after a reviewer comment
- **THEN** the response is 201

#### Scenario: Author starts
- **WHEN** the author posts on a report that has no reviewer comment
- **THEN** the response is 403 with code `REVIEWER_MUST_START`

#### Scenario: Colleague posts
- **WHEN** a Staff colleague posts on someone else's report
- **THEN** the response is 404

#### Scenario: Read-only Workspace
- **WHEN** anyone posts in a read-only Workspace
- **THEN** the response is 403 with code `WORKSPACE_READ_ONLY`

### Requirement: Comment text is plain and sanitized
The system SHALL treat comment and reason text as untrusted. It SHALL strip every HTML tag on the server, trim, and store plain text of 1 to 2000 characters for a comment and 1 to 1000 for a reason. Text that is empty after sanitizing SHALL be refused with a field error on `body`.

#### Scenario: Script in a comment
- **WHEN** a reviewer posts `<script>alert(1)</script>Please add figures`
- **THEN** the stored body contains no tag and no script element

#### Scenario: Only tags
- **WHEN** a reviewer posts `<b></b>`
- **THEN** the response is 400 with a field error on `body`

#### Scenario: Too long
- **WHEN** a reviewer posts 2001 characters
- **THEN** the response is 400 with a field error on `body`

### Requirement: Comments in the report
The system SHALL return the report's comments, oldest first, in the report response. A comment SHALL carry its id, report id, author Membership id, body, time, kind and the id of the task created from it when there is one.

#### Scenario: Report with a decision reason
- **WHEN** a reviewer rejected the report with a reason
- **THEN** the reason is in `comments` with kind `decision`
