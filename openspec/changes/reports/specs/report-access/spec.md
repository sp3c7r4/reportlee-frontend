## Purpose
Defines who may read, edit and delete a report, from one rule that later review work reuses. A person who must not know a report exists is told it does not exist.

## ADDED Requirements
### Requirement: One rule decides access to a report
The system SHALL decide read, edit and delete access for every report in one place, from the caller's current active Membership in the report's Workspace. A report SHALL be readable by its author and, once submitted, by its reviewers. The reviewers of a report SHALL be the current Head of the report's Space when the author is not that Head, and Workspace Admins when the Space has no Head or the author is a Head. A draft SHALL be readable only by its author.
#### Scenario: Author reads
- **WHEN** an author asks for their submitted report
- **THEN** they receive it
#### Scenario: Head reads a report in their Space
- **WHEN** a Head asks for a Staff report in their own Space
- **THEN** they receive it
#### Scenario: Head reads another Space
- **WHEN** a Head asks for a report in a different Space
- **THEN** the response is 404
#### Scenario: Admin reads a Head's report
- **WHEN** an Admin asks for a Head's report
- **THEN** they receive it
#### Scenario: Admin reads a Staff report in a Space with a Head
- **WHEN** an Admin asks for a Staff report in a Space that has a Head
- **THEN** the response is 404
#### Scenario: Admin reads a Staff report in a Space without a Head
- **WHEN** an Admin asks for a Staff report in a Space that has no Head
- **THEN** they receive it
#### Scenario: Someone else's draft
- **WHEN** anyone other than the author asks for a draft by its id or lists drafts
- **THEN** the response is 404 and the draft is not in any list

### Requirement: A report outside your reach does not exist
The system SHALL answer 404, with the same body, when a report does not exist, was deleted, belongs to another Workspace, or belongs to a Workspace where the caller has no active Membership. A deactivated member SHALL be treated as a non-member.
#### Scenario: Another Workspace
- **WHEN** a member of Workspace A asks for a report in Workspace B
- **THEN** the response is 404, the same as for an id that never existed
#### Scenario: Deactivated member
- **WHEN** a deactivated member asks for their own old report
- **THEN** the response is 404

### Requirement: Reviewers cannot write an author's report
The system SHALL let only the author edit or delete a report. A reviewer who can read it SHALL be refused with 403 and the code NOT_AUTHOR. A caller who cannot read it SHALL receive 404.
#### Scenario: Head edits a member's report
- **WHEN** a Head edits or deletes a Staff report in their Space
- **THEN** the response is 403 with the code NOT_AUTHOR
#### Scenario: Stranger edits
- **WHEN** a member with no access edits a report
- **THEN** the response is 404
