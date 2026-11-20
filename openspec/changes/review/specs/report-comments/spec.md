## Purpose
Defines the discussion on a report: who may post, what is stored, and how the text is made safe.

## ADDED Requirements

### Requirement: Thread rules
The system SHALL let a designated reviewer start a thread on a submitted report and the report's author reply to it. The author MAY reply once any comment of either kind (a comment or a decision reason) by someone else exists. Nobody else SHALL post, and that includes an Admin who is not a designated reviewer. The author SHALL NOT start a thread. A reviewer's comment SHALL count as a look at the report. Comments SHALL NOT be edited or deleted in this version. A read-only Workspace SHALL refuse comments. The review state SHALL NOT limit comments: an approved report SHALL still accept comments, replies and follow-up tasks, because they do not change its content.

#### Scenario: Reviewer starts
- **WHEN** a designated reviewer posts the first comment on a report
- **THEN** the response is 201 with the comment

#### Scenario: Author replies
- **WHEN** the author posts after a reviewer comment
- **THEN** the response is 201

#### Scenario: Author replies to a rejection reason
- **WHEN** a reviewer rejected the report with a reason and the author posts a reply
- **THEN** the response is 201
#### Scenario: Admin who is not a designated reviewer
- **WHEN** an Admin posts on a report whose Space has a Head
- **THEN** the response is 403 with code `NOT_REVIEWER`
#### Scenario: Comment counts as a look
- **WHEN** a reviewer comments on a report that was never marked seen and the author then deletes it
- **THEN** the delete is refused with code `REPORT_SEEN`
#### Scenario: Author starts
- **WHEN** the author posts on a report that has no reviewer comment
- **THEN** the response is 403 with code `REVIEWER_MUST_START`

#### Scenario: Colleague posts
- **WHEN** a Staff colleague posts on someone else's report
- **THEN** the response is 404

#### Scenario: Comment on an approved report
- **WHEN** a designated reviewer comments with a follow-up task on an approved report
- **THEN** the response is 201 and the task is created

#### Scenario: Read-only Workspace
- **WHEN** anyone posts in a read-only Workspace
- **THEN** the response is 403 with code `WORKSPACE_READ_ONLY`

### Requirement: Comment text is plain and sanitized
The system SHALL treat comment and reason text as untrusted. It SHALL strip every HTML tag on the server, trim, and store plain text of 1 to 2000 characters for a comment and 1 to 1000 for a reason. Text that is empty after sanitizing SHALL be refused with a field error on `body`.

#### Scenario: Script in a comment
- **WHEN** a reviewer posts `<script>alert(1)</script>Please add figures`
- **THEN** the stored body contains no tag and no script element

#### Scenario: Ampersand and angle bracket
- **WHEN** a reviewer posts `Q&A <3`
- **THEN** the stored body is `Q&A <3`
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
