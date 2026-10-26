# Dashboard UI rules

**Status: target design, not in the code.** The dashboard was removed from the app on 2026-10-26 (it
referenced components that no longer existed). Everything below describes the signed-in app we intend
to build, not what `reportlee-frontend` renders today. Today the app is the landing page, the auth
screens and onboarding.

Applies to the signed-in dashboard only. The landing page, sign-in, onboarding and pricing screens keep their existing designs.

## Shell
- Full-bleed. No outer margin, frame or backdrop.
- Sidebar about 240 to 260px, collapsible, flush to the left, top and bottom edges, divided from the page by a 1px hairline.
- Slim top bar: breadcrumbs on the left, the notification bell and the page's single primary action on the right. Nothing else.
- Content width: data pages cap at about 1,440px and centre. Reading pages use a 720 to 800px text column. The shell is always full-bleed.
- One dashboard for every role, with the same addresses. Sidebar items and data change by role. The server checks permissions on every request.

## Sidebar
- Top: Reportlee logo, then the Workspace switcher (current Workspace with member count, list of Workspaces with a tick on the current one, "Create workspace" at the bottom opening a modal for name and URL only).
- Then the search field (opens the ⌘K overlay), then navigation grouped by small muted section labels.
- Bottom: plan usage card (Admins only), then the user row.
- User menu: Profile, Notification preferences, Theme (Light, Dark, System), Sign out. The header block shows name, email, role and Space.

| | Staff | Head of Space | Workspace Admin |
|---|---|---|---|
| Work | Home, My reports, Tasks | Home, My reports, Tasks | Overview, Tasks |
| Review | none | Review | Review |
| People | none | My Space | Spaces, Members |
| Insight | My record | Space analytics | Analytics, Assistant |
| Manage | none | none | Settings |

"Submit report" is a button, not a nav item. Admins have no "My reports".

## Colour and theme
- Light and dark themes, both fully designed. Each person chooses Light, Dark or System (default), saved on their User. A Workspace never controls a person's theme.
- Components use named colour tokens, never raw hex values.
- Brand colour #FF6B2C. Use for the active-nav indicator, the focus ring, the Assistant, plan usage progress and the Upgrade button. Never for status, large areas, borders or body text. Use a darker shade for small orange text on light surfaces.
- Status colours are their own set (green approved or submitted, amber pending or late, red rejected, grey missing). Every pill pairs a tint with an icon, so colour is never the only signal.

## Buttons
- At most one primary button per screen. Black in light mode, white in dark mode.
- Primary hover: orange spreads from where the pointer entered and the label switches to dark text. Touch shows an orange flash on press. Keyboard focus shows the fill plus an orange ring. Reduced-motion settings get an instant colour change.
- Secondary, table and nav hovers are quiet (soft fill or darker border). Destructive buttons deepen to a darker red and never turn orange.
- A forbidden action stays visible but disabled, with the reason beside it.

## Type and tokens (starting values, to confirm in a design tool)
- Page title 24 to 28px semibold. Section title 16 to 18px semibold. Body 14px. Labels and meta 12 to 13px muted. Big numbers 28 to 32px medium.
- Spacing on a 4px base. Radius 6px (chips, inputs), 10px (buttons, nav), 12 to 16px (cards), full pill only for primary calls to action and status pills.
- 1px hairlines, almost no shadows. Nav items 36 to 40px, table rows 48 to 52px, buttons 36 to 40px.
- Every number uses tabular figures. A title may truncate. A status or a date never does.
- Typeface: the brand family from the landing page, if it has tabular figures and stays legible at 12 to 14px. If not, keep it for titles and big numbers only and use a neutral sans elsewhere.

## Pages
- **Home**: action first. "Needs your attention" for the role, then a few compact summary cards.
- **Reports list**: a table grouped by Reporting period with filter chips. Reviewers get a checkbox column and a bulk bar (Approve, Reject with one shared reason). Missing people appear in a "Not submitted" tab as hatched rows. Staff get a lighter version.
- **Report page**: reading column on the left, sticky side panel on the right (details, then timeline, then open tasks). The header's primary action depends on the viewer and the Report's state. Rejection requires a reason, shown in a banner on the Report and in the author's notification.
- **Submit report**: one scrolling page of cards with an automatic draft ("Saved just now"). One primary button, Submit report. AI drafting fills the form for the author to edit and never submits.
- **Members**: table with filter chips, one primary button (Invite members), Invited people in the same table. **Spaces**: cards showing Head, member count and this period's submission bar. The Space page has Reports, Members and KPI template tabs. A Head sees it as "My Space" with limited controls.
- **Tasks**: Kanban (To do, In progress, Done). Only the assignee moves cards, in any direction, and completing a task asks for an optional note and file. Views: Staff see Assigned to me. Heads see Assigned to me, Assigned by me and My Space. Admins see Assigned by me and Everyone. Only Assigned to me is draggable.
- **Analytics**: period selector and Space filter, four metric cards, submission trend, Spaces comparison, KPI cards, and a plain "late or missing" list. Staff see My record. Every number drills down. Partial periods are labelled "in progress", small samples are flagged, and each chart has a table view.
- **Settings** (Admin only, left sub-menu): General, Reporting, AI features, Plan and billing, Audit log, Data export. Each page has its own address. Save changes is disabled until something changes. The AI features switch applies immediately, with its notice.
- **Assistant**: a panel docked on the right with a context chip, expandable to a full page with the Admin's own history. Shows a collapsed "Checked N Reports across M Spaces" line and links every claim to its sources. Greyed out in the sidebar when the AI features switch is off.
- **Search**: ⌘K overlay with results grouped as Reports, Members and Spaces, scoped by role. Something the person can't open never appears.
- **Notifications**: the bell opens a popover with the latest items and a "View all" link to a full page with Read and Unread filters. Unread shows a count badge, never an orange dot.

## States
- Loading: skeletons that match the layout. A spinner appears only inside a waiting button.
- Empty: an icon in a tinted square, one plain sentence, one next step. The button appears only if the person can act.
- Error: inline and local, with Try again. A failed save keeps what was typed. Full-page errors are only for access problems and a lost connection.

## Phones
- Bottom tab bar by role. Staff: Home, Reports, Tasks, Search, Menu. Head: Home, Review, Reports, Search, Menu. Admin: Home, Review, Spaces, Assistant, Menu.
- Menu opens the sidebar as a drawer. Tables become cards. Approve and Reject stick to the bottom of the Report page. Tap targets are at least 44px and tab labels are always shown.
- The Kanban becomes swipeable tabs, and each card has a "Move to" menu that also works from the keyboard.
