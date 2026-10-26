# search

## Purpose

Finding a Report, a person or a Space from anywhere in the app, without ever exposing something the person
could not open through the normal screens.

No backend exists. The calls below are the documented contract, answered today by `simulate*` functions.

## ADDED Requirements

### Requirement: Drafts are findable by their author, and by nobody else

An author MUST find their own draft in search, labelled Draft. Nobody else MUST find it, and a draft MUST NOT
appear as a Report result for any reviewer or admin.

#### Scenario: The author searches

- **WHEN** an author searches for a phrase in their own draft
- **THEN** the result appears with a Draft label

#### Scenario: A reviewer searches

- **WHEN** a reviewer searches for the same phrase
- **THEN** no result appears and no count of hidden matches is shown

### Requirement: People and Spaces are findable by everyone

Every Member of the Workspace MUST be findable by name, and every non-archived Space MUST be findable. An
archived Space MUST NOT appear.

#### Scenario: An archived Space

- **WHEN** a Space has been archived and somebody searches its name
- **THEN** no result appears

### Requirement: Recent searches belong to the person and the device

Recent searches MUST be stored per Membership and MUST be cleared at sign out with the rest of the stored state.

#### Scenario: A shared device

- **WHEN** a person signs out
- **THEN** their recent searches are gone

### Requirement: Scope follows the role

Staff MUST find only their own Reports and their own draft, plus every Member and every non-archived Space. A
Head of Space MUST find their Space's Reports. A Workspace Admin MUST find every Report in the Workspace. A
result the person could not open MUST NOT appear, and the overlay MUST NOT hint that it exists.

#### Scenario: Another Space's Report

- **WHEN** a Staff member searches for a phrase that only appears in another Space's Report
- **THEN** nothing from that Report appears and no count of hidden matches is shown

### Requirement: Results are grouped with snippets

Results MUST be grouped as Reports, Members and Spaces, in that order, with at most five per group and a
"see all" that opens `/dashboard/search` with the same query. Each Report result MUST show a snippet of the
matching text with the match marked, and the period it belongs to.

#### Scenario: A match inside a report

- **WHEN** the query matches inside a section
- **THEN** the result shows the surrounding text with the match marked

### Requirement: Member addresses are for Admins

A Member result MUST show the person's name to everyone and their email address to Workspace Admins only.

#### Scenario: A Staff search for a colleague

- **WHEN** a Staff member searches for a colleague
- **THEN** the name appears without an address

### Requirement: The overlay is keyboard first

The overlay MUST open from the sidebar search control and from the platform shortcut (Ctrl K on Windows and
Linux, Cmd K on macOS), MUST move between groups with the arrow keys, MUST open a result with Enter, and MUST
close with Escape. Focus MUST return to where it was.

#### Scenario: Keyboard only

- **WHEN** the overlay is opened, two results are traversed and Enter is pressed
- **THEN** that result opens and closing the overlay returns focus to the trigger

### Requirement: States

The overlay MUST have an idle state with recent items, a loading state, a no-results state naming the query,
and an error state with Retry.

#### Scenario: No results

- **WHEN** a query matches nothing
- **THEN** the overlay says so in words that repeat the query

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Search | `GET /api/v1/search?q=` | none | `{ reports: SearchHit[], members: SearchHit[], spaces: SearchHit[] }` | 401 |

Guards: `jwt.validateToken`, then the Membership from the token; the server applies the same scope the screens
apply, and never returns a row the reader cannot open.

## Frontend

- The overlay from the sidebar search control; `/dashboard/search` for the full list.
- Types: `SearchGroup`, `SearchHit`, `SearchResults` in `src/lib/search.ts`.
