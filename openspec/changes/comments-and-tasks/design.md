# Design: comments-and-tasks

| Area | Choice |
|---|---|
| Route | `/dashboard/tasks`, the href the nav module already uses; discussion lives on the Report page |
| Logic | `src/lib/tasks.ts` for views and moves, `src/lib/discussion.ts` for who may comment, both pure |
| Views | derived from the viewer's role by one function, so the switcher cannot invent a fourth view |
| Move | one `moveTask(task, status, viewer, note?)` used by drag, the phone menu and the completion dialog |
| Text | bodies rendered with the same escaped-text path the Report page uses |
| Completion | note and file optional; moving out of Done clears both |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | One move function for every surface | Drag, menu and dialog must not have three ideas of what a move does |
| D2 | The board is not the place to create tasks | A task starts from a review comment, so there is one origin and one conversation |
| D3 | Admins have no "Assigned to me" | An Admin authors no Reports, so a view of everybody's tasks would read as their own work |
| D4 | Cards are draggable only where the person may move them | A card that lifts and then refuses teaches the wrong rule |
| D5 | Clearing on exit from Done is deliberate | A completed date on an unfinished task is a lie the analytics would believe |

| D6 | Move to menu at every width | A drag is a shortcut for those with a pointer, not the interface |
| D7 | Done shows 14 days with Show older | A column that grows forever is a scroll nobody finishes |
| D8 | Due date is required and never in the past | A task without a date cannot be filtered as overdue |
| D9 | Task moves appear on the Report timeline | The Report is the record of what happened around it |
| D10 | Board filters live in the address | A filtered board is something a person sends to somebody else |

## Rejected

- A second, simpler task list on the Report page. The side panel already lists open tasks; a second list
  would drift from the board.
- Rich text in comments. The product has no markdown story yet, and text is what the record needs.
- Drag-only movement on phones. Dragging inside a scrolling page is the single worst gesture to require.
- A completion modal that blocks. Note and file are optional, so the move must succeed without them.

## Known ceiling

Tasks and comments live in sample data and on this device. The board's "Everyone" and "My Space" views read
the same sample set, so a large Workspace is not simulated. Moves are recorded locally and cleared on sign
out with the rest of the report state.
