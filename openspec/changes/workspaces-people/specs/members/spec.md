## Purpose

Defines the member roster of a Workspace and how Admins change a member's role, Space and active status. A Workspace always keeps at least one active Admin. Deactivated members lose access but keep their history.

## ADDED Requirements

### Requirement: Members see the roster, Admins see more
The system SHALL let every active member list the Workspace's members with name, role, Space and active status. Only Admins SHALL receive email addresses and deactivated members.

#### Scenario: Admin roster
- **WHEN** an Admin lists members
- **THEN** each row has an email and deactivated members are included

#### Scenario: Staff roster
- **WHEN** a Staff member lists members
- **THEN** rows carry no email and only active members appear

#### Scenario: Another Workspace
- **WHEN** a person lists members of a Workspace they do not belong to
- **THEN** the response is 404

### Requirement: Admins belong to no Space and everyone else to one
The system SHALL keep an Admin without a Space and every Staff member or Head in exactly one active Space. A request that breaks this SHALL be refused with a field error.

#### Scenario: Admin with a Space
- **WHEN** an Admin tries to give an Admin member a Space
- **THEN** the response is 400 with a field error on the Space

#### Scenario: Admin becomes Staff
- **WHEN** an Admin changes an Admin to Staff without choosing a Space
- **THEN** the response is 400 asking for a Space

### Requirement: Only Admins change roles, Spaces and active status
The system SHALL let only an Admin change another member's role, Space or active status. A Head SHALL NOT.

#### Scenario: Head changes a role
- **WHEN** a Head tries to promote a Staff member to Head
- **THEN** the response is 403

#### Scenario: Foreign member id
- **WHEN** an Admin changes a membership id that belongs to another Workspace
- **THEN** the response is 404

### Requirement: The last active Admin cannot be removed
The system SHALL refuse a role change or deactivation that would leave the Workspace with no active Admin, including when two such requests arrive at the same time.

#### Scenario: Demote the only Admin
- **WHEN** the only active Admin is changed to Staff
- **THEN** the response is 409 and they remain Admin

#### Scenario: Two Admins demote each other at once
- **WHEN** two Admins each demote the other in simultaneous requests
- **THEN** exactly one request succeeds, one Admin remains, and the other request gets 409

#### Scenario: Deactivate the only Admin
- **WHEN** the only active Admin is deactivated
- **THEN** the response is 409

### Requirement: Deactivation is reversible and respects the seat limit
The system SHALL keep a deactivated member's history, free their seat, clear any Head role they hold, and let an Admin reactivate them only if a seat is free.

#### Scenario: Deactivate a Head
- **WHEN** an Admin deactivates the Head of a Space
- **THEN** the Space has no Head and the member is inactive

#### Scenario: Reactivate with no seat
- **WHEN** an Admin reactivates a member while members plus pending invitations equal the limit
- **THEN** the response is 422 and they stay inactive

### Requirement: Heads are changed through their Space
The system SHALL refuse to make someone a Head of a Space that already has a different Head, and refuse to move a Head to another Space while they are Head.

#### Scenario: Second Head
- **WHEN** an Admin sets a member's role to Head in a Space that has a Head
- **THEN** the response is 409 saying to replace the Head from the Space

### Requirement: Member changes are audited
The system SHALL record role changes, deactivations and reactivations in the audit log in the same step.

#### Scenario: Audit
- **WHEN** an Admin changes a role
- **THEN** a "role.change" entry names the Admin and the target Membership, and holds no email
