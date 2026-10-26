# Reportlee

Reportlee is a reporting product for organizations. People submit reports for a reporting period, reviewers decide on them, and Admins monitor the whole organization.

This is the product vocabulary, not a status page. Where a term describes something the code does not do yet, it says so. `docs/ROADMAP.md` is the live board.

## Organization and access

**Workspace**: A company's single home in Reportlee, with its own web address. Synonymous with "Organization". We say Workspace in the product and code.

**Workspace URL**: The Workspace's unique subdomain. Fixed after creation. Only a Super Admin changes it, and the old address then redirects.

**Workspace setup**: The first-run steps for a new Workspace. A Workspace cannot finish setup without at least one Space.

**User**: A person's global identity (name, email, sign-in methods, profile picture). Holds no role, Space or active status.

**Membership**: A User's standing inside one Workspace: role, Space, active status and join date.

**Deactivated Membership**: A Membership that no longer grants access to its Workspace. The person's Reports, comments and history stay attributed to them. Can be reactivated.

**Last workspace**: The Workspace a User most recently signed in to. The general login lands there.

**Invitation**: An emailed offer to join a Workspace with a chosen role and, for Staff and Heads of Space, a Space. The only way into an existing Workspace. Tied to one email address and accepted only by someone with that verified email. Admins may invite any role. A Head of Space may invite only Staff, and only into their own Space.

**Sign-in method**: Password, emailed code, or Google. All lead to the same User. Google links to an existing User only through a verified email.

## Roles

**Staff**: A Member who submits Reports. Belongs to exactly one Space.

**Head of Space**: The single Member responsible for one Space, or none. Submits Reports, which Workspace Admins review. Reviews and comments on their own Space's Reports only. Edits that Space's KPI template.

**Workspace Admin**: A Member who monitors the whole Workspace: every Space, Report, Member and analytic. Does not author Reports and is never reviewed. Can override a Head of Space's decision. A Workspace always has at least one active Admin.

**Report author**: A Staff member or Head of Space. Only these roles submit Reports.

**Super Admin**: A Reportlee operator with full access across every Workspace. Not a member of any Workspace and never shown in a Workspace's role pickers. Distinct from Workspace Admin.

## Spaces

**Space**: A named group inside a Workspace that reports each period, such as a team, division or branch. A Membership belongs to exactly one Space (Workspace Admins belong to none). A Report keeps the Space it was submitted under. Space is a fixed word: it is used as-is in every Workspace, in the product and in the code and database names (`space`, `spaces`, never `department`).

**Archived Space**: A Space with no members, hidden from pickers but kept with its Reports and history. Can be restored.

**KPI template**: A list of suggested KPI fields (name, unit) for one Space. Prefilled when a Report starts and never required. A blank KPI means "not provided", never zero.

## Reporting

**Schedule**: The Workspace's rule for how often people report and when the deadline falls. One per Workspace. A change applies from the next Reporting period.

**Reporting period**: The span a Report covers, with a start, an end and a deadline. Generated from the Schedule. One Report per person per period.

**Report**: A person's submission for one Reporting period: accomplishments, challenges, next plans, optional KPIs, attachments, tags and location.

**Submission status**: For one person in one period: submitted, late or missing.

**Late**: Submitted after the period's deadline. Allowed, and marked.

**Report status**: Pending, approved or rejected.

**Review**: A decision (approve or reject, with optional comments) made on a Report by someone other than its author. A Head of Space's Reports are reviewed by Admins. A Space with no Head has its Reports reviewed by Admins.

**Seen**: A Report is seen once any reviewer has opened it. The author opening it never counts. Seen is permanent.

**Edit window**: A Workspace setting, in minutes (default 30). After a reviewer first sees a Report, the author keeps this long to edit it before it locks. Unseen and rejected Reports are always editable. Approved Reports are locked until a reviewer reopens them.

**Edit history**: A record of each change to a Report: who, when and the previous version. Reviewers see an "edited" flag.

**Follow-up task**: A task a reviewer attaches to a comment, assigned to the Report's author. Only the assignee changes its status.

**Tag**: A label naming a colleague who worked on a Report. Grants no access.

**Attachment**: A file added to a Report, comment or task. Whoever can open the Report can open its attachments.

**Hidden Report**: A Report older than the plan's retention window. Kept but not shown, restored on upgrade. Starter only.

## Finding and asking

**Global search**: Finds Reports, Members and Spaces within the current Workspace. Never shows a result the person couldn't open through the normal screens.

**Assistant**: The read-only AI chat for Workspace Admins. Acts with the asker's permissions, never its own.

**AI features switch**: A Workspace setting, off by default, that turns the AI features (the Assistant and drafting) on or off. Off means the Assistant's sidebar item is greyed out and no Report content is sent to the AI provider.

**Assistant conversation**: A chat between one Admin and the Assistant. Visible only to that Admin.

**Assistant tools**: The fixed set of permission-checked queries the Assistant uses to read data. Shared with search and analytics.

## Communication and records

**Notification**: An in-app message sent to the one person an event concerns. Email copies follow each person's preferences, except invitations and security emails.

**Audit log**: An append-only record of who changed what and when inside a Workspace. Visible to Workspace Admins. Distinct from the Super Admin audit log.

## Plans

**Plan**: A Workspace's subscription level (Starter, Team or Enterprise).

**Trial**: 30 days of Team features for a new Workspace.

**Plan status**: Trial, active, past due or cancelled.

**Read-only Workspace**: A Workspace over its plan's member limit after the grace period. Members can read but not submit, review or comment. Admins can still manage members, export and pay.

**Billing**: A Workspace's subscription, paid by a Workspace Admin through a hosted checkout.

**Billing provider**: The external payment service behind checkout. Replaceable.

**Dashboard**: The single signed-in app. Pages are shared across roles, and each person sees only what their role allows. Not built: removed from the app on 2026-10-26, see `docs/UI.md`.

**Theme**: A person's Light, Dark or System appearance. Applies to every screen. Stored today in the `iroyin-theme` cookie; the plan is to save it on the User.

**Workspace switcher**: The control under the Reportlee logo. Shows the current Workspace and every Workspace where the person has an active Membership, with a "Create workspace" action. Not built.

**Draft**: An unsubmitted Report saved automatically for its author. Visible only to the author, never counts as submitted, never "seen" by reviewers, never searchable by anyone else. It counts as the author's one Report for the period. Lateness is judged when it is submitted, and a draft survives the deadline.

**Task board**: The Tasks page, a Kanban of follow-up tasks (To do, In progress, Done). Views depend on role. Only the assignee moves a card, and only in "Assigned to me".

**Assistant panel**: The Assistant docked on the right of any page, with the page as context only. Expands to a full page with conversation history.

## Decisions

The two contradictions this file used to carry are closed. Both are dated 2026-10-26 and the code follows them.

**Roles: three.** Staff, Head of Space, Workspace Admin. Settled here, in ADR 0005 and in `docs/UI.md`. The code had drifted to two (`staff | admin`), so the onboarding invite step still offers only those: a Head needs a Space, and that picker is UI-4 and UI-5 work, not a copy change.

**Space, not Department.** Space was already this file's word; the code and the landing page said Department. Both now say Space: `src/lib/onboarding.ts`, `src/components/onboarding/space-step.tsx`, the pricing page, the landing page, the metadata and the auth shell tagline. Database naming follows: `spaces`, never `departments`.

One occurrence is deliberately left: a testimonial quotes a customer saying "eleven departments". Those are that customer's words about their own organization, not the product's term.
