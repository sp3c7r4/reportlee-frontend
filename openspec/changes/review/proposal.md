## Why

Reports can be written and submitted, but nobody can act on them. Reviewers cannot mark a report as seen, approve, reject or reopen it, cannot comment, cannot assign follow-up tasks, and nobody is told anything. The review queue, the task board and the notification screens still show mock data. A report edited after a reviewer saw it also stays editable without limit, and the report page tells people their "Head of Space" reviews a report even when the Space has no Head.

## What Changes

- Reviewers record that they saw a report. The first look starts the 30 minute edit window and stops delete. An edit clears the window, and the next reviewer look starts a new one (carry-over C2).
- Reviewers decide on reports: approve, reject (reason required) or reopen (reason required). An approved report is locked until reopened. Admins may decide any other person's report in their Workspace, including overriding a Head. Admins can bulk approve.
- Reviewers start comment threads on a report, the author replies, and a reviewer may attach a follow-up task to a comment. Comment text is sanitized on the server.
- Assignees move their tasks between todo, doing and done. Lists follow the viewer's role.
- In-app notifications are written for decisions, comments, submissions and tasks, scoped to a Workspace, with unread count and mark read. Approve and reject decisions also send an email to the author, behind an env switch.
- The report page names the real reviewers (carry-over C1).
- The review queue, report discussion, timeline, tasks board, Home tasks and notification screens read the API. No mock data for signed-in users (C4).
- ROADMAP gets the reports-list-fix Done row (C3).
- **Permission change:** an Admin who is not the designated reviewer may now read and decide a Staff report in a Space that has a Head. The `reports` change returned 404 here. This is owner decision V2 and replaces that behaviour.
- Backend only, additive: migration `0003_review.sql` adds two tables, three enums, three nullable columns on `notifications` and four values to `notification_type`. No existing response field changes. New fields: `ReportDto.comments` becomes a list (it was always `[]`), notification items gain `workspaceId` and `href`.

## Capabilities

### New Capabilities
- `review-decisions`: who reviews, decide, reopen, bulk approve, the review queue and the missing list.
- `report-seen-window`: seen, the edit window and the edit-after-seen rule.
- `report-comments`: threads on a report and text sanitizing.
- `review-tasks`: follow-up tasks, status moves and role views.
- `notification-inbox`: in-app notifications per Workspace and the decision email.
- `reports-viewer-labels`: the "Reviewed by" label on the report page.

### Modified Capabilities
None as spec deltas. `review-decisions` states that its reviewer rule supersedes the Admin scenario "Admin reads a Staff report in a Space with a Head" of `reports/report-access`, which is not yet archived into `openspec/specs`.

## Impact

- Backend (`reportlee-backend`, branch `feat/review`): migration, `report-comment` and `task` modules, `review` module, `report-access.ts`, `report.service.ts`, `report.dto.ts`, notifications module, email template and queue names, `env.ts`, `.env.example`, `router.ts`, tests.
- Frontend (`reportlee-frontend`, branch `feat/review`): `src/lib/{api-types,review-api,discussion-api,tasks-api,notifications-api,review}.ts`, the review, report, task, notification and Home components, `docs/ROADMAP.md`, `scripts/*.test.ts`.
- No new dependency. Comment sanitizing reuses `sanitize-html`, already in the backend.
- Deploy order: migration, backend, frontend. Every change is additive.
