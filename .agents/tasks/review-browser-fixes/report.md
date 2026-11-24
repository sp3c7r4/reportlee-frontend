# Report: review-browser-fixes (iteration 1)

Nothing needed from you except the click-through below. All 5 items now work in a headless browser as each role.

## Per item

| # | Root cause (one line) | Fix | Test |
|---|---|---|---|
| 1 Staff cannot write or submit | The editor set its own HTML back on every keystroke, and ProseMirror drops a trailing space, so no space could be typed and the 50 character minimum was never reached. Also: next dev served a stale 404 for `/dashboard/reports/new`, and dev-member landed in workspace 1 as an Admin. | `src/lib/editor-sync.ts` records what the editor emitted. `rich-text-section.tsx` replaces content only for a value from outside. `.next` cleared and next dev restarted. dev-member's last workspace set to 8. | `scripts/editor-sync.test.ts`, 4 tests (3 red, then green) |
| 2 Staff cannot move a task | A press on "Move to ..." or "Show report" started a card drag, which captured the pointer and turned off hit testing, so the click never fired (assignee only). | `startsDrag` in `src/lib/tasks.ts` skips presses that begin on a control (`CARD_CONTROLS`), and `task-board.tsx` uses it. The card body still drags. | `scripts/task-board.test.ts`: "a mouse press on a card's button or link does not start a drag" (red, then green), plus 2 guard tests |
| 3 Staff cannot see assigned tasks | Data state: dev-member landed in workspace 1, where they are Admin (no "Assigned to me" exists), and their only task in workspace 8 was done. | Last workspace set to 8, and To do and Doing tasks now exist. An Admin's empty board now says "You are an Admin in this Workspace, so no task is assigned to you here. Tasks assigned to you are in Live Check. Switch Workspace to see them." | `scripts/task-board.test.ts`: "an Admin who is Staff in another Workspace is told where their tasks are" (red, then green), plus 2 guard tests |
| 4 Admin gets an error opening a report | Stale next dev: routes under `/dashboard/reports/` answered the Next 404 while the files exist. The API answered 200. | Stopped next dev, deleted `.next`, restarted `npm run dev`. No code defect. | No unit test can catch a stale dev cache. The evidence is HTTP 404 before the restart and 200 after, plus the browser opening reports 4 and 5. See "Not covered". |
| 5 Admin cannot assign tasks | Item 4 blocked the only way in (a comment on a report, D14), and the empty Tasks board never said how a task is made. | After item 4, the path works end to end. The empty "Assigned by me" and "Everyone" boards now say "To assign a task, open a report and add a follow-up from a comment." with an "Open Review" link. | `scripts/task-board.test.ts`: Admin and Head hint tests (red, then green), Staff no-hint, overdue and no-dash guards |

## Commits

- Frontend `15b4443` on feat/review: "fix: keep typed spaces in report sections, let task card buttons click and explain empty Admin boards".
- Backend: no commit (not changed).
- Nothing pushed or merged.

## Test results

- Red: 14 new tests, 7 fail on the right assertion. Green: 32 of 32 (new suites plus `tasks.test.ts`).
- biome on the 6 touched files: 0 diagnostics. No em or en dashes.
- `npx tsc --noEmit`: exit 0, 165s.
- `npm test`: 370 of 370 pass, 334s.
- `npm run build`: exit 0, 222s.
- Details in verification.md.

## Click-through for the owner (http://localhost:3000)

Staff, dev-member@example.com:
1. Sign in. You land in "Live Check", and the sidebar says "Staff, Ops".
2. Click "Submit report". Type a sentence with spaces in Accomplishments. The spaces stay and "Saved just now" shows. Write 50 or more characters, then click "Submit report". Home says "Submitted. Your reviewer sees it in Review."
3. Click "Tasks". "Assigned to me" lists "Add intake numbers", "Add the Q4 figures" (two of them, one in Doing).
4. On a To do card, click "Move to Doing". The card moves and "Moved to Doing." shows. Drag a card body to another column. It moves too.

Admin, dev-admin@example.com:
5. Sign in. You land in "Live Check". Click "Tasks", then "Show report" on any card. The report page opens with Discussion.
6. Write a comment, click "Add a follow-up task", set a due date, then click "Post comment and raise task". The page says "Comment posted and the follow-up task is on the board." Click "Tasks" to see it under To do.
7. Optional: switch to "Arthurite Integrated" and open Tasks. The empty board now says how to assign a task.

## Not covered or worth knowing

- Item 4 has no automated test. A stale `.next` cache is not a code path. If a screen shows the bare Next 404 again, stop next dev, delete `.next` and start `npm run dev`.
- The report page still says "Decisions arrive with review. Nothing here changes this Report." for an Admin. Decisions live in Review. I did not change this: it is outside these 5 items.
- dev-member still holds Admin memberships in workspaces 1, 3 and 5 (live-check leftovers). I left them in place, and only the landing workspace changed.
- After the PC restart, Docker was down. I started `app-db`, `app-cache`, the API, the worker and next dev. All are still running.

## Iteration 2 (review round 1)
Verdict was APPROVED with 3 non-blocking findings. Handled: Backlog line added to docs/ROADMAP.md (browser-level test for card clicks and typed spaces); item 4 and items 1 to 3 re-verified in the browser, results in verification.md; the timed-out host was cdn.fontshare.com (font CDN). No code changed.

## Iteration 3
Finding 3 closed: an approved report (5) was opened as dev-admin in the browser and rendered. Report 5 was reopened afterwards, so it is pending again. No code changed. One decision email was queued to dev-member@example.com.
