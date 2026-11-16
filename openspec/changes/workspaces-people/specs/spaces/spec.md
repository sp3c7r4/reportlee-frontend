## Purpose

Defines Spaces, the named groups inside a Workspace that people belong to and report under. Covers creating, renaming, archiving, restoring, appointing a Head and the suggested KPI template.

## ADDED Requirements

### Requirement: Admins create Spaces with unique names
The system SHALL let an Admin create a Space. A Space name SHALL be 1 to 80 characters after trimming and SHALL be unique within the Workspace regardless of letter case, archived Spaces included. Every member of the Workspace SHALL be able to list its Spaces.

#### Scenario: Create
- **WHEN** an Admin creates the Space "Platform"
- **THEN** it is listed, not archived, with no Head and an empty KPI template

#### Scenario: Name clash
- **WHEN** an Admin creates "platform" while "Platform" exists
- **THEN** the response is 409 and the message is shown beside the name

#### Scenario: Non-Admin creates
- **WHEN** a Head or Staff member creates a Space
- **THEN** the response is 403

### Requirement: A Space with members cannot be archived
The system SHALL refuse to archive a Space while any active member belongs to it, and SHALL let an Admin restore an archived Space. Archived Spaces SHALL NOT accept new members.

#### Scenario: Archive with members
- **WHEN** an Admin archives a Space that has one active member
- **THEN** the response is 409 and the Space stays active

#### Scenario: Archive and restore an empty Space
- **WHEN** an Admin archives an empty Space and later restores it
- **THEN** it is archived, then active again

#### Scenario: Join an archived Space
- **WHEN** an Admin moves a member into an archived Space, or an invitation targets one
- **THEN** the request is refused

### Requirement: A Space has at most one Head, appointed by an Admin
The system SHALL let an Admin appoint a Head from the active members of that Space, or clear the Head. A person SHALL head at most one Space. Appointing a new Head SHALL make the previous Head a Staff member of the same Space.

#### Scenario: Appoint
- **WHEN** an Admin appoints an active Staff member of the Space as Head
- **THEN** that member's role becomes "head" and the Space shows them as Head

#### Scenario: Replace
- **WHEN** an Admin appoints a second member while the Space has a Head
- **THEN** the second member is Head and the first is Staff in the same Space

#### Scenario: Outsider

- **WHEN** an Admin appoints a member who belongs to a different Space

- **THEN** the response is 400 with a field error

#### Scenario: Same Head

- **WHEN** an Admin appoints the member who is already Head

- **THEN** the response is 200 and nothing changes

### Requirement: Heads edit only their own Space's KPI template
The system SHALL let an Admin, or the Head of that Space, change its KPI template (up to 20 rows of name and unit). A Head SHALL NOT change any other field or any other Space.

#### Scenario: Head edits own template
- **WHEN** the Head of "Platform" saves a template with two rows
- **THEN** the Space returns those rows

#### Scenario: Head edits another Space
- **WHEN** the Head of "Platform" edits the template of "Sales"
- **THEN** the response is 403

#### Scenario: Head renames
- **WHEN** a Head sends a new name for their own Space
- **THEN** the response is 403 and the name is unchanged

### Requirement: Space changes are audited

The system SHALL record Space creation, renaming, restoring, archiving, KPI template changes and Head changes in the audit log in the same step, without names of people or email addresses. When a Head change flips a member's role, the system SHALL also record a role change for each member affected.

#### Scenario: Audit

- **WHEN** an Admin creates then archives a Space

- **THEN** entries "space.created" and "space.archived" exist

#### Scenario: Rename and template

- **WHEN** an Admin renames a Space, and later a Head saves its KPI template

- **THEN** two "space.updated" entries exist

#### Scenario: Head swap

- **WHEN** an Admin appoints a second member as Head

- **THEN** a "space.updated" entry and a "role.change" entry for each of the two members exist
