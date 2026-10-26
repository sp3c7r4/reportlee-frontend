## Purpose

Fix one name, one tone and one icon for every state a report can appear in, so the same report never
reads as "Submitted" on one screen and "Approved" on another, and so colour alone never carries the
meaning.

## ADDED Requirements

### Requirement: A report has exactly one review status

A report MUST be in exactly one of three review states: pending, approved or rejected. A screen MUST
NOT invent a fourth review state.

#### Scenario: A report waiting on a decision reads as pending

- **WHEN** a report has been submitted and no reviewer has decided on it
- **THEN** its review status is pending

#### Scenario: A decided report reads as one of two outcomes

- **WHEN** a reviewer approves or rejects a report
- **THEN** its review status is approved or rejected, and never pending

### Requirement: A person's report for one period has one state, and that state depends on the viewer

A report MUST be in exactly one of four states: draft, submitted, late or missing. Draft is an
author-only label: a report that has not been sent is draft to its author and missing to everyone else.
An unsent report MUST never be shown to anyone else as draft, late or submitted.

#### Scenario: The author sees their unsent report as draft

- **WHEN** an author has written a report and not sent it
- **THEN** the author sees draft

#### Scenario: A reviewer sees the same person as missing

- **WHEN** a period's deadline has passed and an author has only a draft
- **THEN** every reviewer sees that person as missing for that period, and never as draft

#### Scenario: Late applies only to a report that was sent

- **WHEN** an author sends a report after the period's deadline
- **THEN** its state is late, not submitted, and not draft

#### Scenario: A draft never reaches a reviewer under any name

- **WHEN** any reviewer views a period in which a person has only a draft
- **THEN** that person's state is missing, and the draft's content is not shown

### Requirement: Each state has one fixed label and one fixed icon

Every state MUST render the same label and the same icon wherever it appears, and no two states MUST
share an icon.

| State | Label | Icon |
|---|---|---|
| pending | Pending | `Clock01Icon` |
| approved | Approved | `CheckmarkCircle02Icon` |
| rejected | Rejected | `CancelCircleIcon` |
| draft | Draft | `FileEditIcon` |
| submitted | Submitted | `SentIcon` |
| late | Late | `Alert02Icon` |
| missing | Missing | `MinusSignCircleIcon` |

#### Scenario: The same state reads the same on two screens

- **WHEN** a pending report appears in a list and on its own page
- **THEN** both show the label Pending and the same icon

#### Scenario: Two states never share an icon

- **WHEN** two different states are shown side by side
- **THEN** their icons differ

### Requirement: Each state has one fixed tone, and colour is never the only signal

Every state MUST carry one tone, and every rendering MUST pair that tone with its icon and its label.
Green MUST mean approved or submitted, amber pending or late, red rejected, grey missing, and neutral
draft.

#### Scenario: A reader who cannot distinguish colours still reads the state

- **WHEN** a state is rendered without colour perception, or with styles partly blocked
- **THEN** the icon and the label still identify the state on their own

#### Scenario: Rejected is the only red state

- **WHEN** any state other than rejected is rendered
- **THEN** it is not shown in red
