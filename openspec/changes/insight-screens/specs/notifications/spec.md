# notifications

## Purpose

The bell, the inbox and the preferences: one event, one person.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions.

## ADDED Requirements

### Requirement: An event reaches only the person it concerns

A notification MUST belong to exactly one Membership. Opening somebody else's notification MUST NOT be
possible from any screen, and a notification MUST NOT disclose a person or a Report the reader could not
open anyway.

#### Scenario: A decision

- **WHEN** a Report is decided
- **THEN** the author has a notification and the reviewer does not

### Requirement: The bell shows a count, never a dot

The top bar bell MUST open a popover listing the newest unread notifications, MUST show a numeric unread
count while any exist, and MUST NOT signal unread with a coloured dot alone. The badge MUST use a neutral tone
from the palette and never the destructive red, because unread is not an error.

#### Scenario: Two unread

- **WHEN** there are two unread notifications
- **THEN** the bell shows 2 and the popover lists them

#### Scenario: All read

- **WHEN** every notification is read
- **THEN** the bell shows no count and the popover says there is nothing new

#### Scenario: The tone

- **WHEN** the badge is measured
- **THEN** its colour comes from the neutral palette, never from the destructive tone

### Requirement: The categories, and what sends nothing

Categories MUST be reviews waiting, decisions, comments and tasks, plus invitation and security, which are
fixed. Tagging a colleague MUST send nothing to that person.

#### Scenario: A tag

- **WHEN** a colleague is tagged on a Report
- **THEN** no notification exists for them and their unread count is unchanged

### Requirement: Who is told about a new Report

The "a Report needs review" notification MUST reach exactly the people the review queue's scope function names,
reusing that function rather than a second copy of the rule.

#### Scenario: A Space with no Head

- **WHEN** Staff in a Space with no Head submit
- **THEN** the notification goes to the Workspace Admins

### Requirement: The list filters by read state

`/dashboard/notifications` MUST list notifications newest first with Read and Unread filters and counts, MUST
allow marking one or all as read, and MUST open the thing the notification is about.

#### Scenario: Mark all read

- **WHEN** Mark all read is pressed
- **THEN** the unread count reaches zero and the filter shows an empty state

### Requirement: Two kinds cannot be switched off

Preferences MUST live at `/dashboard/account/notifications`, beside the profile at `/dashboard/account/profile`,
rather than inside the Workspace's settings. Preferences MUST let a person turn email copies on or off per
category. Invitation and security
notifications MUST NOT be switchable, and the screen MUST say why.

#### Scenario: Security email

- **WHEN** the preferences page is read
- **THEN** the security row has no control and carries a sentence explaining it cannot be turned off

### Requirement: States

The popover, the list and the preferences MUST each have loading, error with Retry and empty states.

#### Scenario: A failed load

- **WHEN** the list fails to load
- **THEN** a message offers Retry

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| List | `GET /api/v1/notifications?state=` | none | `{ items: Notification[], unread: number }` | 401 |
| Mark read | `POST /api/v1/notifications/read` | `{ ids?: string[], all?: boolean }` | `{ unread: number }` | 401, 404 |
| Preferences | `GET`/`PATCH /api/v1/notification-preferences` | `{ emailByCategory }` | `Preferences` | 401, 400 |

Guards: `jwt.validateToken`, then the Membership from the token; every query is scoped to that Membership.

## Frontend

- Top bar bell with popover; `/dashboard/notifications`; `/dashboard/settings/notifications` for preferences.
- Types: `Notification`, `NotificationCategory`, `NotificationPreferences` in `src/lib/notifications.ts`.
