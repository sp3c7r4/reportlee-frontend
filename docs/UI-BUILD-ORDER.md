# Interface build order

**Status: a plan, not the code.** No step here is finished against a backend, because there is no
backend repo yet. What exists today: the design foundations (UI-1, tokens and both themes), most of
the component kit (UI-2), and the onboarding screens (UI-4) running on local state with nothing
saved. UI-3 and UI-5 to UI-16 describe a signed-in app that was removed from the code on 2026-10-26.
Read `docs/ROADMAP.md` for the live status.

Each step is independently testable. The "needs" line says which backend step from `docs/BUILD-ORDER.md` must be done first. Screens can be built against sample data before then.

## UI-1. Design foundations
Colour tokens for both themes, the type scale, spacing, radius, hairlines, and the theme switch (Light, Dark, System, saved on the User, no flash on load).
Needs: backend 2.
- Every colour comes from a token. No raw hex values in components.
- Contrast passes for text and controls in both themes. Dark text sits on orange fills.
- The brand font passes the tabular-figures and 12 to 14px checks, or the fallback is applied.
- Switching theme changes every surface with no unstyled flash.

## UI-2. Component kit
Buttons (primary with the orange spread and its touch, keyboard and reduced-motion versions, secondary, destructive), status pills, inputs, filter chips, segmented toggle, avatars and stacks, cards with icon tiles, table, dialog, popover, toast, skeleton, empty state, error state, the guarded-action pattern.
Needs: UI-1.
- Only one primary button appears per screen, enforced in review.
- Every component renders correctly in both themes.
- Destructive buttons never turn orange. Status never uses orange.
- A disabled action shows its reason.

## UI-3. Shell
Full-bleed sidebar (collapsible), slim top bar with breadcrumbs, role-based navigation, Workspace switcher and the Create workspace modal, user menu, bell popover shell, search field shell, phone tab bar and drawer.
Needs: backend 2 and 3.
- The sidebar and top bar touch the window edges at every width.
- Navigation items match the role table. Admins have no "My reports".
- Switching Workspace changes the role, Space and sidebar to that Membership's.
- Collapsed sidebar shows the logo tile and a search icon only.
- On a phone the tab bar replaces the sidebar, with the drawer behind Menu.

## UI-4. Workspace setup and invitations
Wire the existing onboarding screens: Workspace, Spaces (at least one required, no skip), invite your team (role, Space for Staff and Heads, Admin allowed). Invitation acceptance screen. The "setting up" state.
Needs: backend 3.
- A Workspace without a Space can't finish setup or accept Reports.
- Invite offers a Space dropdown for Staff and Heads, and none for Admin.
- Closing midway resumes at the same step.
- The Create workspace modal asks only for name and URL, validates the URL as you type, and shows the plan notice.

## UI-5. Members and Spaces
Members table, Invite members, row menus, Spaces cards, Space page with tabs, My Space for Heads.
Needs: backend 3.
- Invited people appear in the Members table with an "Invited" pill.
- Deactivating the last active Admin and archiving a Space with members are disabled with a reason.
- Appointing a Head names both people in the confirmation. Moving a person says their old Reports stay behind.
- At the plan limit, Invite shows the limit and an Upgrade link.
- A Head sees only their own Space and only the controls their role allows.

## UI-6. Submit report
One-page form with automatic draft, KPI template prefill, attachments, tags, optional location, and the checks before submitting.
Needs: backend 4 and 5.
- A draft saves as the person types and opens on another device.
- A draft is invisible to everyone else and never searchable.
- A second Report for the same period is not possible.
- Submitting after the deadline marks the Report late. A draft survives the deadline.
- Blank KPI rows are stored as "not provided", never as zero.

## UI-7. My reports and the Report page
Reports table for the author, the two-column Report page, edit and delete states, edit-window countdown, edit history and the "edited" flag.
Needs: backend 5.
- The header's primary action matches the viewer and state table.
- Delete shows only while no reviewer has seen the Report.
- A rejected Report can always be edited, and editing returns it to pending.
- An approved Report shows no edit control.
- The timeline lists submitted, edited, seen and decisions in order.

## UI-8. Review
Review queue table with filter chips, "Not submitted" tab with hatched rows, bulk bar, Approve, Reject dialog with required reason, Reopen.
Needs: backend 6.
- Reject stays disabled until a reason is written. The reason appears in the banner and the author's notification.
- A Head's own Reports never appear in that Head's queue. They go to Admins.
- A Space with no Head has its Reports in the Admin queue.
- Bulk Reject posts one reason on each Report, and each decision is logged separately.

## UI-9. Comments and Tasks
Discussion on the Report page, follow-up task creation by reviewers, the Task board with its role-based views, completion prompt, phone version.
Needs: backend 6.
- Only reviewers can comment or assign. Authors can reply.
- Only the assignee can move a card, and only in "Assigned to me".
- Completing a task offers an optional note and file. Moving a card out of Done clears its completed date.
- Admins see only "Assigned by me" and "Everyone". Heads see their three views.
- On a phone, cards move through a "Move to" menu that works from the keyboard.

## UI-10. Home
Role-specific "Needs your attention" list and summary cards.
Needs: backend 4 to 6.
- Staff see the current period, deadline, own status and open tasks.
- Heads see Reports waiting and who is late or missing.
- Admins see Spaces that are behind, Reports waiting on Admins, and plan usage.

## UI-11. Notifications
Bell popover, full notifications page with Read and Unread filters, preferences page.
Needs: backend 7.
- Each event reaches only the person it concerns.
- Unread shows a count badge, never an orange dot.
- Invitation and security emails can't be switched off. Everything else can.

## UI-12. Search
The ⌘K overlay, grouped results, snippets, role scoping, keyboard navigation.
Needs: backend 8.
- Staff find only their own Reports, Heads their Space's, Admins all.
- A Report the person can't open never appears, with no hint that it exists.
- Member email addresses show to Admins only. Drafts never appear.

## UI-13. Analytics
Period selector, Space filter, metric cards, trend, Spaces comparison, KPI cards, late or missing list, My record for Staff.
Needs: backend 9.
- Every figure states how many Reports it covers and drills down to the people or Reports.
- The current period is labelled "in progress". Small samples are flagged.
- There is no individual leaderboard. Each chart has a table view.

## UI-14. Settings
General, Reporting (Schedule, edit window, location), AI features, Plan and billing, Audit log, Data export, and the usage card.
Needs: backend 10 and 11.
- The whole area is invisible to Heads and Staff.
- Save changes is disabled until something changes. Schedule changes show "Takes effect from <date>".
- The AI features switch applies immediately and shows its notice.
- A read-only Workspace shows a banner for everyone and the actions Admins can still take.

## UI-15. Assistant
Docked panel with context chip, full-page view with history, source line and links, off state.
Needs: backend 12.
- The Assistant appears only for Admins and is greyed out when the AI features switch is off.
- The context chip never widens what the Admin can see.
- Every figure links to its sources and states how many Reports it covers.
- Conversations are private to the Admin who started them.

## UI-16. Super Admin console
Workspace list, Workspace detail, plan management, URL rename, audit log. Not designed yet. See "Not yet designed" below.
Needs: backend 13.

## UI-17. Polish and audit
Every page checked in both themes and on a phone, keyboard-only pass, reduced-motion pass, contrast pass, empty, loading and error state pass.
- Every screen works with the keyboard only.
- No page blanks on a failed request.
- Nothing orange signals status.

## Not yet designed
These came up in the work but no decision has been made on them:
- The Super Admin console (UI-16).
- The Profile page and the notification preferences layout.
- The checkout and invoices screens (they depend on the billing provider you choose).
- The read-only Workspace banner and the trial-ending banners.
