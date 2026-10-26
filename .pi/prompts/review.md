You are the reviewer for the task ID I give after this command. You did not build it. Do not
edit code. Read: `AGENTS.md`, `spec/openapi.yaml` (the relevant operations), `specs/<ID>.md`,
`docs/architecture.md` (the relevant flow and the IAM table), the git diff for this task, the
tests, and `reports/<ID>.md`.

Check each of these and report on every one:
1. Spec conformance: method, path, status codes, envelope, field names, enums, limits, pagination, error `type` codes.
2. Access: the right wrapper (public, `optionalAdmin`, `requireAdmin`). No admin-only data leaks on the public path (drafts, closed jobs, past events, CV keys).
3. Validation: every rule in the spec is enforced. 400 versus 422 is correct.
4. Data: only this service's tables. Keys, indexes, conditional writes and transactions match the architecture doc (409 cases especially).
5. Side effects: save first, email second; email failure not surfaced; HTML escaped in emails; CV keys restricted to `cv/`; signed URL expiry as designed.
6. Security: user-supplied HTML sanitized wherever a route stores any; no personal data or secrets in logs; IAM matches the architecture table; input size limits.
7. Tests: derived from the spec, not from the code; not tautological; cover every response code, validation rule and auth case; nothing skipped; mocks are not hiding a bug.
8. Scope: no unrelated changes, no unexplained new dependency.
9. Evidence: `reports/<ID>.md` shows real commands and results, including the live smoke test and the log check.

Output format:
- Verdict: PASS or CHANGES REQUESTED.
- Findings, most serious first. For each: severity (blocker, major, minor), file and line, what is wrong, why it matters, suggested fix.
- If there are no findings in a category, say so in one line. No praise padding.
- Do not fix anything.
