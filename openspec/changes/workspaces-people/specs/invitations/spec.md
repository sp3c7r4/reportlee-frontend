## Purpose

Defines how a person joins an existing Workspace: only by invitation. An invitation names one email, a role and a Space where one applies. It is delivered by email and by a link, reserves a seat, expires after 7 days, and works once for the verified owner of that email.

## ADDED Requirements

### Requirement: Who may invite whom
The system SHALL let an Admin invite any role. A Head SHALL be able to invite only Staff, only into their own Space. Staff SHALL NOT invite. An Admin invitation carries no Space. A Staff or Head invitation carries a Space that exists in the Workspace and is not archived.

#### Scenario: Admin invites Staff
- **WHEN** an Admin invites "new.person@example.com" as Staff into "Platform"
- **THEN** a pending invitation exists with 7 days to run

#### Scenario: Head invites an Admin
- **WHEN** a Head invites someone as Admin
- **THEN** the response is 403

#### Scenario: Head invites into another Space
- **WHEN** a Head invites Staff into a Space they do not head
- **THEN** the response is 403

#### Scenario: Staff invites
- **WHEN** a Staff member invites anyone
- **THEN** the response is 403

#### Scenario: Space rules on the body
- **WHEN** an Admin invites an Admin with a Space, or Staff without one
- **THEN** the response is 400 with a field error

### Requirement: A pending invitation reserves a seat
The system SHALL count active members plus pending, unexpired invitations against the Workspace's member limit and refuse an invitation that would exceed it. Revoking or expiry SHALL free the seat. Concurrent invitations SHALL NOT both take the last seat.

#### Scenario: At the limit
- **WHEN** a Starter Workspace has 9 active members and 1 pending invitation and an Admin invites one more
- **THEN** the response is 422 and no invitation is created

#### Scenario: Revoke frees a seat
- **WHEN** an Admin revokes a pending invitation at the limit and invites again
- **THEN** the second invitation is created

#### Scenario: Batch is all or nothing
- **WHEN** a batch of 3 invitations would exceed the limit by one
- **THEN** none is created

### Requirement: No duplicates and no existing members
The system SHALL refuse to invite an email that already has a Membership (active or deactivated) in the Workspace, or that already has a pending unexpired invitation there. An expired invitation SHALL NOT block a new one.

#### Scenario: Already a member
- **WHEN** an Admin invites the email of an active member
- **THEN** the response is 409

#### Scenario: Re-invite after expiry
- **WHEN** an invitation has expired and an Admin invites the same email
- **THEN** a new pending invitation is created

### Requirement: Delivery by email and a one-time link
The system SHALL send each invitation by email through the background queue and SHALL return a copyable link once, in the response to the person who created it. The link SHALL NOT appear in any list response or log. The system SHALL store only a hash of the token.

#### Scenario: Link returned once
- **WHEN** an Admin creates an invitation
- **THEN** the response includes the link, and listing invitations later does not

#### Scenario: Queue is down
- **WHEN** the email cannot be queued
- **THEN** the invitation is still created and the response still carries the link

### Requirement: Accepting needs the invited, verified email and works once
The system SHALL let a signed-in person with a verified email equal (ignoring case) to the invited email accept an invitation that is pending and not expired. Acceptance SHALL create one active Membership with the invited role and Space, set the person's last Workspace, and make the token unusable.

#### Scenario: Accept
- **WHEN** the invited person accepts a valid invitation
- **THEN** they are an active member with the invited role and Space

#### Scenario: Wrong email
- **WHEN** a person with a different verified email opens the link
- **THEN** the response is 403 and says which email address to use, with the local part hidden

#### Scenario: Expired, revoked or unknown
- **WHEN** the token is older than 7 days, revoked, already used by someone else, or unknown
- **THEN** the response is 404 with one message for all four cases

#### Scenario: Accepted twice
- **WHEN** the same person accepts again, or two accepts arrive at the same time
- **THEN** exactly one Membership exists and no second one is created

#### Scenario: Unverified email
- **WHEN** a person with an unverified email accepts
- **THEN** the response is 403

#### Scenario: Head invitation
- **WHEN** an Admin invited someone as Head and the Space already has a Head at acceptance
- **THEN** the response is 409 and the invitation stays pending

### Requirement: Revoking
The system SHALL let an Admin, or the member who sent an invitation, revoke it while it is pending.

#### Scenario: Revoke
- **WHEN** an Admin revokes a pending invitation
- **THEN** its link no longer works and it leaves the pending list

#### Scenario: Another Head's invitation
- **WHEN** a Head revokes an invitation sent by a different member
- **THEN** the response is 403

### Requirement: Listing invitations
The system SHALL let an Admin list every pending invitation of the Workspace, and a Head list those for their own Space. Staff SHALL NOT list them. Each row says whether it has expired.

#### Scenario: Head sees own Space only
- **WHEN** a Head lists invitations
- **THEN** only invitations into their Space appear

### Requirement: Invitation events are audited
The system SHALL record sending, revoking and accepting an invitation in the audit log, without the email address or token.

#### Scenario: Audit
- **WHEN** an invitation is sent and later accepted
- **THEN** "invitation.sent" and "member.joined" entries exist and neither contains an email or token
