# Build order

**Status: a plan, not the code.** `reportlee-backend/` does not exist yet, so none of the 14 steps
below is built. This file is the order they get built in once that repo is created.

Each step is independently testable. Do not start a step before the previous one's checks pass.

## 1. Tenancy foundation
Postgres schema with workspace_id on tenant tables, Row-Level Security policies, a data-access layer that sets the current Workspace per request, and the narrow cross-Workspace exception for listing a person's Workspaces.
- A request for Workspace A never returns Workspace B rows, even with the application filter removed.
- Every tenant table has a leak test.
- Connection pooling never carries a Workspace setting between requests.

## 2. Identity and sign-in
User, password, emailed code, Google sign-in, sessions, Workspace URL resolution, "Select your workspace" and last-workspace landing.
- Codes are hashed, single-use and expire after 10 minutes.
- Repeated failures lock sign-in briefly.
- Google links only through a verified email.
- Reset password ends other sessions.

## 3. Workspace setup, Spaces, Memberships, Invitations
Create a Workspace (URL rules, reserved names), setup requires at least one Space, roles, last-active-Admin protection, Invitations by role with Space, deactivation and reactivation, moving people, archiving Spaces.
- The last active Admin cannot be demoted or deactivated.
- A Head of Space can invite only Staff into their own Space.
- An Invitation is accepted only by the matching verified email.
- A Space cannot be archived while it has members.

## 4. Schedule and Reporting periods
Schedule (daily, weekly, fortnightly, monthly, quarterly), timezone, period generator, Submission status.
- The generator is safe to run twice.
- A schedule change applies from the next period and rewrites nothing.
- Status shows submitted, late and missing correctly across a deadline.

## 5. Reports and attachments
Create one Report per person per period, KPI templates (suggestions only), edit rules, Seen, delete rules, edit history, tags, Attachments, optional location.
- A second Report in the same period is refused.
- Unseen and rejected Reports are editable. Seen Reports lock after the edit window. Approved Reports are locked.
- Delete works only while unseen.
- A removed file is actually deleted. Attachment links expire and respect Report access.

## 6. Review, comments and tasks
Approve and reject, Head versus Admin routing, reopen, bulk actions, comments, Follow-up tasks.
- A Head's own Report goes to Admins, and a Space with no Head goes to Admins.
- Only reviewers comment or assign. Only the assignee changes task status.
- Comment and task access follows Report access.
- Bulk decisions are logged individually.

## 7. Notifications and email
In-app notifications, per-person email preferences, always-on invitation and security emails.
- Each event reaches only the person it concerns.
- Tags send nothing.

## 8. Global search
Postgres full-text search over Reports, Members and Spaces, scoped by role.
- Staff find only their own Reports, Heads their Space's, Admins all.
- Everyone finds Members and Spaces. Emails show to Admins only.

## 9. Analytics
Period-based, role-scoped views with every figure showing how many Reports it covers.
- A blank KPI is never counted as zero.
- No individual leaderboard.

## 10. Audit log and export
Append-only Workspace audit log, Reports and members export, Enterprise audit-log file export.
- Entries cannot be edited or deleted.
- The export itself is logged.
- Assistant conversations are excluded.

## 11. Plans and billing layer
Plan record, trial, member limits, grace period, read-only mode, Hidden Reports on Starter, a replaceable billing-provider adapter with webhooks.
- Hitting a limit blocks new invitations only.
- After the grace period a Workspace becomes read-only: members can read, Admins can still manage and pay.
- Nothing is deleted. Upgrading restores hidden Reports.
- One Starter Workspace per User.

## 12. AI features
AI features switch, Assistant tools (shared with search and analytics), Assistant chat, drafting, notice on enabling.
- Off by default. Off greys the sidebar item and sends nothing to the provider.
- The Assistant acts as the asker and cannot read what the asker cannot.
- Counts come from queries, claims link to source Reports, and it states how many Reports a figure covers.
- Conversations are private to each Admin.

## 13. Super Admin
Privileged database role, Workspace management, URL rename, Super Admin audit log.
- The privileged role is used only by Super Admin screens.
- Every action and every opening of a Workspace's content is logged.
- Super Admin never appears in a Workspace's role pickers.

## 14. Site and migration
Landing and pricing copy fixes, then ATR migration (later): Admin-authored Reports become read-only history, duplicates in a period keep the latest as active, department strings become Spaces.
