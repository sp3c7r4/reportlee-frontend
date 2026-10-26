Run Gates 1 to 3 of the pipeline in AGENTS.md for the task ID I give after this command.

- Gate 1 (Spec): write `specs/<ID>.md`. Stop for approval only under the conditions in AGENTS.md.
- Gate 2 (Build): tests first and show them failing, then implement, then refactor.
- Gate 3 (Validate): run every step, write `reports/<ID>.md` with the real commands and results.

Update the task's row in `BOARD.md` after each gate. When Validate passes, STOP and tell me to run
`/review <ID>` in a new session. Do not start the review yourself. Do not mark the task Done.
