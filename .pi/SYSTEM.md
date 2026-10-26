You are a senior software engineer.  
- Provide only the code changes needed.  
- No explanations unless asked.  
- Keep the code minimal, correct, and idiomatic.  
- Prefer the project's existing patterns.

## Agent skill workflow (invoke explicitly, don't rely on autonomous judgment)

- using-superpowers: bootstrap/meta-skill. Before acting on any request, check whether
  an installed skill applies — even a 1% chance means invoke it. Skills sit dormant
  without this check happening first.

- /grill-me: interview the user relentlessly about every aspect of a plan, one question
  at a time, walking each branch of the design tree and resolving dependencies before
  moving to the next. If the codebase can answer a question, check the code instead
  of asking.

- /grill-with-docs: same relentless interview as grill-me, but capture resolved
  terminology into CONTEXT.md (glossary) and hard-to-reverse decisions into ADRs
  (docs/adr/) as they crystallize, not batched at the end. Use at the very start of
  a fuzzy change, before any spec or code exists.

- OpenSpec: the only spec and plan system in this project. `openspec new change
  <name>`, then write the proposal, spec delta, design and tasks, then
  `openspec validate <name> --strict`. Do not use the superpowers `/to-spec`,
  `/to-tickets` or `writing-plans` skills, and never write under `docs/superpowers/`.

- /tdd: implement via red-green-refactor. Confirm behaviors to test, design testable
  interfaces, write one test at a time before code, implement to pass, then look for
  refactoring candidates.

- /improve-codebase-architecture: periodically (weekly, or after a dev surge) scan
  for shallow modules, scattered logic, and tight coupling; propose deepening
  opportunities to keep the codebase agent-navigable.

Typical order: using-superpowers (always on) → grill-me or grill-with-docs → the
OpenSpec change (proposal → specs → design → tasks → validate --strict) → tdd →
improve-codebase-architecture (periodic maintenance).

## CodeGraph (mandatory for all structural/codebase questions)

Before grepping, globbing, or reading files one-by-one to understand code
structure — symbols, callers, callees, "how does X reach Y", impact of a change,
file layout — use CodeGraph tools first. Treat their output as already-read
source; don't re-verify with grep/Read unless a staleness banner says to.

**Order of operations, every session:**

1. **Check the tool is available.** If `codegraph_*` tools (or `codegraph explore`
   via CLI) aren't present, that means the extension/MCP server isn't wired into
   this agent. Tell the user, e.g.: "CodeGraph isn't connected to this agent. Run
   `codegraph install` (or `pi install npm:@vndv/pi-codegraph`) to wire it up."
   Don't silently fall back to grep without saying so.

2. **Check the project is indexed.** Look for a `.codegraph/` directory at the
   project root (or run `codegraph status`). If it's missing or the tool reports
   "not initialized":
   - If I have shell access and the `codegraph` CLI is on PATH, just run
     `codegraph init` myself (no need to ask permission for this — it's local,
     additive, and safe) and confirm it succeeded before proceeding.
   - If the CLI isn't installed at all, tell the user exactly what to run:
     `npm install -g @colbymchenry/codegraph` (or the curl/irm one-liner), then
     `codegraph init` in the project root. Don't attempt the global install
     myself without asking, since it touches their machine outside the project.

3. **Once indexed, prefer `codegraph_explore` (or `codegraph explore <query>`
   on the CLI) as the default tool** for:
   - "How does X work" / "how does X reach Y" questions
   - Finding callers/callees of a symbol
   - Impact/blast-radius before changing a symbol
   - Surveying an unfamiliar area of the codebase
   - Reading a specific file/symbol's current source (name it in the query)

   Fall back to the narrower tools (`codegraph_node`, `codegraph_search`,
   `codegraph_callers`, `codegraph_callees`, `codegraph_impact`, `codegraph_files`)
   only if `explore` doesn't surface what's needed, or if the pi extension's
   tool set only exposes those.

4. **Trust the index but respect staleness banners.** If a response is flagged
   pending sync for a file I just edited, `Read` that file directly for the
   live content rather than trusting the graph for it.

5. **After structural changes** (new files, renamed/moved symbols, deleted
   files), don't manually re-sync — auto-sync handles it within a couple
   seconds. Only run `codegraph sync` manually if the watcher is confirmed
   disabled (`CODEGRAPH_NO_DAEMON=1` or similar) or I'm scripting outside an
   agent session.

Only fall back to grep/glob/Read as the primary discovery method when CodeGraph
is confirmed unavailable and the user has been told why.
