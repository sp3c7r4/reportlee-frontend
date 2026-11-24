# Verification: review-browser-fixes (iteration 1)

Frontend only. The backend was not changed: every failing screen had a correct API answer (see repro.md).

## Tests: red, then green

New suites: `scripts/editor-sync.test.ts` (4 tests) and `scripts/task-board.test.ts` (10 tests).
For red, I first moved today's behaviour into `src/lib` unchanged:
- `editorSync.emitted` did nothing, which is what the component did: it never recorded its own HTML.
- `startsDrag` ignored where the press began.
- `emptyBoard` returned the old copy only.

Then I ran `node --test scripts/editor-sync.test.ts scripts/task-board.test.ts` (output in `red.out`):

| Test | Red result |
|---|---|
| editor: own keystroke coming back does not replace | `expected: false, actual: true` |
| editor: typing word by word never asks for a replace | deepEqual fails, the list holds every keystroke |
| editor: outside value after typing, then typing goes on | `expected: false, actual: true` |
| board: a mouse press on a card's button or link does not start a drag | `expected: false, actual: true` |
| board: Admin's empty Assigned by me says how to assign, links to Review | `hint` is null |
| board: Head's empty Assigned by me gets the same hint | `expected: '/dashboard/review'`, got undefined |
| board: Admin who is Staff elsewhere is told where their tasks are | `elsewhere` is null |

Red: 14 tests, 7 pass, 7 fail. The 7 that pass guard behaviour that must not change (a draft load still
replaces once, body drag still starts, touch and non-assignee never drag, Staff get no hint, overdue
keeps its message, no dash).

Green, after the fix, with the existing `scripts/tasks.test.ts` added to the run: 32 tests, 32 pass, 0 fail (`green.out`).

## Gate 3 (frontend)

Touched: `src/lib/editor-sync.ts` (new), `src/lib/tasks.ts`, `src/components/reports/rich-text-section.tsx`,
`src/components/tasks/task-board.tsx`, `scripts/editor-sync.test.ts` (new), `scripts/task-board.test.ts` (new).

| Step | Command | Result | Duration |
|---|---|---|---|
| 1 | `npx biome check <6 touched files>` | first run 5 errors, all format or import order: the working copies are CRLF (`core.autocrlf=true`) and `tasks.ts` had an unsorted import. `npx biome check --write <6 touched files>`, then rerun: **0 diagnostics** | 5s |
| 1b | em/en dash search (`[\u2013\u2014]`) on the 6 touched files | no hits | |
| 2 | `npx tsc --noEmit` | exit 0 | 165s |
| 3 | `npm test` | **370 tests, 370 pass, 0 fail**, 0 skipped (356 before + 14 new) | 334s |
| 4 | `npm run build` | exit 0, "Compiled successfully in 110s", all routes built incl. `/dashboard/reports/new`, `/dashboard/reports/[id]`, `/dashboard/tasks` | 222s |

The chain ran as one script, `c:\Users\HP\Desktop\backecn-reportlee\.agents\tools\g3-fe.ps1`, which stops at
the first failure. Results are in `g3-fe.out`, and per-step logs are `g3-tsc.log`, `g3-test.log` and `g3-build.log`
in this folder. Steps 2 to 4 are each over the 3 minute guide. That is the known speed of this PC, not a hang
(the reports-list-fix runs were slower). No new dependency.

Backend: not touched, so no backend Gate 3 ran.

## Re-verify in the headless browser (after the fix)

Same driver as repro.md. Screens and logs are `shots/after*-*.png` and `shots/after*-*.log`. The dev accounts
now land in workspace 8 without forcing.

| # | Role | Clicked | Seen | Network |
|---|---|---|---|---|
| 1 | Staff | Sign in, Home "Submit report", type "Closed the onboarding backlog this week and shipped the new intake form to every team." with real key presses | Editor holds the sentence **with every space**, counter past 50, "Saved just now" | `PATCH /reports/draft` 200, body sent with the exact spaced text |
| 1 | Staff | Same, then "Submit report" (first after run, the draft still held the old repro text) | Home: "Submitted, Week of 23 November. Submitted. Your reviewer sees it in Review." | `PATCH /reports/draft` 200, `POST /reports/15/submit` 200 |
| 2 | Staff | Tasks, "Move to Doing" on "Add the Q4 figures" | Card under Doing, notice "Moved to Doing." | `PATCH /tasks/2 {"status":"doing"}` 200 |
| 2 | Staff | "Move to To do" | Back under To do, "Moved to To do." | `PATCH /tasks/2 {"status":"todo"}` 200 |
| 2 | Staff | Mouse drag of the card body into Doing | Card under Doing, "Moved to Doing." | `PATCH /tasks/2 {"status":"doing"}` 200 |
| 3 | Staff | Home and Tasks in workspace 8 | Home "Tasks assigned to you: Add the Q4 figures"; Tasks "Assigned to me" lists it | `GET /tasks?workspaceId=8&view=mine` 200 |
| 3 | dev-member in workspace 1 (Admin there) | Tasks | "You have not assigned any tasks. To assign a task, open a report and add a follow-up from a comment. Open Review" and "You are an Admin in this Workspace, so no task is assigned to you here. Tasks assigned to you are in Live Check. Switch Workspace to see them." | GETs only |
| 4 | Admin | Tasks, "Show report" on report 5 (dev-member's) | Report page renders: Pending, Week of 16 November, Discussion with comment box | `GET /reports/5` 200, `POST /reports/5/seen` 200 |
| 5 | Admin | On report 5: comment, "Add a follow-up task", title "Add the Q4 figures", assignee Sam Member, due 2026-12-04, "Post comment and raise task", then Tasks | "Comment posted and the follow-up task is on the board."; the task is on the board under To do | `POST /reports/5/comments` 201, `taskId: "3"` |
| 5 | dev-admin in workspace 9 (read only) | Tasks | The owner's screen ("You have not assigned any tasks.") now adds "To assign a task, open a report and add a follow-up from a comment. Open Review" | GETs only, nothing written in workspace 9 |

Console: no page errors and no stack traces. One "Failed to load resource: net::ERR_CONNECTION_TIMED_OUT" in the
first after run, logged before I added host logging, so the URL is not recorded. The app's only outside hosts are
the font CDN (fontshare) and images.unsplash.com, and later runs did not repeat it. One workspace 9 run hit a
transient `ERR_NETWORK_CHANGED` on `/me/memberships` (the host network changed while Docker started), and the rerun was clean.
No request went to a host other than the API, the font CDN and Next itself.

## Dev fixtures left for the owner (local DB through the local API only)

- dev-member@example.com and dev-admin@example.com both land in workspace 8 "Live Check" (`PUT /me/last-workspace`, 200 each).
- Period 7 "Week of 23 November" is draftable for dev-member: no draft, no report. Reports 15 and 18 made by the
  checks were soft deleted by their author (`DELETE /reports/{id}` 204, design D11).
- Tasks assigned to dev-member in workspace 8: 1 To do, 2 Doing, 3 To do.
- Report 5 (dev-member, pending) opens for dev-admin: `GET /reports/5` 200.
- Workspace 9 "Arthurite Integrated": only GETs. dev-admin's last workspace (a user row, not workspace data) went 9 to 8.
- Emails: none queued (no approve or reject was made).

## Services left running

Docker `app-db` (5434) and `app-cache` (6379), the API on :5000 (`npm run start:dev`, nodemon), the email worker
(`npm run start:dev:workers`) and next dev on :3000 (after clearing `.next`). After the build, next dev still
answers 200 for `/dashboard/reports/new`, `/dashboard/reports/5` and `/dashboard/tasks`.

## Iteration 2 (review round 1: APPROVED, 3 low or info findings)

- Finding 2 (no browser-level test for component wiring): added a Backlog line in docs/ROADMAP.md. Docs only, so no lint, tests or build were rerun.
- Finding 1 (item 4 [id] route 404 not captured before restart): the stack is now healthy, so the old failure cannot be captured. Re-verified by execution: dev-admin opened /dashboard/reports/5 by client navigation. GET /reports/5 200, POST /reports/5/seen 200, no console error from the app. If the owner sees the bare Next 404 again: capture URL, status and console first, then stop next dev, delete .next, run 
pm run dev.
- Finding 3 (timeout without a URL): the host is now logged. In the iteration 2 staff run the two timeouts were cdn.fontshare.com font files (the font CDN, an allowed host, a network issue on this PC). No request failed to the API or Next.
- Staff re-run (iter2): editor kept spaces ("Browser check: wrote the weekly summary."), PATCH /tasks/1 200 for "Move to Doing" and "Move to To do". Tasks list shows the assigned tasks.
- The staff run saved draft 19 for period 7. I deleted it (DELETE /reports/19, 204) so dev-member's period is draftable again.
- Services still running: API :5000, worker, next dev :3000 (nothing restarted this iteration).

## Iteration 3 (review round 1, finding 3: approved report as Admin)

- Approved report 5 once as dev-admin (POST /reports/5/decision approve, 200; one decision email queued to dev-member@example.com). Opened it by client navigation as dev-admin in workspace 8: GET /reports/5 200 (eviewStatus: approved), POST /reports/5/seen 200. The page rendered: Approved, Submitted, Week of 16 November, Accomplishments text, no page or console error from the app (screens in shots/iter3-admin-report-5.*).
- Restored the fixture: POST /reports/5/decision reopen, 200, eviewStatus is pending again (no email on reopen). Services still running: API :5000, worker, next dev :3000. No code changed.
