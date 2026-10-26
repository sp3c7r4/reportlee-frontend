## Why

A rejected Report says what is wrong but leaves nowhere to answer. There is no discussion, and a reviewer
cannot turn a note into work. Comments and follow-up tasks are how a decision becomes a conversation, and
how a conversation becomes something that gets done.

## What Changes

- Add discussion to the Report page: a reviewer starts a thread, the author replies, nobody else comments.
- Add follow-up tasks created from a review comment, assigned to the Report's author, with a due date.
- Add `/dashboard/tasks`: a board of To do, In progress and Done with role-based views.
- Add the completion prompt (optional note and file) and the phone "Move to" menu.
- Comment and task bodies render as text, never HTML.
- No new dependency. No backend.

## Capabilities

### New Capabilities

- `report-discussion`: who may comment, what a comment carries, and how a follow-up task is created.
- `task-board`: the views per role, who may move a card, and what completing a task records.

### Modified Capabilities

None.

## Impact

- New: `src/lib/tasks.ts`, `src/components/comments/`, `src/components/tasks/`,
  `src/app/dashboard/tasks/page.tsx`, `scripts/tasks.test.ts`.
- Touched: `src/data/reports.ts` (comment and task samples), `src/lib/reports.ts` (the calls), the Report
  page for the discussion section and the open tasks in its side panel.
- No auth file, no session file, no schema.
