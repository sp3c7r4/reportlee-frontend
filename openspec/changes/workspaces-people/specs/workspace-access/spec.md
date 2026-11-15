## Purpose

Defines who a signed-in person is inside each Workspace, which Workspaces they can reach, and what a person who is not a member can learn. Roles live on a Membership, one per person per Workspace. The platform Super Admin role is separate and grants nothing inside a Workspace.

## ADDED Requirements

### Requirement: The caller's standing comes only from an active Membership
The system SHALL decide a caller's role and Space in a Workspace only from that caller's active Membership in that Workspace, read at the time of each request. A role or Space supplied in a request body, query or token SHALL be ignored.

#### Scenario: Deactivation takes effect at once
- **WHEN** an Admin deactivates a member and that member then calls any Workspace endpoint with a still-valid sign-in
- **THEN** the call is answered as "not found" and no Workspace data is returned

#### Scenario: Platform Super Admin has no Workspace access by role alone
- **WHEN** a person who holds the platform `admin` role but has no Membership in a Workspace calls a Workspace endpoint
- **THEN** the call is answered as "not found"

#### Scenario: Role from the request is ignored
- **WHEN** a Staff member sends a request that claims the role "admin" in its body or query
- **THEN** the request is judged as Staff

### Requirement: Non-members learn nothing about a Workspace
The system SHALL answer "not found", with the same message, when a caller asks for a Workspace that does not exist and when they ask for one they do not belong to. A member whose role is too low SHALL receive "forbidden".

#### Scenario: Foreign Workspace
- **WHEN** a signed-in person with no active Membership in Workspace 7 requests any resource under Workspace 7
- **THEN** the response is 404 with the same body as for a Workspace that does not exist

#### Scenario: Member with too low a role
- **WHEN** a Staff member calls an Admin-only action in their own Workspace
- **THEN** the response is 403

#### Scenario: Signed out
- **WHEN** a request carries no valid sign-in
- **THEN** the response is 401

### Requirement: A person sees their Memberships and Workspaces
The system SHALL return, for the signed-in person, their identity, every active Membership with its role and Space, the Workspace for each, and the Workspace they used last. Deactivated Memberships and deleted Workspaces SHALL NOT be listed.

#### Scenario: Two Workspaces, two roles
- **WHEN** a person is Admin in Workspace A and Staff in Space "Platform" of Workspace B and requests their Memberships
- **THEN** the response lists both Memberships with role "admin" and "staff" and the Space name for B only

#### Scenario: Person with no Workspace
- **WHEN** a signed-in person with no Membership requests their Memberships
- **THEN** the lists are empty and the last Workspace is null

### Requirement: The last Workspace follows the person
The system SHALL store the last Workspace per person and update it when the person switches Workspace, creates one or accepts an invitation. It SHALL only accept a Workspace where the person has an active Membership.

#### Scenario: Switch
- **WHEN** a member chooses another Workspace they belong to
- **THEN** the next request for their Memberships returns that Workspace as the last one, on any device

#### Scenario: Not a member
- **WHEN** a person sets the last Workspace to one they do not belong to
- **THEN** the response is 404 and the stored value is unchanged

#### Scenario: Stale value
- **WHEN** the stored last Workspace is no longer one of the person's active Memberships
- **THEN** the Memberships response returns null for the last Workspace
