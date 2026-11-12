# auth

## Purpose

How the frontend signs a person in against the backend, keeps the session and signs them out.

## ADDED Requirements

### Requirement: Auth calls use the backend contract

Each auth call MUST send the body the backend expects, including `loginType` on sign in, read the answer from
the `{ success, data }` envelope, and keep the result shape `{ ok: true } | { ok: false, message }`, extended
only with optional fields.

#### Scenario: Password sign in

- **WHEN** a person submits a valid email and password
- **THEN** the request carries `loginType: "password"`, the token pair is kept in memory and the person lands
  on the dashboard

#### Scenario: A field error from the API

- **WHEN** the API answers 400 with a field map
- **THEN** each message shows next to its field, and an error with only a message shows in the form

### Requirement: Tokens stay in memory

Access and refresh tokens MUST be held in memory only, never logged, never placed in a URL and never persisted.

#### Scenario: Reload

- **WHEN** the page is fully reloaded
- **THEN** the person is sent back to sign in

### Requirement: An expired access token is renewed once

On a 401 the client MUST refresh the pair once, share one in-flight refresh between parallel calls, and retry
the call once. A dead refresh MUST clear the pair.

#### Scenario: Expired access token

- **WHEN** a call returns 401 and the refresh succeeds
- **THEN** the call is retried once with the new access token

### Requirement: Sign out ends the server session

Sign out MUST send the current refresh token to the backend, using the token held after any refresh, and MUST
always clear the tokens locally, even if the request fails.

#### Scenario: Sign out after a refresh

- **WHEN** sign out triggers a refresh because the access token expired
- **THEN** the retried logout carries the rotated refresh token

### Requirement: Roles map from the backend

Backend `admin` MUST map to `admin` and backend `member` to `staff`. An unknown or empty list MUST map to
`staff`.

#### Scenario: Member

- **WHEN** the backend returns roles `["member"]`
- **THEN** the frontend role is `staff`

### Requirement: Sign in with a provider is hidden while live

The OAuth buttons MUST NOT render while the app talks to the backend, because it has no OAuth routes.

#### Scenario: Live mode

- **WHEN** `SIMULATED_AUTH` is false
- **THEN** the sign in and sign up screens show no provider buttons
