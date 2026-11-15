# signup-roles
## Purpose
Which role a new account receives, and who may grant or remove the admin role afterwards.
## ADDED Requirements
### Requirement: Signup never produces an admin
The system MUST NOT give the admin role to a person because of anything they send or choose while signing up.
#### Scenario: Normal signup
- **WHEN** a person signs up and verifies their email
- **THEN** the account has exactly one role, `member`
#### Scenario: Old client sends admin
- **WHEN** a client sends `role: "admin"` in the signup body
- **THEN** the request is accepted and the account still ends up as `member`
#### Scenario: Signup started before the change
- **WHEN** a signup stored before this change still carries the admin role and the person verifies their email
- **THEN** the account is saved as `member`
### Requirement: Verification lands as member
The verification response and the new session MUST report the member role.
#### Scenario: Verify after signup
- **WHEN** a new person verifies their email
- **THEN** the response lists `roles: ["member"]` and the session carries the same list
### Requirement: A person cannot choose admin
The role selection call MUST reject the admin role.
#### Scenario: Select admin
- **WHEN** a signed-in person asks to select `admin`
- **THEN** the request is rejected (400 for the body, 403 if it reaches the service) and no role row is created
### Requirement: Only an admin may change a role
Changing a role MUST be possible only through an admin-only endpoint.
#### Scenario: No token
- **WHEN** the call has no valid access token
- **THEN** the answer is 401
#### Scenario: Caller is not an admin
- **WHEN** a member calls the endpoint
- **THEN** the answer is 403 and nothing changes
#### Scenario: Target does not exist
- **WHEN** an admin names a user that is missing or deleted
- **THEN** the answer is 404
#### Scenario: Bad id or body
- **WHEN** an admin sends a non-numeric id, or a body without a valid `role`
- **THEN** the answer is 400 with a field error
#### Scenario: Grant admin
- **WHEN** an admin sets a member to `admin`
- **THEN** the answer is 200, the target has only the `admin` role, and the answer lists the previous roles
#### Scenario: Same role again
- **WHEN** an admin sets a role the target already has
- **THEN** the answer is 200 with `changed: false` and nothing is written
### Requirement: The last admin cannot be removed
The system MUST keep at least one active admin.
#### Scenario: Demote the only admin
- **WHEN** an admin tries to demote the only active admin, including themselves
- **THEN** the answer is 400 and the role is unchanged
#### Scenario: Another admin exists
- **WHEN** an admin demotes an admin while another active admin exists
- **THEN** the answer is 200
### Requirement: A role change reaches live sessions
The target's cached sessions MUST carry the new role without a new sign in.
#### Scenario: Promoted while signed in
- **WHEN** a member is promoted while holding an access token
- **THEN** their next profile read shows the new role on the same token
### Requirement: A new staff user lands on the dashboard
After verifying a new account, the app MUST send the person to the dashboard.
#### Scenario: Signup flow ends
- **WHEN** a new person finishes email verification
- **THEN** they are on `/dashboard` as staff
### Requirement: Onboarding is for admins
The onboarding screen MUST NOT show its form to a non-admin.
#### Scenario: Staff opens onboarding
- **WHEN** a staff user opens `/onboarding`
- **THEN** they are redirected to `/dashboard` and never see the form
