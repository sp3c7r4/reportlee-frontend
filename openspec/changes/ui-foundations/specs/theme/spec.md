## Purpose

Say which appearance options the product offers, where the choice is stored, and which record wins when
two sources disagree, so every themed screen renders in the right theme on its first paint.

## ADDED Requirements

### Requirement: The theme is stored in a `reportlee-theme` cookie scoped to the product domains

While a person is signed out the product MUST store their theme in a cookie named `reportlee-theme`. The
cookie MUST be scoped so the same choice is sent to `reportlee.app` and to every Workspace subdomain
(`*.reportlee.app`). A missing or unrecognised value MUST resolve to light.

#### Scenario: No stored choice

- **WHEN** no theme cookie is present
- **THEN** every themed screen renders in light

#### Scenario: The choice follows the person across Workspace subdomains

- **WHEN** a person sets dark on one Workspace subdomain
- **THEN** every other `*.reportlee.app` host reads dark from the same cookie

#### Scenario: An unrecognised value falls back to light

- **WHEN** the cookie holds a value that is not a known appearance
- **THEN** the screen renders in light

### Requirement: Once signed in, the User record is the source of truth

When a session exists, the appearance stored on the User MUST decide the theme. The cookie then only
remembers the device, so the first paint is correct before the User record is read. A change saved by the
person MUST be written to the User and then to the cookie.

#### Scenario: The User record wins over a stale cookie

- **WHEN** a signed-in person's User record holds light and the cookie still holds dark
- **THEN** the product renders light and refreshes the cookie

#### Scenario: A change is saved to the User, not only to the browser

- **WHEN** a signed-in person changes their appearance
- **THEN** the User record is updated, and the cookie is updated so the next first paint is correct

#### Scenario: Signed out, the cookie is all there is

- **WHEN** no session exists and the cookie holds dark
- **THEN** the screen renders dark

### Requirement: Light, Dark and System are the offered appearances, System is deferred, and System becomes the default before the dashboard ships

The product MUST offer three appearances: Light, Dark and System. Until the dashboard ships, System MUST
NOT be offered, because no theme control exists and a System appearance cannot be resolved on the server
before first paint without duplicating the dark theme or running a script ahead of paint. System MUST be
offered before the dashboard ships, and once it is, System MUST be the default for a person who has never
chosen.

#### Scenario: The first theme control is two-way

- **WHEN** the shell's user menu offers a theme control while System is deferred
- **THEN** it offers Light and Dark only

#### Scenario: System is required before the dashboard ships

- **WHEN** the dashboard is released
- **THEN** a person can choose System, it follows the operating system preference with no flash of the
  wrong theme, and it is the default for someone who has never chosen

### Requirement: The theme is applied on the server, before first paint

A themed screen MUST resolve its theme on the server from the stored source, so that no screen shows the
light frame first and then corrects itself.

#### Scenario: A dark preference on the first response

- **WHEN** a person whose stored appearance is dark loads the sign-in screen
- **THEN** the first HTML response already carries the dark wrapper

### Requirement: The landing page is always light

The marketing landing page MUST render light, whatever the stored appearance, because it is a single
designed surface and not part of the signed-in frame.

#### Scenario: A dark preference on the landing page

- **WHEN** a person whose stored appearance is dark loads the landing page
- **THEN** the landing page renders light
