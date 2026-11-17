## Purpose
Defines Reports as authors experience them: one report per person per period, saved automatically as a draft, submitted once, edited under a window, and deleted only while no reviewer has seen it. Review decisions and marking a report as seen belong to a later change.

## ADDED Requirements
### Requirement: Only Staff and Heads author reports
The system SHALL let only a Staff member or a Head of Space save a draft, submit or edit a report. A Workspace Admin SHALL be refused with the code ADMIN_CANNOT_AUTHOR. A read-only Workspace SHALL refuse saving, submitting and editing with the code WORKSPACE_READ_ONLY and SHALL still allow deleting.
#### Scenario: Admin tries to author
- **WHEN** an Admin saves a draft or submits
- **THEN** the response is 403 with the code ADMIN_CANNOT_AUTHOR and nothing is stored
#### Scenario: Read-only Workspace
- **WHEN** a Staff member saves a draft in a read-only Workspace
- **THEN** the response is 403 with the code WORKSPACE_READ_ONLY

### Requirement: One report per person per period, saved as a draft
The system SHALL keep at most one live report per person per period. Saving SHALL create the draft on the first save and update it afterwards. A draft SHALL survive its deadline and SHALL count as the person's one report for the period. A report that has been submitted SHALL NOT be saved as a draft again.
#### Scenario: First and later saves
- **WHEN** a Staff member saves twice for the same period
- **THEN** there is one draft and it holds the second save
#### Scenario: Parallel saves
- **WHEN** five saves for the same person and period arrive together
- **THEN** exactly one draft exists afterwards
#### Scenario: Save after submit
- **WHEN** a person saves a draft for a period they already submitted
- **THEN** the response is 409 with the code ALREADY_SUBMITTED
#### Scenario: Save after the period closed
- **WHEN** a person saves a draft more than 7 days after the deadline
- **THEN** the response is 409 with the code PERIOD_CLOSED
#### Scenario: Reading a draft
- **WHEN** a person asks for their draft of a period and none exists
- **THEN** the answer is an empty result, not an error
#### Scenario: Draft after submit
- **WHEN** a person asks for their draft of a period they already submitted
- **THEN** the answer is an empty result, and the submitted report is found in their list of reports for that period
#### Scenario: No Space
- **WHEN** a Staff member who belongs to no Space asks for or saves a draft
- **THEN** the response is 409 with the code NO_SPACE

### Requirement: KPI rows are copied when the draft starts
The system SHALL copy the Space's KPI template into a report when its draft is first created, with no value. Later changes to the template SHALL NOT alter the report. A blank value SHALL mean "not provided", never zero. A save SHALL change only the values of the rows the report already has.
#### Scenario: Template changes later
- **WHEN** a Head adds a KPI to the Space template after a member started a draft
- **THEN** that draft and any report made from it keep their original KPI rows
#### Scenario: Unknown KPI row
- **WHEN** a save names a KPI that is not on the report
- **THEN** that row is ignored and the rest of the save succeeds
#### Scenario: Zero is a value
- **WHEN** a save sets a KPI value to 0
- **THEN** the report holds 0, not "not provided"

### Requirement: The server decides on time or late
The system SHALL submit a draft by marking it submitted, or late when the moment of submission is after the period's deadline. A submission exactly at the deadline SHALL be on time. A new submission SHALL be pending review. A report SHALL need an accomplishments section of at least 50 characters of visible text to be submitted.
#### Scenario: On time
- **WHEN** a person submits before or at the deadline
- **THEN** the submission status is "submitted" and the review status is "pending"
#### Scenario: Late
- **WHEN** a person submits one second after the deadline and within 7 days
- **THEN** the submission status is "late"
#### Scenario: After the grace
- **WHEN** a person submits more than 7 days after the deadline
- **THEN** the response is 409 with the code PERIOD_CLOSED and the draft stays a draft
#### Scenario: Too short
- **WHEN** a person submits with fewer than 50 characters of accomplishments
- **THEN** the response is 400 with a message beside the accomplishments field
#### Scenario: Several problems at once
- **WHEN** a request breaks more than one rule
- **THEN** the first rule in this order answers: not found, not the author, Admin, read-only Workspace, already submitted, period closed, content too short
#### Scenario: Second submit
- **WHEN** a person submits a report that is already submitted
- **THEN** the response is 409 with the code ALREADY_SUBMITTED and nothing changes

### Requirement: Editing after submit follows the edit window
The system SHALL let the author edit a submitted report as follows. A report no reviewer has seen SHALL be editable. A rejected report SHALL be editable. After a reviewer first sees the report, edits SHALL be allowed until the Workspace's edit window (default 30 minutes) has passed since that first look. An approved report SHALL be locked. Each edit SHALL return the report to pending, keep the previous content as a revision, record an "edited" event, and clear the start of the edit window. An edit SHALL NOT change whether the report is late.
#### Scenario: Unseen report
- **WHEN** the author edits a submitted report no reviewer has seen
- **THEN** the edit is saved, the report is pending, and one revision and one "edited" event are added
#### Scenario: Inside the window
- **WHEN** the author edits 10 minutes after a reviewer first saw the report
- **THEN** the edit is saved
#### Scenario: Outside the window
- **WHEN** the author edits 31 minutes after a reviewer first saw the report
- **THEN** the response is 403 with the code EDIT_WINDOW_CLOSED
#### Scenario: Rejected report
- **WHEN** the author edits a rejected report whatever the time since it was seen
- **THEN** the edit is saved and the report is pending
#### Scenario: Approved report
- **WHEN** the author edits an approved report
- **THEN** the response is 403 with the code REPORT_APPROVED
#### Scenario: Edit a draft through the edit route
- **WHEN** the author edits a report that is still a draft
- **THEN** the response is 409 with the code NOT_SUBMITTED
#### Scenario: Revision content
- **WHEN** an edit is saved
- **THEN** the revision holds the content as it was just before the edit

### Requirement: Delete only while unseen
The system SHALL let only the author delete a report, and only while no reviewer has ever seen it. A draft SHALL always be deletable by its author. A deleted report SHALL disappear from every list, and the author SHALL be able to start a new draft for the same period.
#### Scenario: Unseen
- **WHEN** the author deletes a submitted report no reviewer has seen
- **THEN** the response is 204 and the report can no longer be found
#### Scenario: Seen
- **WHEN** the author deletes a report a reviewer has seen
- **THEN** the response is 403 with the code REPORT_SEEN and the report is kept
#### Scenario: Start again
- **WHEN** an author deletes their report and saves a draft for the same period
- **THEN** a new draft is created

### Requirement: My reports
The system SHALL list the caller's own submitted reports in a Workspace, newest submission first, and SHALL list the caller's own draft on request. It SHALL return report text as stored by the server.
#### Scenario: Own reports only
- **WHEN** a member lists reports in a Workspace
- **THEN** only reports they authored are returned, drafts excluded
#### Scenario: Pages
- **WHEN** a member asks for a page of 50 reports
- **THEN** at most 50 are returned and a larger limit is refused with 400

### Requirement: Slice boundaries are honest
The system SHALL NOT mark a report as seen, approve, reject or reopen it, or store an uploaded file in this change. Attachments SHALL be stored as name, size and type only and SHALL be reported as not uploaded.
#### Scenario: Attachment metadata
- **WHEN** a save includes an attachment
- **THEN** the response lists its name, size and type with uploaded set to false
