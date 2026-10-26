# workspace-setup

## Purpose

Finishing a Workspace's setup after the first-run flow: resuming where it stopped, and knowing when it is
done.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions.

## ADDED Requirements

### Requirement: Setup is finished when the rules are met

A Workspace MUST NOT be finished until it has at least one Space and at least one active Workspace Admin. Setup
MUST be resumable, MUST remember the step reached, and MUST show which steps are done.

#### Scenario: No Space yet

- **WHEN** a Workspace has Admins but no Space
- **THEN** setup reports unfinished and offers the Spaces step

#### Scenario: Resuming

- **WHEN** a person leaves setup mid-way and returns
- **THEN** the step they reached is where they land

### Requirement: A Workspace being set up says so

While setup is unfinished, a Workspace Admin MUST see a banner naming the missing steps. A person without a
Space MUST be told why the report form is closed, with the reason, instead of an empty form.

#### Scenario: A Member with no Space

- **WHEN** a Member has no Space and opens the report form
- **THEN** the screen names that the Workspace is still being set up and who can fix it

### Requirement: Setup does not leak into the app

A finished Workspace MUST NOT show setup banners or links anywhere. Setup routes MUST be reachable again by
an Admin, and MUST NOT be reachable by Staff.

#### Scenario: Finished Workspace

- **WHEN** an Admin opens the dashboard after finishing setup
- **THEN** no setup banner or setup step is shown

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Setup state | `GET /api/v1/workspace/setup` | none | `{ steps: SetupStep[], finished: boolean }` | 401, 403 |
| Advance a step | `PATCH /api/v1/workspace/setup` | `{ step, payload }` | `SetupState` | 401, 403, 400 |

Guards: `jwt.validateToken`, then a Workspace Admin role guard. Staff are refused with 403 by the server.

## Frontend

- Setup continues under `/onboarding` for an existing Workspace, with the steps Spaces and Invitations.
- The dashboard carries the unfinished-setup banner for an Admin only.
- Types: `SetupStep`, `SetupState` in `src/lib/setup.ts`.
