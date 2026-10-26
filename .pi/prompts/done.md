Close the task ID I give after this command, in the builder session.

1. Confirm `BOARD.md` shows Spec, Build, Validate and Review as pass and the review has no open blockers. If not, STOP and say what is missing.
2. Confirm `spec/openapi.yaml` and the README reflect anything that changed.
3. Commit in the skill's format (`.pi/skills/commit/SKILL.md`): `<CATEGORY>: Short description. First word capitalized`,
   3-6 bullets, last bullet `* Task: <ID>`, and `<ID>` in brackets at the end of the subject so `/done` and
   `git log --oneline` can scan for it.
4. Set the Done column to pass and add the commit hash to Notes.
5. Report in three lines: what shipped, what is deferred to "Later", and the next task ID from the board. Do not start it.
