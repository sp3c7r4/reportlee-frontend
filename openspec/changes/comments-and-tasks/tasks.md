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

## Validation, step 1

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 132 pass, 0 fail (was 107) |
| Red first | `scripts/tasks.test.ts` and `scripts/discussion.test.ts` before their modules | `ERR_MODULE_NOT_FOUND`, then real assertion failures on a message and on the sample data |
| Build | `npm run build` | compiled in 5.9s, 22/22 pages, `/dashboard/tasks` added |
| Lint | `npx biome check` on the touched files | clean |
| Motion | no framer module in either tree | none |

Browser, dark, 1440:

- Admin on `/dashboard/tasks` sees Assigned by me and Everyone and is never offered Assigned to me; a card in someone else's hands cannot be dragged and its Move to buttons are disabled with a reason.
- Staff in Arthurite sees Assigned to me with three cards, Move to on each, and "Show 1 older (Done keeps 14 days)".
- Drag from Doing to To do: the target column highlights, the card lands there, the counts go To do 1, Doing 0, and the notice reads "Moved to To do."
- Drag into Done opens the completion dialog; a note typed there is kept and shown on the card.
- On `rpt_rejected` the Discussion section shows the reviewer's thread with the author's reply, a composer and "2 follow-up tasks on this Report".

## Drag and drop, revised 2026-10-26

The first build used native HTML5 drag. It refused in a real browser: the card lifted and the drop did nothing,
with no way to tell a person why. It is replaced by pointer dragging, which is what the person was actually
doing:

- `pointerdown` on a card starts the drag only where the move is allowed, and only for a pointer that is not
  touch, so a finger still scrolls the page and the Move to menu remains the phone's way to move a card.
- The card follows with two GSAP `quickTo` tweens, so the movement is smooth rather than stepping.
- The column under the pointer is found with `elementFromPoint`, and it highlights while the card is over it.
- On release the card settles back into place with one GSAP tween; a drop into Done opens the completion
  dialog instead of moving.
- Listeners live on `window`, so the drag survives the pointer leaving the card.

Measured with a pointer sequence in the browser at 1440 as Staff: the card moved from Doing to To do, the
target column highlighted, the notice read "Moved to To do.", and the card's transform was cleared after the
settle.

## Still open in this change

- Drag has no touch story: on a phone the Move to menu is the only way to move a card, which the spec already requires.
- The board reads and writes one device-local key (`reportlee.tasks`), and the Report page reads the same key, so a task raised on a Report appears on the board only after a reload of that page list.

### Why the highlight flickered, 2026-10-26

Three faults, all in the hit test:

- The dragged card travelled under the cursor and answered `elementFromPoint`, so the column under the pointer
  was always the one the card came from. Its own column lit up, the card caught up, the pointer moved, and the
  highlight flickered between columns. The card is now `pointer-events: none` while it is lifted.
- The card's own column was treated as a valid target, which reads as a refusal. It is now never a target and
  never highlighted.
- A leftover completion dialog covered the board, and because it is a modal it blocked every hit test under it,
  so nothing highlighted and nothing dropped. Closing it restored the board.

Measured after the fix, as Staff at 1440: hovering its own column shows no highlight, hovering Doing shows it,
and a release there writes `task_1` as `doing` with "Moved to Doing."
