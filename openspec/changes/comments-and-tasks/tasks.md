## 1. Rules and tests (FE)

- [ ] 1.1 `scripts/tasks.test.ts` red: views per role; only the assignee in "Assigned to me" may move; moving
      to Done records a completion time; moving out of Done clears time and note; the phone move list excludes
      the current column.
- [ ] 1.2 `scripts/discussion.test.ts` red: a reviewer may start a thread and the author may not; an author
      may reply; an empty body is refused; a task attaches to a comment and reaches the board.
- [ ] 1.3 `src/lib/tasks.ts` and `src/lib/discussion.ts` to green.

## 2. Discussion on the Report page (FE)

- [ ] 2.1 Thread list, composer for reviewers, reply box for the author, escaped text with line breaks.
- [ ] 2.2 A comment with a follow-up task shows the task; the side panel lists open tasks linking to the
      board.
- [ ] 2.3 Loading, error with Retry, empty invitation, disabled submit in flight, failed post keeps the text.

## 3. The board (FE)

- [ ] 3.1 `/dashboard/tasks`: view switcher from the role, three columns, cards with due date and origin.
- [ ] 3.2 Drag in "Assigned to me" only; the completion dialog offers note and file; leaving Done clears both.
- [ ] 3.3 Below md, a "Move to" menu per card that works from the keyboard.
- [ ] 3.4 Loading, error with Retry, empty per column and per view; cards at 390 with 44px targets.

## 4. Validation (FE)

- [ ] 4.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 4.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 4.3 Browser pass as Staff, Head and Admin, 1440 and 390, both themes: each view, a move by drag, a move
      by menu, completion with and without a note, the discussion as both author and reviewer, keyboard only.
- [ ] 4.4 Console and network clean; em dash scan; ROADMAP row; `openspec validate --all --strict`.

## 5. From review

- [ ] 5.1 Move to menu at every width; drag stays as the addition.
- [ ] 5.2 Board filters for Space, assignee, assigner and Overdue, kept in the address.
- [ ] 5.3 Done limited to 14 days with Show older, and the limit stated.
- [ ] 5.4 Task moves appended to the Report timeline as task events.
- [ ] 5.5 Leaving Done clears the completion note, file and time.
- [ ] 5.6 Due date required, not in the past, entered in the Workspace's timezone.
- [ ] 5.7 Read-only Workspace blocks comments and moves with the reason.
- [ ] 5.8 Deactivated assignee flagged with Reassign for an Admin.
- [ ] 5.9 Comment attachments as metadata, and "links are always text" replaces the old composer line.
