## Purpose

Defines how a Workspace comes to exist, how its web address (slug) is chosen, and which settings an Admin can edit. Any verified person can create a Workspace and becomes its Admin. Everyone else joins by invitation.

## ADDED Requirements

### Requirement: A verified person can create a Workspace and becomes its Admin
The system SHALL let any signed-in person with a verified email create a Workspace. The creator SHALL become its Admin, with no Space. The new Workspace SHALL be on the Starter plan with a limit of 10 members and no billing. The creation SHALL be one all-or-nothing step and SHALL set the creator's last Workspace.

#### Scenario: Happy path
- **WHEN** a verified person with no Membership creates a Workspace named "Acme Ops" with slug "acme-ops"
- **THEN** the Workspace exists, the person is its only active Admin, and the response contains the Workspace and the Membership

#### Scenario: Unverified email
- **WHEN** a person whose email is not verified creates a Workspace
- **THEN** the response is 403 and nothing is created

#### Scenario: Many Workspaces
- **WHEN** a person who already has a Membership creates another Workspace
- **THEN** it is created and they hold an Admin Membership in each

### Requirement: Slugs are valid, unreserved, unique and fixed
The system SHALL accept a slug only if it is 3 to 32 characters of lowercase a-z, 0-9 and hyphens, neither starting nor ending with a hyphen, not on the reserved list, and not used by any other Workspace (compared case-insensitively, including removed Workspaces). A slug SHALL NOT change after creation.

#### Scenario: Taken slug
- **WHEN** a person creates a Workspace with a slug that another Workspace already uses
- **THEN** the response is 409 and the message is shown beside the slug field

#### Scenario: Reserved or malformed slug
- **WHEN** a person submits "admin", "ab", "Has Space" or "-bad-"
- **THEN** the response is 400 with a field error on the slug

#### Scenario: Availability check
- **WHEN** a signed-in person asks whether "acme-ops" is available
- **THEN** the answer says available, or not available with the reason taken, reserved or invalid

#### Scenario: Slug is not editable
- **WHEN** an Admin sends a slug in a Workspace update
- **THEN** the request is refused with 400 and the slug is unchanged

### Requirement: Admins edit Workspace settings
The system SHALL let an Admin of the Workspace change its name, time zone and location tagging. Other members SHALL be able to read the Workspace but not change it.

#### Scenario: Admin edits
- **WHEN** an Admin changes the name to "Acme Operations"
- **THEN** the Workspace returns the new name

#### Scenario: Staff edit
- **WHEN** a Staff member tries to change a setting
- **THEN** the response is 403 and nothing changes

#### Scenario: Bad time zone
- **WHEN** an Admin sets a time zone that is not a real zone name
- **THEN** the response is 400 with a field error on the time zone

### Requirement: Creating and changing a Workspace is audited
The system SHALL record who created a Workspace and who changed its settings, in the same step as the change.

#### Scenario: Audit row on create
- **WHEN** a Workspace is created
- **THEN** one audit entry "workspace.created" exists for it with the creator's Membership
