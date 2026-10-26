## Purpose

Give every signed-in screen one frame to live in: a single address for every role, navigation that matches
the viewer's role on desktop and on a phone, and the Workspace and account controls that frame carries.

## ADDED Requirements

### Requirement: One base path for every role

The signed-in app MUST live at `/dashboard` for every role. A role MUST NOT appear in a URL, so there MUST
be no `/admin` or `/super-admin` prefix, and every role MUST land on the same path after sign-in.

#### Scenario: Two roles land on the same address

- **WHEN** a Staff member and a Workspace Admin both sign in
- **THEN** both land on `/dashboard`, and the sidebar differs while the path does not

#### Scenario: No role in the URL

- **WHEN** any signed-in screen is open
- **THEN** its address contains no role segment

### Requirement: A signed-in frame without a session sends the person to sign-in

`/dashboard` MUST send a person to `/login` when no simulated session exists. This MUST be described in the
code as a convenience for a build with no backend, and MUST NOT be described as a guard.

#### Scenario: No session

- **WHEN** a person opens `/dashboard` with no simulated session
- **THEN** they are sent to `/login`

#### Scenario: A session opens the frame

- **WHEN** a person opens `/dashboard` with a simulated session
- **THEN** the frame renders

### Requirement: The sidebar lists exactly the items the viewer's role allows, under fixed group labels

The sidebar MUST contain exactly these items per role, in this order, under these group labels: Work,
Review, People, Insight, Manage.

| Role | Grouped items |
|---|---|
| Staff | Work: Home, My reports, Tasks. Insight: My record |
| Head of Space | Work: Home, My reports, Tasks. Review: Review. People: My Space. Insight: Space analytics |
| Workspace Admin | Work: Overview, Tasks. Review: Review. People: Spaces, Members. Insight: Analytics, Assistant. Manage: Settings |

"Submit report" MUST be an action in the frame, never a navigation item. A Workspace Admin MUST NOT have
"My reports". Tasks MUST appear for all three roles.

#### Scenario: An Admin has no My reports

- **WHEN** a Workspace Admin opens the sidebar
- **THEN** the items are Overview, Tasks, Review, Spaces, Members, Analytics, Assistant and Settings, and
  My reports is absent

#### Scenario: Every role can reach Tasks

- **WHEN** a person of any role opens the sidebar
- **THEN** Tasks is one of the items

#### Scenario: Groups carry their labels

- **WHEN** the sidebar renders for a role
- **THEN** each group shows its label, and the labels are drawn only from Work, Review, People, Insight and
  Manage

#### Scenario: Submitting is an action, not a destination

- **WHEN** the frame renders for Staff or a Head of Space
- **THEN** Submit report appears as a button, and not in the navigation list

### Requirement: The active item is shown by shape and weight, not colour alone

The current item MUST be marked with a soft fill, a thin orange indicator and `aria-current`. The orange
MUST be the indicator only, never the item's whole background.

#### Scenario: The current page is marked

- **WHEN** a person opens `/dashboard/reports`
- **THEN** My reports carries the fill, the orange indicator and `aria-current="page"`

### Requirement: The phone tab bar is its own list, not a smaller sidebar

The navigation module MUST return both lists for a role, and the phone list MUST be exactly these five
items, with Menu opening the sidebar as a drawer:

| Role | Phone tabs |
|---|---|
| Staff | Home, Reports, Tasks, Search, Menu |
| Head of Space | Home, Review, Reports, Search, Menu |
| Workspace Admin | Home, Review, Spaces, Assistant, Menu |

#### Scenario: The tab bar is not the sidebar

- **WHEN** the phone tabs are compared with the sidebar for the same role
- **THEN** they are different lists, and the tab bar has exactly five items

#### Scenario: An Admin reaches Spaces from a phone

- **WHEN** a Workspace Admin opens the app on a phone
- **THEN** the tabs are Home, Review, Spaces, Assistant and Menu

### Requirement: Breakpoints keep one navigation control at a time

Below the large breakpoint the sidebar MUST become a drawer. Below the medium breakpoint the bottom tab bar
MUST replace the drawer control. Both Menu controls MUST NOT be present at once.

#### Scenario: One Menu control at any width

- **WHEN** the frame renders at any width
- **THEN** exactly one Menu control exists

### Requirement: The frame is full bleed and keeps its regions

The sidebar MUST be about 240 to 260px wide, collapsible, and flush to the left, top and bottom edges,
divided from the page by a 1px hairline. The frame MUST touch the window edges at every width, with no
outer margin.

#### Scenario: No frame around the frame

- **WHEN** any signed-in page is open at any width
- **THEN** the shell reaches the window edges with no outer margin or backdrop

### Requirement: The sidebar carries search at the top and the person at the bottom

The sidebar MUST open with a search field that shows the keyboard shortcut hint and collapses to an icon
with the rail. The person's row MUST sit at the bottom of the sidebar and MUST open the user menu.

#### Scenario: Search and identity frame the navigation

- **WHEN** a person opens the sidebar
- **THEN** the search field is above the navigation, and their own row is below it

#### Scenario: The rail keeps search reachable

- **WHEN** the sidebar is collapsed
- **THEN** search is still reachable as an icon with its accessible label

### Requirement: The top bar action is supplied by the page

The top bar MUST leave its right-hand action slot to the page. Home MUST fill it with Submit report for
Staff and for a Head of Space, and a Workspace Admin MUST NEVER see Submit report anywhere in the frame.

#### Scenario: Home offers the action to the people who author

- **WHEN** Home renders for Staff or a Head of Space
- **THEN** the top bar carries Submit report

#### Scenario: An Admin is never offered Submit report

- **WHEN** any signed-in surface renders for a Workspace Admin
- **THEN** Submit report does not appear

### Requirement: The Workspace switcher chooses among the same person's Memberships, in memory only

All sample Memberships MUST belong to one User. `ACTIVE_MEMBERSHIP_ID` MUST choose only the initial
Membership. The switcher MAY choose among that User's other Memberships, in memory only: a reload MUST reset
it, and no query parameter, cookie or stored value MAY choose it. Switching MUST change the role, the Space
and the navigation.

#### Scenario: Switching changes the role without changing the address

- **WHEN** a person switches to a Membership with a different role
- **THEN** the sidebar, the Space and role-dependent controls change, and the path stays `/dashboard`

#### Scenario: A reload resets the choice

- **WHEN** a person switches Workspace and then reloads
- **THEN** the frame is back on the Membership named by `ACTIVE_MEMBERSHIP_ID`

#### Scenario: The tick follows the current Workspace

- **WHEN** the switcher opens
- **THEN** every Workspace where the person has an active Membership is listed, with a tick on the current
  one, shown with its member count

### Requirement: Create workspace is simulated and says so

The Create workspace modal MUST ask only for a name and a URL, validate the URL as it is typed, show the
plan notice (30 days of the trial, then Starter) and state that the URL is fixed once created. It MUST
store nothing, and it MUST say that it is a preview.

#### Scenario: The modal validates without saving

- **WHEN** a person submits a taken or reserved URL in Create workspace
- **THEN** the field shows the reason and nothing is created

#### Scenario: The modal states the plan and the fixed URL

- **WHEN** the modal is open
- **THEN** it shows the trial notice and the fixed URL notice, and nothing is written anywhere

### Requirement: The user menu carries the account and the theme

The menu MUST show the person's name, email, role and Space at the top, and MUST offer Profile,
Notification preferences, Theme and Sign out. While System is deferred, Theme MUST be a two-way control
offering Light and Dark. Changing it MUST update every signed-in surface without a flash, and MUST remember
the choice for the device.

#### Scenario: Theme changes without a flash

- **WHEN** a person chooses Dark from the user menu
- **THEN** every signed-in surface becomes dark at once, and the next visit to `/dashboard` starts dark

#### Scenario: The theme cookie is written for the shared parent domain

- **WHEN** the frame runs on a Workspace subdomain
- **THEN** the cookie is written for the parent domain, so the choice survives a Workspace switch, and on
  localhost it is written without a domain

#### Scenario: The menu says who is signed in

- **WHEN** the user menu opens
- **THEN** it shows the person's name, email, role and Space

#### Scenario: Signing out clears the session

- **WHEN** a person chooses Sign out
- **THEN** the simulated session is cleared through the existing session helper, and they land on `/login`

### Requirement: Everything the frame opens renders inside the shell root

Dialogs, menus, sheets and toasts MUST render inside the shell root, so the shell's theme class applies to
them. None of them may attach outside the shell.

#### Scenario: Menus and dialogs are dark in dark

- **WHEN** the theme is dark and the user menu, the Create workspace modal or the drawer is open
- **THEN** each of them renders dark

### Requirement: The frame is reachable without a pointer and readable by a screen reader

The frame MUST expose `nav` and `main` landmarks, MUST offer a skip link to the main content, MUST be fully
operable from the keyboard, and the drawer MUST trap focus, close on Escape and close when a navigation item
is chosen.

#### Scenario: Keyboard only

- **WHEN** a person uses only the keyboard
- **THEN** they can reach and operate the navigation, the switcher, the user menu and the drawer

#### Scenario: The drawer closes on navigation

- **WHEN** a person chooses an item in the drawer
- **THEN** the drawer closes and focus returns to the trigger

### Requirement: A switched-off AI feature greys the Assistant rather than hiding it

When the Workspace's AI features switch is off, the Assistant navigation item MUST render disabled with the
reason visible, and MUST NOT be removed.

#### Scenario: AI off

- **WHEN** the AI features switch is off and an Admin opens the sidebar
- **THEN** Assistant is present, disabled, and says why

### Requirement: Plan usage on the card follows the Workspace's plan

A Workspace MUST carry a plan, a member limit and whether AI features are on. The usage card MUST appear
for a Workspace Admin only, and MUST show a progress bar with "used / limit" for a Starter Workspace, and
the member count with no bar for a Team Workspace.

#### Scenario: Starter shows a bar against the limit

- **WHEN** an Admin's Workspace is on Starter with 7 members and a limit of 10
- **THEN** the card reads "7 / 10 members" and draws the bar

#### Scenario: Team shows the count alone

- **WHEN** an Admin's Workspace is on Team
- **THEN** the card shows the member count and draws no bar

#### Scenario: Usage is an Admin control

- **WHEN** a Head of Space opens the sidebar
- **THEN** there is no plan usage card

### Requirement: Two page wrappers set the measure

The frame MUST export a data page wrapper capping content at about 1,440px and centring it, and a reading
page wrapper using a 720 to 800px column.

#### Scenario: A page picks its measure

- **WHEN** a page renders inside the frame
- **THEN** it uses one of the two wrappers, and its content respects that measure

### Requirement: Sample data is never described as a guard

The frame MUST be built on sample data. Nothing in the code, comment or copy may claim that the frame
enforces access: hiding a navigation item is tidiness, not a permission check, and every rule is checked
server side when the backend exists.

#### Scenario: The viewer comes from one constant

- **WHEN** a developer wants to view the app as another role
- **THEN** they change `ACTIVE_MEMBERSHIP_ID` in one file, and no query parameter, cookie or stored value can
  change the role

#### Scenario: No claim of enforcement

- **WHEN** the shell's code and copy are read
- **THEN** none of it describes the navigation as access control
