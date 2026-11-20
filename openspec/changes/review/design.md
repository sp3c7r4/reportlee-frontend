## Context

Slice 3 of Reportlee. The `reports` change gave the backend report submission, the `ReportAccess` choke point (`src/modules/report/report-access.ts`), the `firstSeenAt` and `windowStartedAt` columns, and migration `0002_reports.sql`, which already holds the enum `report_event_kind` with `seen`, `approved`, `rejected` and `reopened`. This change adds reviewing: seen, decisions, the review queue, comments, follow-up tasks and notifications, plus a decision email. It also fixes C1 (the "Reviewed by" label) and C2 (edit after seen), and wires the review queue, report discussion, tasks and notification screens to the API (C4).

Stack, locked once approved: backend Hono, Drizzle, Postgres, Redis, BullMQ, Zod, TypeScript, Vitest on a real Postgres, `sanitize-html` (already installed), Handlebars email templates. Frontend Next.js 16, React 19, plain `src/lib` functions tested with `node --test`. No new dependency in either repo.

Repos and branches: backend `c:\Users\HP\Desktop\backecn-reportlee\reportlee-backend`, frontend `c:\Users\HP\Desktop\backecn-reportlee\reportlee-frontend`, both on `feat/review`.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 (V1) | The author's role is checked first: a Head-role author's report goes to the Workspace Admins, even when the Space has a different Head. Otherwise the reviewer is the current Head of the report's Space, or the Admins when the Space has no Head. Nobody decides own report. Drafts never reviewed. Computed at read time. | Owner decision. Reuses `ReportAccess.relation`. |
| D2 (V2) | Any Admin may read and decide any submitted report of the Workspace that they did not write, including overriding a Head. | Owner decision. |
| D3 (V3) | Decisions `approve`, `reject`, `reopen`. Reject and reopen need a reason, stored as a comment of kind `decision`. Approved is locked until reopened. Reopen returns to pending. Admins bulk approve. | Owner decision. |
| D4 (V4) | `seen` starts the window once, idempotently. Windows and delete rule as in the `reports` change. | Owner decision. |
| D5 (V5) | Reviewer starts the thread, author replies, nobody else. No edit or delete. Server sanitizes. | Owner decision. |
| D6 (V6) | Tasks hang off a reviewer comment. Only the assignee moves status. Views per role as `viewsFor`. Done list is 14 days. Attachments are metadata only. | Owner decision. |
| D7 (V7) | Notifications: decision to author, comment to the other side, submission to reviewers, task to assignee, tag to nobody. In-app. | Owner decision. |
| D8 (V8) | Decision email for approve and reject only, env `DECISION_EMAILS_ENABLED` (`z.stringbool().default(true)`), through the existing email queue. No addresses in logs. | Owner decision. |
| D9 | New relation `admin` in `ReportAccess.relation`: an Admin who is not the author of a submitted report and is not its designated reviewer. It may read and decide, not mark seen, not start a thread. | An Admin browsing a headed Space must not start the author's lock (D4). |
| D10 | `seen` is an explicit `POST /reports/:id/seen`, not a side effect of `GET`. The frontend calls it once per page open for a viewer who is neither author nor Staff and ignores 403 and 404. | GET stays safe. |
| D11 | `markSeen(tx, report, now)` sets `firstSeenAt` only when null and `windowStartedAt` only when null, and inserts a `seen` event only when `windowStartedAt` changed. Edit already clears `windowStartedAt`. `editState` is unchanged. | C2. After an edit the next designated look starts a new window, the first seen time stays, so delete stays locked. |
| D12 | A decision or a comment by the designated reviewer (relation `reviewer`) calls `markSeen` first (sets `firstSeenAt` if null, starts the window if empty). A decision by a non-designated Admin (relation `admin`) calls `markSeen` with `startWindow: false`: it sets `firstSeenAt` if null so delete stays locked and never touches `windowStartedAt`. Reopen then clears `windowStartedAt`. | A reviewer who decides or comments has seen the report, so the author cannot delete it under live comments and tasks. A browsing or overriding Admin must not start the author lock (D9). |
| D13 | Comments, reasons, task titles and completion notes are plain text. `plainText(input)` in `comment-sanitizer.ts`: (1) `sanitizeHtml(input, { allowedTags: [], allowedAttributes: {}, textFilter: (t) => t })` strips tags and drops script and style content; (2) decode the five entities the sanitizer emits (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) back to `&`, `<`, `>`, `"`, `'` in one pass (no double decoding); (3) trim. The decoded text is stored and lengths are checked on the decoded text. React renders it as text and the email template escapes it once. | No new dependency. Untrusted text rule. `sanitize-html` returns escaped text (`Q&A` becomes `Q&amp;A`), which would display wrong and miscount length. |
| D14 | Task creation is the optional `followUp` object on `POST /reports/:id/comments`. `tasks.comment_id` is the single link and `CommentDto.taskId` is joined in. | One transaction, one direction of FK. |
| D15 | Assignee: active Staff or Head Membership of the Workspace, not the assigner. The frontend discussion screen offers the report's author (a Staff or Head); the server accepts any such member. | Admins author nothing. Recorded as a default, see Assumptions. |
| D16 | Notification table is extended additively: nullable `workspace_id`, `membership_id`, `href`, and four enum values. `role` stays NOT NULL with the existing fallback. | Backward compatible. |
| D17 | Notifications are written after the business transaction commits by `ReviewNotifier`, which maps recipient Membership to user. Failures are logged without personal data and never fail the request. | Matches the existing fire-and-forget `notify()` and `invitation.service.ts`. |
| D18 | Email queued after commit with try/catch (pattern of `invitation.service.ts`). `ReviewNotifier.decisionEmail` (in `report-events.ts`) reads the author's address from the user row after commit and calls `EmailQueueService.add(EmailJobNames.DECISION, { message: { to, subject }, template: EmailTemplates.DECISION, locals: { name, title, body, reportUrl, workspaceName }, idempotencyKey: "decision:<eventId>" })`. The reason is not in the locals or the template (design review finding 4): the email says to open the report to read it. `insertEvent` returns the new event id for the key. The queue needs `message.to` at enqueue time, so the address is in the Redis job and nowhere else. Failure logging uses report id and job name only, and any error text goes through `redactEmails` from `@/helpers/log-redact.helper`. `EmailTemplates.DECISION` is added to the closed enum in `src/enums/mail/mail.enums.ts`. | V8, no address in logs. A stable key stops a retry from sending twice. |
| D19 | C1 is fixed in the frontend by `reviewerLabel` in `src/lib/review.ts`. No API change. | `reviewersFor` lacks the Head-author case in a label. |
| D20 | Audit rows in the same transaction: new `AuditAction` values `report.decided`, `report.reopened`, `task.created`, `task.moved`. Summary holds ids and keys only. | Brief: audit rows if trivial. |
| D21 | Task status moves are allowed in a read-only Workspace. Creating a task and commenting are not. | The brief lists submit, review and comment as blocked. Moves are not listed. Flagged as a default. |
| D22 | The bell polls `GET /notifications/unread-count` every 60 seconds and on window focus. | Smallest thing that works. The socket push exists server-side for later. |
| D23 | `missing` list is built from the same query as the existing frontend `missingFor`: active, not Admin, no non-draft report in the period. | Mirrors the frontend rule. |
| D24 | Notification text never carries the reason (privacy). An edit after a rejection notifies nobody. `src/lib/events.ts` is no longer used on the signed-in path (kept for the mock tests). The realtime `notification:new` payload gains `workspaceId` and `href`. | Differs from `events.ts` on purpose; recorded so nobody restores the reason text. |
| D25 | `GET /tasks`, the review queue and the notifier exclude rows whose report has `deleted_at` set. | A deleted report must not leave visible tasks. |
| D26 | The server accepts any real calendar date for `followUp.dueAt`, past dates included. The form still blocks past dates. | The server rule is only "real date"; the product rule stays in the form. |

Note on D13: stored text is the decoded plain text. `Q&A <3` is stored as `Q&A <3`. `<b></b>` becomes empty. `a &lt;script&gt; b` is stored as `a <script> b` and the frontend renders it as text, never with `dangerouslySetInnerHTML`. The same `plainText` runs on `reason`, `followUp.title` and `completionNote`.

## Backend

### Conventions for every route

Order of middleware: `jwt.validateToken`, `requireCaller`, Zod (`ZodEngine.validate.params|query|body`, bodies with `{ log: false }`), then the controller calls the service, which opens a transaction, loads through `ReportAccess` (membership then relation), then rules. Ids are strings in JSON and positive integers up to 2147483647 in Zod. Envelope: `{ "timestamp": "...", "status": 200, "success": true, "data": ... }`. Errors:

- Coded: `{ "timestamp": "...", "status": 403, "success": false, "error": { "message": "...", "code": "NOT_ASSIGNEE" } }`.
- Field: `{ "timestamp": "...", "status": 400, "success": false, "error": { "reason": "Write a reason." } }`. Nested keys use dots: `{ "followUp.dueAt": "Use the form YYYY-MM-DD." }`. Unknown key: `{ "<key>": "This field is not accepted." }`.
- 404: `{ ..., "status": 404, "success": false, "error": { "message": "Not found." } }`.
- 401 (suspended or bad token) and 500 (`"Something went wrong. Try again."`) as in the `reports` change. Unexpected errors are logged once with code and path, never with body text.

Every new controller (report seen, decision, comments, review, task, and the extended notification controller) passes `{ log: false }` to `sendSuccessResponse` for E12 to E21, as `ReportController` does, so comment text, titles and reasons never reach stdout. A test captures logs (`tests/helpers/log-capture.ts`) and asserts a posted comment body is absent.

All user-facing strings go in `report.message.ts`, `task.message.ts`, `review.message.ts` with no em dash.

### Shared JSON shapes (mirrored in the frontend)

```json
CommentDto = { "id": "41", "reportId": "7", "authorMembershipId": "15", "body": "Please add the figures.", "at": "2026-11-18T10:00:00.000Z", "kind": "comment", "taskId": "9" }
```
`kind` is `comment` or `decision`. `taskId` is a string or `null`.

```json
TaskDto = { "id": "9", "reportId": "7", "title": "Add the figures", "assigneeMembershipId": "15", "assignedByMembershipId": "12", "dueAt": "2026-11-25", "status": "todo", "priority": "high", "completionNote": null, "completionFile": null, "completedAt": null, "createdAt": "2026-11-18T10:00:00.000Z" }
```
`completionFile` is `{ "name": "a.pdf", "size": 1200, "type": "application/pdf" }` or `null`.

`ReportDto` is the existing shape. Only `comments` changes: from `[]` to `CommentDto[]` ordered by `created_at, id`. This is additive (the list was always empty).

```json
NotificationDto = { "id": 3, "type": "decision", "title": "Your report was rejected", "message": "A reviewer sent it back with a reason.", "metadata": {}, "read": false, "createdAt": "2026-11-18T10:00:00.000Z", "workspaceId": "8", "href": "/dashboard/reports/7" }
```
`id` stays a number as today. `workspaceId` and `href` are new, each a string or `null`.

```json
MissingRow = { "membershipId": "17", "name": "Dev Member", "role": "staff", "space": "Ops", "submitted": false, "hasDraft": true }
```

### Endpoint table

| # | Method and path | Guards after `jwt.validateToken`, `requireCaller` | Success |
|---|---|---|---|
| E12 | `POST /reports/:id/seen` | membership, designated reviewer | 200 |
| E13 | `POST /reports/:id/decision` | membership, `assertDecide` | 200 |
| E14 | `POST /reports/:id/comments` | membership, `assertComment` | 201 |
| E15 | `GET /review/queue` | membership, role admin or head | 200 |
| E16 | `POST /review/bulk-approve` | membership, role admin | 200 |
| E17 | `GET /tasks` | membership, `view` allowed for role | 200 |
| E18 | `PATCH /tasks/:id` | membership, assignee | 200 |
| E19 | `GET /notifications` (extended) | own rows | 200 |
| E20 | `GET /notifications/unread-count` (extended) | own rows | 200 |
| E21 | `POST /notifications/read-all` (extended) | own rows | 200 |

Route order: in `report.routes.ts` the new `/:id/seen`, `/:id/decision`, `/:id/comments` come after the existing `/:id` routes (they have a second segment, so there is no clash). `reviewRouter` is mounted at `/review`, `taskRouter` at `/tasks` in `src/routes/router.ts`. `/notifications/read-all` stays before `/:id/read` as today.

### E12 `POST /reports/:id/seen`

Request: no body. Params `{ id }` through `reportIdParamSchema`. Service: transaction, `ReportAccess.assertSeen` (lock FOR UPDATE), `markSeen(tx, report, now)`.

`assertSeen` order: load (missing, deleted, other Workspace, deactivated: 404; suspended: 401); draft: 404; relation `none`: 404; relation `author` or `admin`: 403 `NOT_REVIEWER`; relation `reviewer`: continue (`markSeen` with `startWindow: true`).

200: `{ "firstSeenAt": "2026-11-18T10:00:00.000Z", "windowStartedAt": "2026-11-18T10:00:00.000Z" }`. Calls after the first return the stored values. 403: `{ "message": "Only a reviewer of this report can mark it seen.", "code": "NOT_REVIEWER" }`. Logged: none for 4xx.

### E13 `POST /reports/:id/decision`

Body schema (strict object): `decision` required, one of `approve`, `reject`, `reopen`; `reason` optional string, at most 4000 raw characters (the decoded length is checked again in the service). Bad `decision`: 400 `{ "decision": "Choose approve, reject or reopen." }`. Raw too long: 400 `{ "reason": "Use 1000 characters or fewer." }`.

`assertDecide` order (binding, each adjacent pair has a test), on the row locked FOR UPDATE:

1. Load. Missing, deleted, other Workspace, not an active member: 404. Suspended: 401.
2. Draft: 404 for everyone except the author, who gets 409 `NOT_SUBMITTED`.
3. Author: 403 `NOT_AUTHOR_CANNOT_DECIDE`, Admin included.
4. Role `staff`: 404.
5. Role `head`: relation must be `reviewer` (the Head of this Space), else 404.
6. Role `admin`: relation `reviewer` or `admin`.
7. Workspace read-only: 403 `WORKSPACE_READ_ONLY`.
8. State: `approved` accepts only `reopen`, else 409 `REPORT_APPROVED`. `reopen` on a non-approved report: 409 `NOT_APPROVED`.
9. Reason: run `plainText`. Reject and reopen: 1 to 1000 characters, else 400 `{ "reason": "Write a reason of up to 1000 characters." }`. Approve: when `reason` is present and empty after `plainText`, no comment is stored and it is not an error; over 1000 characters is 400 on `reason`. The DB CHECK is a backstop only and is never the first line of defense.

Then, in the same transaction: `markSeen` (`startWindow: true` for relation `reviewer`, `false` for relation `admin`, see D12); update `review_status` (`approved`, `rejected` or `pending`) and, for reopen, `windowStartedAt = null`; insert the event (`approved`, `rejected`, `reopened`) with the actor; insert the `decision` comment when a reason exists; audit row. After commit: `ReviewNotifier.decision`, and for approve and reject `DecisionEmail.queue` when the switch is on.

200: the full `ReportDto` of the report, with `comments`. 409 bodies: `{ "message": "This report is approved. Reopen it first.", "code": "REPORT_APPROVED" }` and `{ "message": "Only an approved report can be reopened.", "code": "NOT_APPROVED" }`. A double decide by two reviewers is serialized by the row lock; the second sees the new state and gets 409.

### E14 `POST /reports/:id/comments`

Body schema (strict): `body` required string, at most 6000 raw characters; `followUp` optional object `{ title: string 1..200, assigneeMembershipId: string of digits, dueAt: string, priority: low|medium|high|critical }`, all four required inside the object. `dueAt` must match `^\d{4}-\d{2}-\d{2}$` and be a real calendar date, checked in Zod with a refinement. Past dates are accepted (D26). Errors are field errors with dotted keys.

`assertComment` order: load (404 as above); draft: 404; relation `none`: 404; read-only Workspace: 403 `WORKSPACE_READ_ONLY`; relation `reviewer`: allowed; relation `author`: allowed only when the report already has a comment of either kind (`comment` or `decision`) written by someone other than the author, else 403 `REVIEWER_MUST_START`, so the author can answer a rejection reason; relation `admin` (not designated): 403 `NOT_REVIEWER`. For relation `reviewer`, `markSeen` runs in the same transaction (D12). Then `plainText` on `body` (1..2000, else 400 `{ "body": "Write a comment of up to 2000 characters." }`). `followUp` with relation `author`: 403 `REVIEWER_MUST_START`. Assignee check: active Staff or Head Membership of the Workspace, not the caller, else 400 `{ "followUp.assigneeMembershipId": "Choose an active Staff member or Head of this Workspace." }`. The title is sanitized like a comment and must still be 1..200.

State is not checked by `assertComment`: an approved report accepts comments, replies and tasks (design review finding 3).

Transaction: insert comment, insert task (when `followUp`), audit `task.created`. After commit: notifier (reviewer comment to author; author reply to the designated reviewers; task to assignee).

201: `CommentDto` of the new comment, with `taskId` set when a task was created.

### E15 `GET /review/queue`

Query schema: `workspaceId` required digit string; `periodId` required digit string. Unknown keys refused. Service: `resolveOrNotFound(userId, workspaceId)`; role `staff`: 403 `{ "message": "Only Heads and Admins can review.", "code": "NOT_REVIEWER" }`; period not in the Workspace: 404.

Reports: submission status not `draft`, `deleted_at` null, in the period, author not the caller. Head: Space whose `head_membership_id` is the caller. Admin: whole Workspace. Ordered by `submitted_at` ascending, capped at 500. `ReportDto` for each, with revisions, events and comments loaded in batched queries, three queries in total, not per report (as `withHistory` does). Missing: active, non-Admin Memberships in scope (Head: own Space) without a non-draft report in the period, with `hasDraft`.

200: `{ "reports": [ReportDto], "missing": [MissingRow] }`.

### E16 `POST /review/bulk-approve`

Body schema (strict): `workspaceId` digit string, `reportIds` array of 1 to 100 digit strings, duplicates removed. Role `admin` only: Head and Staff 403 `NOT_REVIEWER`. Ids are sorted ascending and each is decided in its own transaction through `assertDecide` with decision `approve`. A coded error becomes a skipped row, a 404 becomes `{ "id": "...", "code": "NOT_FOUND" }`. A report of another Workspace than `workspaceId` is skipped `NOT_FOUND`. Notifications and emails fire per approved report after its commit.

200: `{ "approved": ["7", "8"], "skipped": [{ "id": "9", "code": "NOT_AUTHOR_CANNOT_DECIDE" }, { "id": "10", "code": "REPORT_APPROVED" }] }`. An unexpected failure inside one id is logged once (code and report id) and that id is skipped with `INTERNAL`.

### E17 `GET /tasks`

Query: `workspaceId` required, `view` one of `mine`, `by`, `space`, `all`. Allowed views: staff `mine`; head `mine`, `by`, `space`; admin `by`, `all`. Other: 403 `{ "message": "You cannot use this view.", "code": "VIEW_NOT_ALLOWED" }`. `mine`: assignee is the caller. `by`: assigner is the caller. `space`: the assignee's Membership is in a Space the caller is Head of. `all`: every task of the Workspace. `space` for a Head without a Space: empty list. Tasks whose report has `deleted_at` set are dropped (D25). Done tasks with `completed_at` older than 14 days are dropped. There is no way to ask for older ones. Ordered by `due_on`, `id`, capped at 500.

200: `[TaskDto]`.

### E18 `PATCH /tasks/:id`

Body schema (strict): `status` required `todo|doing|done`; `completionNote` optional string, at most 1000 raw characters, only with `done` else 400 `{ "completionNote": "A note goes with a finished task." }`; `completionFile` optional `{ name 1..255, size 0..1073741824, type 1..100 }`, only with `done`.

Order: load the task FOR UPDATE; missing: 404; `resolveOrNotFound(user, task.workspaceId)`: 404; caller is not the assignee: 403 `{ "message": "Only the person it is assigned to can change this task.", "code": "NOT_ASSIGNEE" }`. Move to `done` sets `completed_at = now`, note and file; any other status clears `completed_at`, note and file. Audit `task.moved`. Notification: none (the brief lists none for status).

200: `TaskDto`.

### E19 to E21 notifications (extended, same module)

- `GET /notifications?workspaceId=&page=&limit=`: `workspaceId` optional digit string. When given, rows with that `workspace_id` only. When absent, all rows. Response items gain `workspaceId` and `href`. The existing `total` bug (counts fetched rows) is not touched.
- `GET /notifications/unread-count?workspaceId=`: `{ "count": 3 }`, filtered the same way.
- `POST /notifications/read-all`: optional JSON body `{ "workspaceId": "8" }`. An empty body is allowed. A malformed JSON body is 400 `{ "body": "Send valid JSON or no body." }`. Unknown keys are refused. Marks the caller's unread rows, in that Workspace when given. 200 `{ "message": "All notifications marked as read" }`.
- `PATCH /notifications/:id/read` unchanged: marks only the caller's row, `{ "updated": false }` for others.

Notifications written before this change have `workspace_id` null and show without a filter only.

### Validation rules for external input

| Input | Required | Type and limits | On failure |
|---|---|---|---|
| `:id` params | yes | digit string, 1 to 2147483647 | 400 field error `id` |
| `decision` | yes | `approve`, `reject`, `reopen` | 400 field `decision` |
| `reason` | reject, reopen | raw up to 4000, sanitized 1 to 1000 | 400 field `reason` |
| comment `body` | yes | raw up to 6000, sanitized 1 to 2000 | 400 field `body` |
| `followUp.title` | with followUp | sanitized 1 to 200 | 400 field `followUp.title` |
| `followUp.assigneeMembershipId` | with followUp | digit string, rule D15 | 400 |
| `followUp.dueAt` | with followUp | `YYYY-MM-DD`, real date | 400 |
| `followUp.priority` | with followUp | `low`, `medium`, `high`, `critical` | 400 |
| `reportIds` | yes | 1 to 100 digit strings | 400 field `reportIds` |
| `view` | yes | four values | 400, role rule 403 |
| `completionNote` | no | raw up to 1000, sanitized | 400 |
| `completionFile` | no | name, size, type as above | 400 |
| `workspaceId`, `periodId` | per route | digit string | 400 |
| unknown keys | n/a | refused | 400 `This field is not accepted.` |

### Invariant ownership

| Invariant | Owner | Why there |
|---|---|---|
| Who may read, seen, decide, comment | `ReportAccess` (`assertRead`, `assertSeen`, `assertDecide`, `assertComment`) | One place, run on the locked row. Controllers hold no rule. |
| Approved is locked, reopen only from approved | `assertDecide` step 8, and `editState` for edits | Same lock as the edit path. |
| Window and first seen time | `markSeen` in `report.repository.ts`, called inside the transaction | One writer of those columns besides edit. |
| Assignee is the only mover | `TaskService.move` | Row loaded under lock in the service. |
| Sanitized text | `comment-sanitizer.ts`, called by the service before any insert | Server never trusts the browser. |
| Comment and task are one unit | one transaction in `ReviewCommentService.add` | No orphan task. |
| `completed_at` set exactly when done | CHECK constraint plus service | Database is the backstop. |
| One task per comment | unique index on `tasks.comment_id` | Database is the backstop. |

### Service behaviour and error handling

| Operation | Failure | Recoverable | Caller gets | Logged |
|---|---|---|---|---|
| Any route | missing, deleted, other Workspace, non-member | yes | 404 `Not found.` | no |
| Any route | suspended user | no | 401 | no |
| Decide, comment, seen | rule broken | yes | 403 or 409 with code | no |
| Decide, comment, task | invalid input | yes | 400 field error | no |
| Decide, comment | database error | no | 500 generic, transaction rolled back | `error`: code, path, no body |
| Bulk approve, one id | any error | yes, per id | id in `skipped` | `error` only for unexpected, id and code |
| Notifier | insert or publish fails | yes | request unaffected | `error`: recipient membership id, type, error message |
| Email queue | add fails | yes | request unaffected | `error`: report id, job name, message, no address |
| Task move | stale state (two moves) | yes | last write wins under the row lock | no |

### `ReportAccess` changes

`Relation` becomes `"author" | "reviewer" | "admin" | "none"`. `relation()` returns `admin` for an Admin who is not the author of a submitted report and is not the designated reviewer. Its order, as built (design review finding 1):

```ts
if (caller.membershipId === report.authorMembershipId) return "author";
if (report.submissionStatus === "draft") return "none";
const space = await spaceHead(tx, report.spaceId);
const authorIsHead = (await membershipRole(tx, report.authorMembershipId)) === "head";
const adminsReview = !space?.head || authorIsHead;
if (!adminsReview && space?.head === caller.membershipId) return "reviewer";
if (caller.role === "admin") return adminsReview ? "reviewer" : "admin";
return "none";
```

`markSeen(tx, report, actor, now, { startWindow, event })` (finding 5): the explicit look (E12) writes a `seen` event whenever it starts a new window; a decision or comment writes one only when `firstSeenAt` was null. Reopen never starts a window. The queue, the notifier and the access code use the same rule; the notifier's `reviewersOf` and the queue's Head scope (`author role <> 'head'`) mirror it. `assertRead` allows `author`, `reviewer` and `admin`. New methods `assertSeen`, `assertDecide`, `assertComment` as above. `assertAuthor` (used by submit, edit, delete) treats `admin` like `reviewer` (403 `NOT_AUTHOR`) so nothing changes for existing author routes. A new pure `ReportAccess.decideAllowed(role, relation)` is shared with the queue and the notifier so reviewers come from the same code.

Existing tests that asserted 404 for an Admin on a headed Space's Staff report (`tests/report-access.test.ts`, `tests/reports.test.ts`) are changed on purpose to expect the report, and the change is named in the commit message.

### Notifications and email

`ReviewNotifier` (`src/modules/notifications/report-events.ts`) has `decision`, `comment`, `submission`, `task`. It receives Membership ids, skips any Membership that is not active at send time (finding 10; the decision email too), maps them to user ids, and calls `NotificationService.notify(userId, type, title, message, metadata, { workspaceId, membershipId, href })`. Reviewers of a report come from the same relation rule: the Head of the Space, or the Admins when none or the author is a Head. `ReportService.submit` calls `ReviewNotifier.submission` after commit.

Titles and messages live in `notification.message.ts`, for example title "Your report was approved", message "A reviewer approved your report." The reason text is never in a notification.

Email: `EmailJobNames.DECISION`, `EmailTemplates.DECISION`, template `src/emails/decision/html.hbs` copied from the `invitation` structure. Locals `{ name, title, body, reportUrl, workspaceName }`, built from `FRONTEND_URL`. No reason in the email (finding 4). Subjects "Your report was approved" and "Your report needs changes".

## Data

Migration `reportlee-backend/src/db/migrations/0003_review.sql`, hand-written, LF endings, idempotent, never edited after it is applied (the runner hashes the content). Additive only: no drop, no rename, no new NOT NULL on an existing table. Unchanged: `reports`, `report_events`, `report_event_kind` (0002 already holds the values).

| Object | Change |
|---|---|
| enum `comment_kind` | new: `comment`, `decision` |
| enum `task_status` | new: `todo`, `doing`, `done` |
| enum `task_priority` | new: `low`, `medium`, `high`, `critical` |
| table `report_comments` | new: `id` identity PK, `report_id` NOT NULL FK `reports` cascade, `author_membership_id` NOT NULL FK `memberships` restrict, `kind` `comment_kind` NOT NULL default `comment`, `body` text NOT NULL with CHECK length 1 to 2000, `created_at` timestamptz NOT NULL default now (finding 7). Index `(report_id, created_at)`. |
| table `tasks` | new: `id` identity PK, `workspace_id` NOT NULL FK cascade, `report_id` NOT NULL FK cascade, `comment_id` FK `report_comments` on delete set null, `title` varchar(200) NOT NULL, `assignee_membership_id` NOT NULL FK restrict, `assigned_by_membership_id` NOT NULL FK restrict, `due_on` date NOT NULL, `status` `task_status` NOT NULL default `todo`, `priority` `task_priority` NOT NULL, `completion_note` text, `completion_file` jsonb, `completed_at` timestamptz, `created_at`, `updated_at` timestamptz NOT NULL default now. CHECKs: title length 1 to 200, note length at most 1000, `(status = 'done') = (completed_at IS NOT NULL)`. Indexes: `(assignee_membership_id, status)`, `(workspace_id, assigned_by_membership_id)`, `(report_id)`, unique `(comment_id)` where `comment_id IS NOT NULL`. |
| table `notifications` | add nullable `workspace_id` FK `workspaces` cascade, `membership_id` FK `memberships` set null, `href` varchar(255). Index `(user_id, workspace_id, read_at)`. |
| enum `notification_type` | add `decision`, `comment`, `task`, `submission` with `ADD VALUE IF NOT EXISTS`, as the last statements, not used in the file. |

Migration content (as applied in BE-1, commit 2c86109; the file in the backend repo is the source):

```sql
DO $$ BEGIN CREATE TYPE "public"."comment_kind" AS ENUM('comment', 'decision'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."task_status" AS ENUM('todo', 'doing', 'done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"report_id" integer NOT NULL,
	"author_membership_id" integer NOT NULL,
	"kind" "comment_kind" DEFAULT 'comment' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_report_fk" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_author_fk" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_body_chk" CHECK (char_length("body") BETWEEN 1 AND 2000); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_comments_report_created_idx" ON "report_comments" ("report_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"workspace_id" integer NOT NULL,
	"report_id" integer NOT NULL,
	"comment_id" integer,
	"title" varchar(200) NOT NULL,
	"assignee_membership_id" integer NOT NULL,
	"assigned_by_membership_id" integer NOT NULL,
	"due_on" date NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" NOT NULL,
	"completion_note" text,
	"completion_file" jsonb,
	"completed_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_report_fk" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_comment_fk" FOREIGN KEY ("comment_id") REFERENCES "report_comments"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_fk" FOREIGN KEY ("assignee_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_fk" FOREIGN KEY ("assigned_by_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_chk" CHECK (char_length("title") BETWEEN 1 AND 200); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_note_chk" CHECK ("completion_note" IS NULL OR char_length("completion_note") <= 1000); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_done_chk" CHECK (("status" = 'done') = ("completed_at" IS NOT NULL)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assignee_status_idx" ON "tasks" ("assignee_membership_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_ws_assigner_idx" ON "tasks" ("workspace_id", "assigned_by_membership_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_report_idx" ON "tasks" ("report_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_comment_uq" ON "tasks" ("comment_id") WHERE "comment_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "workspace_id" integer;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "membership_id" integer;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "href" varchar(255);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_membership_fk" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_ws_read_idx" ON "notifications" ("user_id", "workspace_id", "read_at");
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'decision';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'comment';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'task';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'submission';
```

Model files in the same change: new `src/modules/report-comment/report-comment.model.ts` and `src/modules/task/task.model.ts`; edit `src/modules/notifications/notification.model.ts` (three columns), the `NotificationType` enum (four values), `TableNames` (`REPORT_COMMENTS`, `TASKS`), `src/db/postgres.schema.ts` exports, `AuditAction`, `EmailJobNames`, `EmailTemplates`, `EnvSchema` plus `.env.example` (name `DECISION_EMAILS_ENABLED` only), `tests/helpers/db.ts` and `factories.ts`.

Environment: before `npm run migrate`, print `NODE_ENV` and confirm the database is the Docker `app-db` on host port 5434. Never `migrate:rebuild`. If the runner's transaction rejects `ADD VALUE` (verification item 4), the four statements move to `0004_review_notification_types.sql` before anything is applied.

Backward compatibility: every change is additive. A backend running the new code against the old frontend returns the same fields plus new ones. The old frontend never calls the new routes.

## Frontend

### API modules (all calls through `src/lib`, base URL from `NEXT_PUBLIC_API_URL` only, tokens in memory)

New files: `review-api.ts` (`markSeen`, `decide`, `loadQueue`, `bulkApprove`), `discussion-api.ts` (`postComment`), `tasks-api.ts` (`listTasks`, `moveTask`), `notifications-api.ts` (`listNotifications`, `unreadCount`, `markRead`, `markAllRead`). Each function returns `ApiResult<T>` from `src/lib/api.ts` via `apiCall(method, path, body, fallback)`, as `reports-api.ts` does. Field errors are read from `result.fields`. No new shape (design review finding 2). While `SIMULATED_AUTH` is true `apiCall` fails with status 0 and the screens show the existing message. `src/lib/report-errors.ts` gets the new codes mapped to sentences: `NOT_REVIEWER`, `NOT_AUTHOR_CANNOT_DECIDE`, `NOT_APPROVED`, `REVIEWER_MUST_START`, `NOT_ASSIGNEE`, `VIEW_NOT_ALLOWED`, `NOT_FOUND`, `INTERNAL`, and sentences for the bulk skip codes `REPORT_APPROVED`, `NOT_SUBMITTED` and `WORKSPACE_READ_ONLY`.

### Mirrored types (files that change)

- `src/lib/api-types.ts`: `ApiComment`, `ApiTask`, `ApiNotification`, `ApiQueue`, `ApiBulkResult`, `ApiSeen`; `ApiReport.comments` becomes `ApiComment[]`.
- `src/data/reports.ts` `Comment`: no change. The mapper turns `taskId: null` into undefined.
- `src/data/tasks.ts` `Task`: no change; `dueAt` is the `YYYY-MM-DD` string. `SAMPLE_TASKS` stays for the mock-only tests but no screen reads it.
- `src/lib/notifications.ts` `Notification`: no change. The mapper sets `id` to `String(id)`, `kind` from `type` (`decision`, `comment`, `task`; `submission` shows as kind `comment` with its own title; `system` and `account` show as `security`), `body` from `message`, `at` from `createdAt`, `read`, `href` (accepted only when it starts with `/dashboard/`; null or anything else becomes `/dashboard`).
- `src/lib/review.ts`: add `reviewerLabel`.

### Screens and states

| Screen | Calls | States |
|---|---|---|
| Review queue `review-queue.tsx` | `loadQueue`, `decide`, `bulkApprove` | Loading skeleton. Error with retry. Empty ("Nothing to review in this period"). List with decision controls. Reject and reopen open a reason box, the Submit button stays disabled until the reason has text. `decisionBlocked` still disables controls. Server errors show beside the control. Bulk approve (Admin only) shows "Approved N. Skipped M" and lists each skipped report with its sentence. Staff see "You do not review reports." |
| Report page `report-view.tsx` | existing `getReport`, `markSeen` | Calls `markSeen` once per open when the viewer is not the author and the role is Head or Admin, ignores 403 and 404. Label from `reviewerLabel` using the roster already loaded for the page, or `listMembers` when absent. The localStorage task read is removed. |
| Discussion `report-discussion.tsx` | `postComment` | Posting, field errors on body and follow-up, the reviewer-must-start message for the author, read-only message. |
| Timeline `report-timeline.tsx` | none | Shows `seen`, `approved`, `rejected`, `reopened` events from the server. |
| Tasks `task-board.tsx` | `listTasks`, `moveTask` | Loading, error with retry, honest empty state per view, 403 on a view hides it. Move errors revert the card and show the sentence. The "Show older" control is removed because the 14-day rule is server side. The due date form still blocks past dates. No `SAMPLE_TASKS`, no localStorage. |
| Home `home-screen.tsx` | `listTasks` | Replaces `SAMPLE_TASKS` (lines 56 and 88 to 90). Requests `viewsFor(viewer)[0]`: Staff and Head `mine`, Admin `by`. Empty state when none. A failure shows a one-line inline error with a retry button and does not block the rest of Home. |
| Notifications `notifications-screen.tsx` | `listNotifications`, `markRead`, `markAllRead` | Loading, error, empty ("No notifications yet"), list. Scoped by `workspace.id`. |
| Bell `notification-bell.tsx` | `unreadCount` | Badge from the server count, poll every 60 seconds and on focus. A failed poll keeps the last count. |

`reviewerLabel({ report, roster })` returns the Head's name when the report's Space has an active Head and the author is not a Head, otherwise "Workspace admins". Line 433 of `report-view.tsx` uses it instead of "Your Head of Space".

No em dash in any string. Text is rendered as text only.

## Testability

Backend, real Postgres, `npx vitest run <files>`:
- `tests/migration-0003.test.ts`: objects exist, applied twice with the no-catch helper, CRLF form hashes differently so the file must be LF, CHECKs refuse bad rows, unique comment link, enum values present.
- `tests/review-seen.test.ts`, `tests/report-access.test.ts`, `tests/reports.test.ts`: seen rules, C2 sequence with injected `now`.
- `tests/review-decisions.test.ts`, `tests/review-queue.test.ts`: every row of the decide matrix, reasons, lock, reopen, bulk, queue scope, missing list, double decide.
- `tests/report-comments.test.ts`, `tests/tasks.test.ts`, `tests/review-notifications.test.ts` (bullmq mocked as in `tests/invite-support.test.ts`, log capture from `tests/helpers/log-capture.ts`).

Frontend, `node --test scripts/*.test.ts`: envelope parsing, error mapping, `reviewerLabel`, notification mapper, bulk summary text. Screens are checked by a manual and live pass, and marked "not verified" when no browser is available.

Not unit-testable: real email delivery, the 60 second poll, realtime push.

## Assumptions (design review please check)

1. Staff, a Head outside the Space, and a Staff colleague get 404 on decide, comment and seen. Only the author and a non-designated Admin get a 403 `NOT_REVIEWER` on seen, and the author gets 403 `NOT_AUTHOR_CANNOT_DECIDE` on decide.
2. D15 assignee rule and D21 (moves allowed in read-only Workspaces) are defaults. Neither was in V1 to V8.
3. Editing a rejected report keeps the existing `ReportService.edit` behaviour for `reviewStatus` (not changed here). To be confirmed by reading the code and tested before relying on it.
4. `notify()` falls back to role `"member"`. Verify the value exists in the `user_role` enum, and what role the dev fixtures have, so the NOT NULL column cannot fail an insert.
5. `FRONTEND_URL` is a usable base for the report link in the email, and the frontend report route is `/dashboard/reports/<id>`.
6. The `ADD VALUE` statements work inside the runner's per-file transaction on the `app-db` image version (Postgres 12 or later).
7. Existing report controllers pass `{ log: false }` on responses. New controllers must too (conventions). Verified by a log-capture test.
8. A reason on approve is optional and stored when given and non-empty after `plainText`.
9. The queue is capped at 500 reports and tasks at 500 rows. No pagination in this slice.

## Rejected alternatives

- `seen` as a side effect of `GET /reports/:id`: breaks safe, cacheable GET and makes any Admin browse start a lock.
- Admin as reviewer only as a fallback (existing relation): cannot satisfy V2 override.
- `ADD VALUE` in a separate `0004` from the start: not needed unless the runner rejects it. Kept as the fallback.
- A separate `POST /tasks`: two requests lose atomicity with the comment, and a task without a comment breaks the one conversation rule.
- `z.coerce.boolean()` for the email switch: `"false"` becomes true. `z.stringbool()` is already used in `env.ts`.
- Storing the comment id on the task and the task id on the comment: a circular FK. One direction only.
- Stripping tags on the frontend only: the backend must not trust the browser.
- Websocket client for notifications now: more moving parts, polling is enough for this slice.

## Order of work

1. Migration `0003_review.sql`, models, `npm run migrate` locally (BE-1).
2. `ReportAccess` changes and `seen` (BE-2).
3. Decisions, queue, bulk (BE-3).
4. Comments and tasks creation (BE-4), task module (BE-5).
5. Notifications and email (BE-6), backend Gate 3 (BE-7).
6. Frontend: API layer and types (FE-1), C1 (FE-2), queue (FE-3), report page (FE-4), tasks and Home (FE-5), notifications (FE-6), docs (FE-7), frontend Gate 3 (FE-8).
7. Gate 4 review, live check, final report (workflow-owned).

The backend deploys first. Everything is additive.

## Acceptance checks

- AC1: Head approves a Staff report in their own Space. Admin approves any other person's submitted report. Head on own report, Admin on own report: 403 `NOT_AUTHOR_CANNOT_DECIDE`.
- AC2: Staff, a Head of another Space and a caller from another Workspace get 404 on decide.
- AC3: An Admin approves after a Head rejected. The final state is approved.
- AC4: Reject and reopen without a reason (empty, spaces only, only tags) give 400 on `reason`. With a reason, a `decision` comment exists.
- AC5: Approve then reject gives 409 `REPORT_APPROVED`. Edit of an approved report gives 403 `REPORT_APPROVED`. Reopen returns pending and clears the window. Reopen on pending gives 409 `NOT_APPROVED`.
- AC6: Bulk approve of a mixed batch approves what it may, lists each skipped id with its code, and never aborts. Head gets 403. 101 ids give 400.
- AC7: Seen by the designated reviewer sets both times and one event. A second call changes nothing. The author, Staff and a non-designated Admin cannot start the window.
- AC8 (C2): edit inside the window works and clears the window. The next designated look starts a new window and keeps `firstSeenAt`. An edit after that window gives 403 `EDIT_WINDOW_CLOSED`. A rejected report stays editable. Delete gives `REPORT_SEEN` after seen.
- AC21: `plainText` stores `Q&A <3` as `Q&A <3` and `a &lt;script&gt; b` as `a <script> b`, with length counted on decoded text; the same holds for reason, title and note.
- AC22: A reviewer comment or task sets `firstSeenAt`, so the author gets 403 `REPORT_SEEN` on delete. A decision by a non-designated Admin sets `firstSeenAt` and leaves `windowStartedAt` unchanged. Tasks of a deleted report are not listed.
- AC23: The author can reply after a reviewer rejected with a reason.
- AC24: Approve with a reason that is empty after sanitizing stores no comment and returns 200. A reason over 1000 characters gives 400 on `reason`.
- AC25: A posted comment body is absent from captured stdout.
- AC9: Reviewer starts, author replies, author cannot start, a colleague gets 404, other Workspace 404. `<script>` and tags are stripped, tag-only text gives 400, 2001 characters give 400.
- AC10: A follow-up creates the task in the same transaction. A bad assignee or date gives 400 and no comment is saved. Only a reviewer can attach it.
- AC11: Only the assignee moves a task (`NOT_ASSIGNEE` for assigner, other Head, Admin). `completedAt` is set on done and cleared on leaving done. A 15 day old done task is not listed.
- AC12: Views per role: staff `mine`, head `mine|by|space`, admin `by|all`, anything else 403.
- AC13: Notifications per D7 with workspace id and href, scoped per Workspace, unread count and mark read correct, another user's row is not changed, tag creates nothing.
- AC14: Decision email queued for approve and reject only, not when the switch is off, not for reopen or comments, queue failure does not fail the decision, logs hold no address, the job holds no reason text, a deactivated author gets none.
- AC26 (finding 1): A Head-role author in a Space whose Head is someone else: that Head gets 404 on read, seen, decide and comment, the report is not in that Head's queue, and the Admins are the reviewers.
- AC27 (finding 3): A reviewer comments with a follow-up on an approved report: 201.
- AC15: Queue scope per role, drafts excluded, missing list excludes Admins and deactivated members and counts drafts as missing, Staff get 403.
- AC16: Migration applies twice without error, with LF endings, and `npm run migrate` the second time reports "already recorded".
- AC17 (C1): `reviewerLabel` gives the Head, or "Workspace admins" for no Head, Head author and deactivated Head.
- AC18 (C4): review queue, tasks board, Home tasks, notifications page and bell show no sample data for a signed-in user, with loading, empty and error states.
- AC19 (C3): ROADMAP has the Done row for the reports list fix dated 2026-11-18.
- AC20: No em dash or en dash in touched user-facing strings. No new dependency.

## Backlog (carried out of this slice)

- Emails for comments, tasks and submissions.
- Websocket client for notifications.
- Pagination for the queue, tasks and the notification `total` (counts fetched rows today). The 500-row caps on the queue and tasks truncate silently in v1 (finding 8).
- Comment edit and delete.
- Real file upload for task completion files.
- Audit log screen.

## Responses to design review round 1

All 14 findings are addressed. None is backlogged or ignored.

| # | Finding | Response |
|---|---|---|
| 1 | Escaped text stored | Fixed. D13 `plainText` strips tags, decodes entities, trims; lengths on decoded text; AC21; comments spec scenario. |
| 2 | Email address at enqueue | Fixed. D18 rewritten: address read after commit, `idempotencyKey`, `EmailTemplates.DECISION`, `redactEmails`. BE-6 updated. |
| 3 | Comment or task not a look; orphan tasks | Fixed. D12 makes a designated reviewer's comment call `markSeen`; D25 hides tasks and queue rows of deleted reports; AC22; specs. |
| 4 | Stale assumption 7, `log: false` | Fixed. Conventions require `{ log: false }` on every new controller; assumption 7 replaced; Backlog line removed; AC25. |
| 5 | Decision starts window for Admin | Fixed. D12: `startWindow: false` for relation `admin`; seen-window spec scenario; AC22. |
| 6 | Author cannot answer a decision reason | Fixed. E14 rule uses either comment kind; spec scenario; AC23. |
| 7 | Approve reason has no rule | Fixed. E13 step 9; decisions spec scenarios; AC24. |
| 8 | Home view undefined | Fixed. Home requests `viewsFor(viewer)[0]` with inline error and retry. |
| 9 | Result shape differs from `api.ts` | Fixed. Frontend section uses `Call<T>` with `status` and `fieldErrors`. |
| 10 | Dead "Show older" control | Fixed. Control removed; 14-day rule is server side. |
| 11 | Past due dates | Fixed. D26: server accepts any real date; the form blocks past dates. |
| 12 | Notification content vs `events.ts` | Fixed. D24 records no reason in notifications, no notification on edit after reject, socket payload gains `workspaceId` and `href`. |
| 13 | Small gaps | Fixed. Admin comment scenario, `NOT_FOUND` and `INTERNAL` sentences, bulk skip sentences, read-all body rule. |
| 14 | `href` check | Fixed. Mapper accepts only `/dashboard/` prefixes; spec scenario. |