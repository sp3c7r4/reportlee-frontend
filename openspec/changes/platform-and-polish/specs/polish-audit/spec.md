# polish-audit

## Purpose

The finish criteria every screen must hold before the backend starts. This capability exists so the last pass
is a checklist with evidence, not an opinion.

## ADDED Requirements

### Requirement: Every screen works from the keyboard

Every interactive element MUST be reachable in reading order, MUST show a visible focus ring, MUST be operable
with Enter, Space or the arrow keys as appropriate, and every dialog and overlay MUST trap focus and close on
Escape.

#### Scenario: A form without a pointer

- **WHEN** a screen is completed using only the keyboard
- **THEN** every control is reached and the action completes

### Requirement: Both themes and both widths

Every screen MUST be checked in light and dark at 1440 and at 390, with no horizontal scrolling, no clipped
text and no control under 44px on a touch target.

#### Scenario: A phone at 390

- **WHEN** a screen is opened at 390px in dark
- **THEN** nothing overflows and every target is reachable

### Requirement: Reduced motion is respected

Every animation MUST honour `prefers-reduced-motion`, and no state change MUST depend on an animation having
played.

#### Scenario: Reduced motion

- **WHEN** the OS asks for reduced motion
- **THEN** transitions are removed and every state is still reachable and visible

### Requirement: Contrast meets the bar

Body and placeholder text MUST reach 4.5 to 1 and large text 3 to 1, measured on the composited colours in both
themes. Status MUST never be carried by colour alone.

#### Scenario: Secondary text

- **WHEN** secondary text is measured on its own surface
- **THEN** it clears 4.5 to 1 in both themes

### Requirement: The four states exist on every data screen

Every screen that loads data MUST have loading, empty, error with Retry and success, and a failed request MUST
NOT leave a blank page.

#### Scenario: A failed request

- **WHEN** a screen's request fails
- **THEN** a message with Retry replaces the content and the frame stays usable

### Requirement: Orange never signals status or severity

Brand orange MUST NOT signal status, severity or a warning. It IS allowed as a location marker: the active
navigation indicator and the Workspace switcher's tick. Status uses the success, warning, destructive and notice
tones, each with a glyph.

#### Scenario: A status pill

- **WHEN** a status is rendered
- **THEN** its tone and glyph come from the status vocabulary, not from the brand colour

#### Scenario: The rail

- **WHEN** the active navigation item is marked
- **THEN** the orange indicator is allowed, because it marks where you are, not how something is going

### Requirement: Stored state is audited

Every device-storage key MUST be listed with its purpose, MUST be keyed by Membership where it belongs to a
person, and MUST be cleared at sign out. The audit MUST be a table in the plan file, and a test MUST fail if a new
key appears without a row.

#### Scenario: A new key

- **WHEN** code writes a `reportlee.*` key that the audit table does not list
- **THEN** the test fails

### Requirement: Screen reader, zoom and language

Every screen MUST pass a screen-reader pass with landmarks, names and live regions announced in reading order,
MUST be usable at 200 percent zoom without horizontal scrolling, and MUST NOT contain a retired word in copy: no
"Department" and no "week" as a fixed cadence, and no raw hex colour anywhere in the interface code.

#### Scenario: 200 percent zoom

- **WHEN** a screen is zoomed to 200 percent at 1440
- **THEN** nothing is cut off and no horizontal scroll appears

#### Scenario: A retired word

- **WHEN** copy is scanned
- **THEN** "Department" appears nowhere and cadence is described as configurable rather than weekly

## Frontend

- No new screen. This capability changes existing ones and produces the audit record: a table in the plan file
  listing every screen, both themes, both widths, keyboard, reduced motion, contrast and the four states, with
  what was seen.
