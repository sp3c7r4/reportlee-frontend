# Reportlee Workspace

Reportlee (package name `iroyin`) is a weekly reporting platform for organisations: staff write structured reports
(accomplishments, challenges, next week), reviewers approve or request changes, admins manage departments and members,
and an AI assistant helps draft and query reports.

This file sits at the workspace root. There is **one repo today**, the frontend. The backend repo is planned but not
created yet, so a task that needs it stops and asks first:

| Repo | Folder | Stack |
|---|---|---|
| Frontend | `reportlee-frontend/` | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, shadcn/ui (`@base-ui/react`), `@hugeicons/react`, GSAP, Tiptap |
| Backend | `reportlee-backend/` (does not exist yet) | Planned: Hono, TypeScript strict, Drizzle ORM, Postgres, mounted at `/api/v1` |

Run git, npm and npx **inside the repo folder** (`cd reportlee-frontend && ...`), never from the root. Each repo gets its
own commits.

## Source of truth (read before any task)

There is no backend, so there is no API contract and no schema yet. In order of authority:

1. **The frontend code is the truth.** Screens under `src/app/`, plain logic in `src/lib/`, and the shapes in `src/data/`.
   Never guess a field name: read it.
2. **`src/lib/auth.ts` is the written API contract for auth.** Each call documents its endpoint path and request body,
   and `SIMULATED_AUTH = true` routes it to `src/lib/auth-simulator.ts` so the app runs with nothing on port 5000. When
   the backend lands, wiring it is that flag plus those already-written paths.
3. **`src/data/*.ts` is mock data, not a source of truth for behaviour.** `src/data/members.ts` is generated; do not
   hand-edit it (see Known debt: the generator is missing).
4. `reportlee-frontend/docs/ROADMAP.md`: live status (Done, In Progress, Backlog). It exists and is the only board; keep it
   up to date. It is the only board.
5. `reportlee-frontend/openspec/`: **the only home for specs and plans.** Every task is an OpenSpec change under
   `openspec/changes/<change-name>/` with a proposal, a spec delta, a design and tasks. Read the changes near your area
   first: they record decisions already taken, and `openspec/changes/archive/` keeps the finished ones. There is no
   second spec location and no `docs/superpowers/`.
6. There is no product doc yet. If the product behaviour is unclear, STOP and ask rather than inferring it from a mock
   array.

If two documents disagree, or a document disagrees with the code, STOP and ask. Never resolve it silently.

## The pipeline: Spec -> Build -> Validate -> Review -> Done

Every task passes five gates in order. Do not skip a gate. Do not mark a task Done without evidence. Work on ONE task at
a time. A task's name is its OpenSpec change name, kebab-case: `dashboard-shell`, not `2026-10-26-dashboard-shell`.

### Gate 0: Grill (only for architectural or ambiguous work)
For a schema change, an auth or permission flow, a new paid feature, or the first task that needs a backend endpoint,
do not jump to a spec. Read the code first, then send me: findings that change the plan, a design skeleton, the defaults
you will take unless I object, and the questions you cannot answer from the code. One question at a time. Anything you
can answer from the code, you answer yourself. Look for the single choke point that enforces a rule (usually one service
method) and put the guard there.

### Gate 1: Spec
- Specs and plans are OpenSpec and nothing else. Do not use the superpowers spec, plan or ticket skills (`/to-spec`,
  `/to-tickets`, `writing-plans`) in this repo, and never create `docs/superpowers/`. If a task looks like it needs a
  document, it needs an OpenSpec artifact.
- Start with `openspec new change <change-name>`. The change holds four artifacts, and `openspec instructions
  <artifact> --change <change-name>` is the authoritative shape for each:
  - `proposal.md`: why, what changes, the capabilities it touches, and the impact.
  - `specs/<capability>/spec.md`: the behaviour contract. `### Requirement:` with WHEN/THEN scenarios, one capability
    per file, and a `## Purpose` for a capability that is new. Behaviour only, never implementation.
  - `design.md`: the Decisions table (D1, D2...), Backend, Data, Frontend, the rejected alternatives, the order of
    work, and the acceptance checks (AC1, AC2...). While there is no backend, say "no backend change" in the Backend
    and Data sections instead of dropping them.
  - `tasks.md`: one testable step per ticket, each marked BE or FE. While there is no backend, every ticket is FE.
- **Backend section of `design.md`, per endpoint:** method and path, guards (`jwt.validateToken`, role guard, ownership check), request
  schema, every response and error status, and the exact JSON the frontend receives.
- **Data section of `design.md`:** every table, column, enum value and index touched, and the migration file name.
- **Frontend section of `design.md`:** screens and states, the exact API calls, every response the UI handles including errors, empty
  and loading states, and the mirrored types that change.
- **Order of work:** migration, then backend, then frontend. Backend changes must be **backward compatible** (additive:
  new nullable columns, new fields, new endpoints) because the two apps deploy separately and the backend goes first.
  If a change cannot be additive, say so in the spec and stop for approval.
- Run `openspec validate <change-name> --strict` and paste the result. A change is not ready for approval until it
  validates. A change with no spec delta is rejected unless its `.openspec.yaml` sets `skip_specs: true`.
- STOP for my approval if: a migration is needed, an existing response shape changes, the task touches auth, tokens,
  permissions or money, it adds a dependency, or a UX or product question is open.

### Gate 2: Build (tests first where logic exists)
- Follow `tasks.md` in order. Finish and validate the backend step before starting the frontend step that depends on it.
- **Backend:** Vitest against a **real test Postgres, not a mock**, with `tests/setup.ts`. Run only the suites
  covering the files you touched while iterating (`npx vitest run <files>`), and leave the full `npm test` for the
  final Gate 3 (see Test scope under Gate 3). Test the service and the HTTP route: the guard fires, the wrong role
  gets 403, another user's data gets 403 or 404, a bad body gets a field error, the happy path returns the documented
  shape.
- **Frontend:** `npm test` is `node --test scripts/*.test.ts` (built in, no dependency). Put logic in plain functions in
  `src/lib/` (no React, no hooks) and add a `scripts/<name>.test.ts` beside it. Note the `scripts/` folder is missing
  today, so create it. Do not add a test framework without my approval.
- Write tests from the acceptance checks, not the implementation. Show them failing for the right reason (red), then
  green, then refactor. Never assert a value the code just produced as a whole. NEVER skip, weaken or delete a test to
  get green.
- Test data is fake: `@example.com`, made-up names. Never a real address, token, password or provider live key.

### Gate 3: Validate (evidence required)
Run these and paste the results into the change: a "## Validation" section at the end of `tasks.md`.

**Rules (binding):** chain the commands so the chain stops at the first failure (`&&`, never `;`). Print each step's
name and duration. If one step runs past **3 minutes**, stop and say which. After a docs-only change (`docs/`, `openspec/`,
`AGENTS.md`) do not run lint, tests or build.

**Test scope (binding):** while iterating — every Build step, every red/green cycle — run **only the suites covering
the files you touched**: `npx vitest run tests/<file>.test.ts ...`, or `npx vitest run --changed` when you have not
listed them. The full backend suite is a final-Gate-3 step, not a build step. **Do not change `vitest.config.ts`** to
buy speed: `fileParallelism: false` is set there, and where the time actually goes is the per-file setup, not the
tests — the 2026-09-29 full run spent 252s in setup against 14s in tests. Tuning that config to make iteration faster
is the kind of churn that hides a real failure. If targeted runs are still slow, say so and propose a change rather
than making one.

**Backend (`cd reportlee-backend`), when it changed** (nothing here applies until that repo exists):
1. `npx biome check <touched files>`: no new diagnostics. The backlog is large (513 errors, 31 warnings on 2026-09-29),
   so compare, do not chase zero. **Never run `npm run biome:lint` or `npm run biome:format`**: both pass `--write` and
   rewrite files. Use `npx biome check --write <touched files>` on files you touched only.
2. `npx tsc --noEmit` (there is no `typecheck` script): no new type errors.
3. `npm run check:circular`: no new cycle.
4. `npx vitest run <touched test files>`: the suites covering what you changed, nothing more. This is the step you
   rerun on every build iteration, and the one that carries the red/green evidence for each step of the plan.
5. **At the final Gate 3 only, once:** `npm test` (the whole suite), then `npm run build`. Print the duration beside
   the result. Report the pass/fail counts without filtering out pre-existing failures, and prove a pre-existing
   failure reproduces on the base commit with a stash before blaming your change.

**Frontend (`cd reportlee-frontend`), when it changed:**
1. `npx biome check <touched files>`: no new diagnostics. Backlog: 128 errors, 5 warnings on 2026-10-23. **Do not run
   `npm run format`**: it is `biome format --write` on the whole repo. Use `npx biome format --write <touched files>`.
2. `npx tsc --noEmit` (or `npm run typecheck`): no new type errors.
3. `npm run build`: a production build must succeed.

**Together, against the local stack:** there is no local stack yet (no backend, no database, nothing on
`localhost:5000`). Until it exists:
4. Manual browser pass over every screen changed, as each role affected (admin, staff). Record what you clicked and saw,
   including failure cases (an empty list, a form error, a guarded route while logged out).
5. Read the browser console and network tab for those requests: no stack traces, no errors, no personal data, no request
   to a host other than the Reportlee API, the font CDN and the image host configured in `next.config.ts`.
6. Confirm no new dependency slipped in without being named in the spec.

If a step fails: fix, then rerun ALL steps. Then STOP and report. Review happens in a fresh context.

### Gate 4: Review (fresh eyes)
See the review policy below. The reviewer reads the OpenSpec change (proposal, spec delta, design, tasks), both diffs,
the tests and the Validation section. It does not edit code. Blockers go back to the builder and through Gate 3 again. Minor findings go to `ROADMAP.md` under Backlog.

### Gate 5: Done
A task is Done only when: every gate passed with evidence, the review has no open blockers, and `ROADMAP.md` has the row
(date, feature, "Verified by", for example `tsc + API + browser`). Commit only when I ask, one commit per repo, in the
style of that repo's `git log`. Then STOP. Do not start the next task until I say so.

## Hard rules (safety)

The backend items here (deploy scripts, migrations, seed scripts) are rules for the repo once `reportlee-backend/`
exists; they are not facts about the workspace today.

- **Local and staging only.** Never run anything against production: no migrations, no scripts, no requests with
  production credentials, no build pointed at the production API. Deploys go through CI and `scripts/*-deploy.sh`; do not
  run or edit them, or `docker-compose.prod.yml`, without approval. The frontend reads the API base from
  `NEXT_PUBLIC_API_URL` only: do not add a second constant or hardcode a host.
- **NEVER read or print secrets**: `.env*` (backend loads them with dotenvx), JWT keys, storage and mail credentials,
  AI provider keys, tokens, passwords. Check configuration with a command that prints a
  *name* or yes/no only, or ask me. If you print a secret by mistake: say so in your next message, name the file, tell me
  to rotate it, and do not repeat the value.
- **Destructive database scripts.** `npm run migrate:rebuild` and `scripts/rebuild-db.ts` run `DROP SCHEMA public
  CASCADE`. Their only guard is `NODE_ENV === "production"`, so **they will wipe a staging database**. Never run them
  without my approval. Before any migration, seed or rebuild, print `NODE_ENV` and confirm the database is local.
  `scripts/seed-dev.ts` holds committed dev credentials: dev only.
- **Migrations are forward-only SQL** in `reportlee-backend/src/db/migrations/`, numbered after the highest file,
  written by hand: idempotent (`IF NOT EXISTS`), statements split with
  `--> statement-breakpoint`. The runner (`app/migrate.ts`) records each file by the **hash of its contents**, so
  **editing an applied migration makes it run again**. Never edit one; add a new one. The Drizzle journal stops at 0004
  and `0004` exists twice, so do not trust `npm run migrate:create`: write the SQL yourself and update the `*.model.ts`
  in the same change. An enum value added by `ADD VALUE` cannot be used in the same transaction.
- **Money.** There are no payments, fees or payouts in this product. Adding one stops the task: it needs my approval and a
  fresh-context review before any code.
- **Auth is simulated.** `SIMULATED_AUTH = true` routes every auth call to `src/lib/auth-simulator.ts` and the session
  lives in a cookie via `src/lib/cookies.ts` / `src/lib/session.ts`. That is a prototype, not a security boundary: do not
  describe it as real auth, do not treat the cookie as an identity check, and tell me before changing any of it.
- **The server decides access.** Hiding a button is not a rule. Role and ownership checks belong in the backend service
  that writes the data. Every new route states its guard: `jwt.validateToken`, a role guard, then an ownership check. A
  rule only the UI enforces is a bug in the spec.
- **Tokens.** No token exists yet. When one does: in memory only, never logged, never in a URL, never persisted, never
  pasted into a spec or test. Auth changes need my approval.
- **Untrusted text.** Report text, member names, comment bodies, uploaded files and all AI output are untrusted. Render
  HTML only through a sanitizing path; never `dangerouslySetInnerHTML` on raw input. The backend does not assume the
  frontend sanitized. AI prompts, tool input and model output are untrusted; guardrails and keys stay in the backend.
- **Logs.** Never log passwords, OTPs, tokens or personal data.
- **No new dependency without saying why**, in the spec, before adding it. shadcn components are copied in, so adding
  one is a code change, not a dependency: say that too (`npx shadcn@latest add <name>`).
- Never copy real-looking emails or any password from a seed script, a mock array or a README into anything new.
- Stay in scope. Unrelated problems go in `ROADMAP.md` under Backlog.
- Fail the same step twice -> STOP and report, do not try a third variation.
- Never claim something works without showing the command and its result, or the screen and what you saw on it.

## Conventions

### Both repos
- Comments use the existing `/* @info - ... */` style and explain why, not what.
- TypeScript strict, no `any` without a written reason, no `!` where a check reads better.
- The response envelope is `{ timestamp, status, success, data | error }`.
- **Types are mirrored by hand** between repos once the backend exists. When a DTO changes, change both sides in the
  same task and list the files in the spec. Domain types already live in more than one place (`src/data/reports.ts` for
  `Report` and `ReportStatus`, `src/lib/reports.ts` for list and action types, `src/data/auth.ts` for `UserRole` and
  `CurrentUser`): search for an existing type name before adding one, and update every copy.

### Backend (`reportlee-backend`)
- **Module layout:** `src/modules/<name>/` with `<name>.model.ts` (Drizzle; picked up by `drizzle.config.ts` via the
  `*.model.ts` glob), `.repository.ts`, `.service.ts`, `.controller.ts`, `.routes.ts`, `.schema.ts` (Zod), `.message.ts`
  (user-facing strings), `index.ts`. Register the router in `src/routes/router.ts` and copy the nearest existing module.
- **Flow:** route -> Zod (`ZodEngine.validate.body`) -> thin controller -> service -> repository. Singletons with
  `getInstance()`.
- **Repositories** extend `RelationalRepository` (soft delete via `deletedAt`, raw DB errors become a generic 500). Use
  `includeDeleted` deliberately.
- **Errors:** `throwBadRequestError`, `throwNotFoundError`, `throwForbiddenError` and friends from
  `@/helpers/errors/throw-errors`, with a string from `.message.ts`. Never leak SQL or stack traces.
- **Route order:** specific paths before `:param` paths.
- **Background work:** BullMQ queue and worker (`app/init.workers.ts`); emails and slow work never run inline in a request.
- **Redis:** sessions and refresh tokens. Pub/sub channels use `REDIS_CHANNEL_PREFIX`.
- Env vars: add to `EnvSchema` in `src/config/env.ts`, read through `config`, never `process.env` in a module.
- Path alias `@/` = `src/`. Biome: **tabs**, double quotes, `noUnusedImports` is an error.

### Frontend (`reportlee-frontend`)
- **Layout:** `src/app/` (routes; `(auth)/` is the logged-out group, `dashboard/` is the app, `onboarding/` is the setup
  flow), `src/lib/` (plain logic and the fetch calls), `src/data/` (typed mock records), `src/components/` (shadcn in
  `ui/`, ours in `<feature>/`). No barrel files, PascalCase component files, named exports.
- **HTTP:** there is no API client and no `src/services/api/` yet. Calls live in `src/lib/` (`auth.ts` and friends), read
  the base from `NEXT_PUBLIC_API_URL`, and answer from a `simulate*` function while `SIMULATED_AUTH` is true. Do not call
  `fetch` from a component, and keep both branches of a call returning the same shape.
- **Errors:** render every failure where the user can act on it: field errors next to the field, a message otherwise.
  Auth calls already return `{ ok: true } | { ok: false, message }`; keep that shape.
- **Roles:** `UserRole` is `"admin" | "staff"` (`src/data/auth.ts`). There is no middleware and no route guard:
  `dashboard/layout.tsx` reads `CURRENT_USER` straight from `src/data/auth.ts`, so every dashboard route is reachable.
  Never pass that off as access control, and never read a role from a query param. The real check lands with the backend.
- **UI:** reuse `src/components/ui/` first. Icons are `@hugeicons/react`, not lucide. Tailwind utilities for layout.
  Use the `impeccable` skill for design work. Empty, loading and error states ship with the screen.
- Biome: 2-space indent, double quotes. Next 16, React 19, Tailwind 4 and Turbopack differ from older docs: read the
  guides in `node_modules/next/dist/docs/` before using an API from memory.

## Known debt (do not fix unless asked; add to Backlog if you hit it)

- Both lint backlogs above.
- `npm run seed` points at `scripts/gen-seed.mjs`, which does not exist. `npm test` runs the one suite in `scripts/`.
- `npm test` and `npm run seed` are the only wired checks; there is no e2e script.
- The README is still the unedited `create-next-app` one.
- No product doc. Specs and plans are OpenSpec changes, and `openspec/changes/` is the only record.

## Communication style

The reader has ADHD, and long reports are hard to read. Output is not just brief, it is shaped
so it can be acted on. These rules apply to every response for the rest of the session, not only
this one. They do not expire after a few turns and they do not lapse when the topic changes. If
unsure whether they still apply, they do. Turn them off only when I say "stop adhd mode" or
"normal mode" - confirm in one line, then return to default style.

**What drives these rules:**
1. Working memory is small. Anything not on screen is forgotten. Don't ask me to "keep in mind X" -
   restate the needed state at the top of the message instead.
2. Knowing the answer is not doing the answer. The friction between "got it" and "done it" is
   where work dies, so end on something immediately doable, not a summary.
3. Starting is the hardest step. The first action must be obvious, small, and doable now.
4. Time estimates feel uniform - "a bit of work" and "a few hours" register the same. Give
   specific numbers (minutes used, minutes left, cap remaining), not vague ones.
5. Dopamine is scarce; buried wins don't register. State what now works, plainly, when something
   passes or ships.

**Message shape:**
1. **First line: what I need to do.** One plain sentence. Example: "I need one answer: option A
   or B?" If I need to do nothing, say "Nothing needed from you."
2. **One question at a time.** If you have several, ask the most important one and hold the
   rest until I answer. Never send a list of five decisions.
3. **Options: one line each.** Say what the option means in practice. Then give your
   recommendation and why, in one line. Mark it "Recommended".
4. **Everything else goes under "Details:".** Evidence, command output, edge cases and
   reasoning. I read it only if I ask.
5. **Lead with the action or the result.** If the answer is a command, path, or snippet, it goes
   first. "Tests pass, 601 of 601" comes before how you got there.
6. **Explain any term I might not know** in a few words the first time you use it.
7. **Conclusions, not thinking.** No "Hmm, actually..." or self-corrections mid-message. Work it
   out first, then tell me the answer.
8. **Length limits:** an approval request is at most 10 lines above "Details:". A status update
   is at most 5.

When you stop for my approval, use exactly this shape:

    I need: <one sentence>
    Options:
    - A: <one line>
    - B: <one line>
    Recommended: <A or B>, because <one line>.

    Details:
    <everything else>

If I reply "as recommended", apply every recommendation you made.

**Cut, every time:** the first sentence if it only announces what you're about to do; the last
sentence if it's "anything else?" or a recap of what just happened; any "by the way" aside; any
hedging adverb adding no information ("perhaps," "might," "could possibly"). Keep a hedge that
carries real uncertainty - deleting a real caveat manufactures false confidence, which is worse
than the extra word.

**Long lists in the final reply:** group related items, rank the most relevant first, aim for no
more than five items per group. Retain the rest internally - don't discard them - and surface
them when I ask or when they become the next items to act on. Never omit an item when
completeness matters (a change list, a review's findings, a security check).

**What does not shrink:** the gates in this file, the hard rules, and the evidence in the plan's Validation
section stay complete. Only the chat message is short.

## Review policy

**Which review a task gets**
- **Fresh-context review (Gate 4)** is required for: auth and sessions, permissions and role guards, anything that
  touches money (payments, ledger, withdrawals), migrations and schema changes, data writes or deletes, file upload and
  storage, AI features that take user data, and any new dependency. Use thinking level `high`. Use `max` only when I ask.
- **Everything else** (types, tooling, docs, read-only screens): self-review in the same session. Write one paragraph
  saying what you checked. Use thinking level `low`.
- If you are unsure which kind a task is, treat it as fresh-context and tell me why.

**Fresh context, or not at all**
- The session that built a task must not review it when the task is in the first list above. Dispatch fresh-context
  subagents, or tell me to open a new session.
- If you cannot start a fresh context, say so plainly and stop. Do not review in-session and call it Gate 4.
- Every review report starts with its provenance: fresh context, or same session.

**How many rounds**
- Cap fresh reviews at two rounds. Run a third only if round 2 found a real code defect. Documentation drift alone does
  not justify another round. Fix it, add a test or check if it can be caught mechanically, and record what a reading
  reviewer cannot verify.

**How to set up the reviewers**
- Two lanes for small tasks: spec conformance, and test honesty (or, on the frontend, behaviour against the acceptance
  checks).
- Three lanes when the task touches auth, permissions, money or the schema. The third lane runs commands, so it needs a
  shell.
- Give each reviewer a short brief: the 5 things that matter for this task, the files to read, the edit boundary
  (read-only), and the output format: verdict PASS or CHANGES REQUESTED, then findings with severity, file and line, why
  it matters, and a suggested fix.
- Do not edit any file while reviewers are reading the tree.

**What a self-review must include**
- The acceptance checks from the spec, each marked met or not met, with the evidence.
- Whether any doc or comment now claims something the code does not do.
- Whether any test would still pass if the behaviour it guards were broken.

## Defaults (apply without asking)

- Follow the nearest existing module (backend) or screen and spec (frontend) for structure, naming and error handling.
- The existing Biome and tsconfig setups. No config churn inside a feature task.
- Additive, idempotent migrations. New nullable columns over new required ones.
- Soft delete through `RelationalRepository`, unless the spec says otherwise.
- shadcn/ui and `src/components/ui/` first; Tailwind utilities for layout.
- Messages in the module's `.message.ts`, not inline strings.
- Fake data in tests and scripts.
- Empty, loading and error states in the same task as the screen.
- A guard decision (auth, role, ownership) written into the spec for every new route.

## Still stops me (never defaulted)

- Any migration, or any change to an existing response shape the other repo already reads.
- Anything touching auth or sessions (`src/lib/auth.ts`, `src/lib/auth-simulator.ts`, `src/lib/session.ts`,
  `src/lib/cookies.ts`, `src/lib/otp.ts`), permissions, payments or the ledger.
- Running `migrate:rebuild`, `rebuild-db.ts`, a seed script, or a migration against anything but the local database.
- Pointing anything at production, or editing deploy scripts, workflows or `docker-compose.prod.yml`.
- A new dependency (including a frontend test runner), a paid service, or a new external provider.
- Changing a provider switch (payout kill switch, AI provider, mail provider).
- A change that cannot be backward compatible across the two separate deploys.
- Money shown or computed in a way the API does not already provide.
- A second in-flight session or branch touching the same file.
- Anything ambiguous about which role a screen or endpoint is for, or what an admin or staff member may see.

## Autopilot mode (when I say "autopilot")

- Do not stop between tasks, and do not ask for approval on anything already approved in the spec. Take the recommended default on a new question and list the choice in the final report.
- Commit after each task on its feature branch. Local merges between my local branches are allowed. Never push, never deploy.
- While building, run only the tests for the files you touched. Run the full suite once at the end of a plan.
- Stop only for: production, secrets, destructive database scripts, payments/ledger/withdrawals, a new dependency, push or deploy, or a step that fails twice.
- Send one report per plan: what works with evidence, choices made, risks, branches ready to merge.
- This section overrides any "STOP" or "ask for approval" elsewhere in this file, except the hard stops listed here.

## No em dashes in anything a user can see
- Never write an em dash (the long dash, U+2014) in text a user will see. That covers page copy, buttons, labels, placeholders, toasts, error and empty states, tooltips, page titles and meta descriptions, emails and notifications, PDF or certificate text, and the backend's user-facing strings (`*.message.ts`) that the frontend shows.
- If a sentence wants an em dash, rewrite it. Use a period, a comma, a colon, or brackets. Do not swap it for " - " or an en dash (U+2013). Reword the sentence instead.
- For an empty value in a table or a stat (nothing to show), use a plain word like "None" or "Not set", or leave the cell blank. Never a dash character.
- This applies to every string you add or touch. Do not go through old code hunting for em dashes unless I ask. If you see existing ones in files you did not touch, add one Backlog line saying where.
- Code comments and docs are not user-facing, but keep using the existing `/* @info - ... */` style with a plain hyphen.
- Check before reporting done. Search only the files you touched, and paste the result:
  `rg -n "[\u2014\u2013]" <touched files>`
  Any hit in a user-facing string is a fix before Gate 3 passes. A hit in a comment or a test name is fine.
- Text that comes from the database or from users (report titles, member names, comments) is not yours to edit.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
