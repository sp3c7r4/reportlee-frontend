# Roadmap

The only board. A row is Done only when the gate evidence exists (see `AGENTS.md`). Specs and plans are
OpenSpec changes under `openspec/changes/`; there is no other spec location.

## Done

| Date | Feature | Verified by |
|---|---|---|
| 2026-10-26 | UI-3a: signed-in frame at `/dashboard`. Role navigation from one nav module, three sample Memberships for one User, in-memory Workspace switching, sidebar with search and person row, top bar with a page-owned action slot, usage card, greyed Assistant, themed portals, drawer | `tsc` + `npm test` 21/21 + build + browser |
| 2026-10-26 | UI-3b: phone tab bar, floating card style. Five destinations per role from the nav module, Menu opening the drawer, one navigation control at every width, 56px targets, Assistant greyed on a plan with AI off | `tsc` + `npm test` 22/22 + build + browser 390/900/1024 |
| 2026-10-26 | UI-6: submit report at `/dashboard/reports/new`. Autosaving draft with a truthful save state, Tiptap sections with lists, KPI rows where a blank is "Not provided", colleagues found by a search action, browser-captured location, attachment limits and a styled picker, the blocked states, one primary action at the end of the page on a phone | `tsc` + `npm test` 38/38 + build + browser 1440/390 as three roles |
| 2026-10-26 | UI-7: My reports and the Report page. Two clocks (first seen and window start), an ordered state table, a private edit copy with Save changes and Resubmit, revisions and an Edited marker, plain-text sections, read-only and locked reasons, Starter 30 day note | `tsc` + `npm test` 54/54 + build + browser 1440/390 as three roles |
| 2026-10-26 | Notification bell: the supplied artwork, two-tone, with a red unread count capped at 99+ and a tested badge rule | `tsc` + `npm test` 58/58 + build + browser |
| 2026-10-26 | Shared records: the `Comment` shape with a decision kind, the audit log, the event stream with one review scope, and the plan gate with one retention rule | `tsc` + `npm test` 76/76 + build + browser |
| 2026-10-26 | People and setup, part 1: the members table with invitations and seats, invite rules per role, the guards with their reasons, the Spaces cards with archive, and the Admin-only setup banner | `tsc` + `npm test` 86/86 + build + browser |
| 2026-10-26 | UI-8 review queue: scoped tabs, decision dialogs with required reasons, bulk approve and the not-submitted list | `tsc` + `npm test` 107/107 + build + browser |
| 2026-10-26 | UI-9 comments and tasks: threads on a Report with a follow-up task, and the board with role views, filters, GSAP drag and drop, and a 14 day Done window | `tsc` + `npm test` 132/132 + build + browser |
| 2026-10-26 | UI-10 to UI-13: Home, notifications with preferences, Ctrl K search and analytics with a table view | `tsc` + `npm test` 166/166 + build + browser |
| 2026-10-26 | UI-14 to UI-16: settings with schedule, AI switch and exports, the Assistant, and the isolated Super Admin console | `tsc` + `npm test` 190/190 + build + browser |
| 2026-10-26 | UI-17 polish: every dashboard route and the console rendered, console clean, 200% zoom without scroll, accessible names present | browser + `tsc` + `npm test` 190/190 + build 33/33 |
| 2026-10-26 | AI drafting: plan and switch gate, no silent overwrite, output treated as text | `tsc` + `npm test` 190/190 + build |
| 2026-10-26 | Status vocabulary (`src/lib/status.ts`) with seven states, tones and per-state icons, plus the theme cookie renamed `reportlee-theme` and scoped to `*.reportlee.app` | `tsc` + `npm test` 15/15 + build + browser |
| 2026-10-26 | Three roles on the landing page: Staff, Head of Space, Workspace Admin, with Admins shown as monitors who never author | `tsc` + build + browser |
| 2026-10-26 | Department renamed to Space in code, copy and file names: `space-step.tsx`, `SPACE_LIMIT`, `?step=spaces` | `tsc` + build + browser |
| 2026-10-26 | Landing copy aligned with the docs: cadence is configurable, not weekly; the privacy, attachment and trial answers now match the ADRs; `Start a Project`, `SSO Ready`, `API Reference` and `Teams on Pro` gone | `tsc` + build + browser |
| 2026-10-26 | Brand switched from Iroyin to Reportlee: wordmark, page titles, copy, footer, workspace URL suffix | `tsc` + build + browser |
| 2026-10-26 | Dashboard removed from the app. `/dashboard` now 404s. Landing, auth and onboarding only | `tsc` + build + browser |
| 2026-10-26 | One test suite wired up (`scripts/auth-flow.test.ts`), `npm test` green, production build passes | `npm test` (5/5) + build |
| earlier | Landing page: hero, features, how it works, pricing, testimonials, FAQ, footer | browser |
| earlier | Auth screens: sign in, OTP, sign up, verify (3 flows), forgot and reset password. Simulated, no backend | browser |
| earlier | Onboarding: Workspace, Spaces, Team steps. Local state only, nothing is saved | browser |
| 2026-11-16 | workspaces-people: Workspaces, Spaces, People roster and invitations on the real API, invite page with return after login | tsc + tests + API (90/90 live HTTP checks); browser pass not done |
| 2026-11-16 | invite-daily-limit: invitations capped at 70 per Workspace and 300 for the platform per rolling 24 hours (429 `INVITE_DAILY_LIMIT` and `INVITE_PLATFORM_LIMIT`), and no email address in mail or worker log lines. No frontend change: the 429 message already reaches the invite form and onboarding | backend: biome + tsc + `npm test` 235/235 + build; frontend docs only |
| 2026-11-18 | reports (slice 2): weekly-to-quarterly Schedule with versions, lazily made Reporting periods, one autosaving draft per person per period, submit with late marking and a 7 day grace, edit with revisions and `edited` events, delete while unseen, server-side HTML sanitizing (`sanitize-html`), one `ReportAccess` choke point. Migration `0002_reports.sql`. Submit, My reports, Report page and Settings schedule now use the real API. My record and the review screens stay on sample data | backend: biome + tsc + check:circular + `npm test` 396/396 + build; frontend: biome + tsc + `npm test` 311/311 + build; fresh-context review APPROVED; live HTTP check on :5000 (all checks seen); browser pass not done |
| 2026-11-18 | reports-list-fix: Home and My record read real reports | tsc + tests + API (frontend `56c122b`: 8 new tests, `npm test` 319/319, build; headless browser pass as a staff member of the same shape as the owner; fresh-context review APPROVED) |

## In progress

| Date | Feature | Status |
|---|---|---|
| 2026-11-11 | auth-backend-wiring: auth calls, in-memory tokens, refresh and sign out against `/api/v1` (decisions D1 to D5 approved 2026-11-11) | Built on `feat/wire-real-auth`, in fresh-context review |

| 2026-11-12 | signup-member-role: new signups are never admin, saved as member (staff), land on the dashboard; admins grant or remove admin through `PATCH /api/v1/user/:id/role` (decisions 1 to 4 approved 2026-11-12) | Built, in fresh-context review (`feat/signup-member-role`) |
## Order

Frontend only. `reportlee-backend/` is parked until the frontend is finished, so every screen is built on
sample data shaped like the API contract. One task at a time, through spec, plan, build, validate, review,
done.

| Phase | Work |
|---|---|
| 1 | UI-1, UI-2, then UI-3a (desktop frame) and UI-3b (phone tab bar) |
| 2 | The API contract, then UI-6 submit, UI-7 report page, UI-8 review, UI-9 comments and tasks |
| 3 | UI-4 setup and invitations, UI-5 members and Spaces |
| 4 | UI-10 home, UI-11 notifications, UI-12 search, UI-13 analytics |
| 5 | UI-14 settings, UI-15 Assistant, UI-16 Super Admin console |
| 6 | UI-17 polish. The backend starts after this. |

The API contract opens phase 2: one definition each for Report, Reporting period, Draft, Comment, Task,
Membership and Workspace, and every screen reads through them, so the backend swap changes the data source
and not the screens. Every spec from here labels its server rules as simulated on sample data: a draft
following a person across devices, one Report per person per period, the edit window and the "seen" lock,
search that never reveals what a person cannot open, and role-scoped analytics.

## Specified, not started

Nothing. Every UI task from UI-1 to UI-17 and the ai-drafting change is built; `openspec validate --all
--strict` passes 11 of 11. The frontend is feature-complete on sample data and the backend is the next repo.

## Backlog (known, not started)

- AGENTS.md is out of date about the backend: it says reportlee-backend does not exist and there is no local stack; both now exist (backend on :5000, Postgres on host port 5434)
- No admin UI for granting roles yet; use the PATCH endpoint /api/v1/user/:id/role

- Biome backlog: 128 errors and 5 warnings on 2026-10-23. Do not chase zero inside a feature task.
- Three sidebar links 404 until their phase: `/dashboard/tasks`, `/dashboard/review`, `/dashboard/spaces`.
  `/dashboard/reports` and `/dashboard/reports/new` exist; the nav module ships before the screens on purpose.
- The greyed Assistant tab on a phone carries its reason only in the accessible name: there is no room for
  the "AI off" suffix the rail shows, so a sighted user sees a tab that does nothing. Needs a visible marker.
- UI-1 open item: Satoshi passes the tabular-figures check, but the 12 to 14px legibility check in both
  themes has not been run.
- `npm run seed` points at `scripts/gen-seed.mjs`, which does not exist.
- The README is still the unedited `create-next-app` one.
- Landing page marketing claims (organization counts, logos, testimonials, "+38%") are unverified placeholders. See `LAUNCH-REQUIREMENTS.md` item 9.
- `public/brand/` still holds the drawn Iroyin artwork and file names. Only the `<title>` and `<desc>` text was renamed.
- The trusted-by band says 80+ organizations and the stats band says 1500+. One of the two is wrong, and which one is a marketing decision.
- The footer links to `/company`, `/careers`, `/blog`, `/docs`, `/status`, `/privacy`, `/terms` and others, none of which exist. Every one is a 404 today.
- Storage keys still read `iroyin` (`iroyin.auth.flow`, `iroyin.auth.session`, `iroyin-sidebar`) and the package name is still `iroyin`. The theme cookie is renamed; these three are left because renaming them would drop in-flight OTP flows, and the sidebar cookie has no reader today.
- The dashboard is not in the code. `docs/UI.md` and `docs/UI-BUILD-ORDER.md` still describe it as the target design, and say so at the top.
- The onboarding invite step offers Staff and Admin only. A Head of Space needs a Space, so that picker is part of UI-4 and UI-5.
- workspaces-people (P10): invitation emails are now capped (70 per Workspace and 300 for the platform per rolling 24 hours, see invite-daily-limit in Done). Still open: no limit on Workspaces per user, and signup and login code emails share the same Gmail sender (about 500 a day) with no cap of their own.
- workspaces-people: the backend's `redactLog` does not mask `email`, so Zod request logging can print invited addresses. Adding `email` to `SENSITIVE_KEYS` changes existing log output, so it needs its own approval.
- workspaces-people: `AGENTS.md` is stale. It says the backend does not exist, that the Drizzle journal stops at 0004 and that there is no local stack. The backend and `0001_workspaces_people.sql` now exist. Update those notes.
- workspaces-people: `src/data/members.ts` is marked generated but its generator is missing.
- workspaces-people: the member roster has no pagination.
- workspaces-people: no way to resend an invitation; revoke and invite again.
- workspaces-people: onboarding has no Head picker.
- workspaces-people: Super Admin plan limits are not built.
- workspaces-people: a last Admin can delete their own account (D22).
- workspaces-people: older backend routes still log full responses through `sendSuccessResponse`; new routes opt out with `{ log: false }`.
- workspaces-people: add a `.gitattributes` for backend migrations. A Windows CRLF checkout changes the file hash that `app/migrate.ts` records, so an applied migration would run again once.
- workspaces-people: the invite caps count rows created in the last 24 hours with no index on `invitations.created_at`. Fine at 300 a day. Add an index if the table grows to millions of rows.
- invite-daily-limit: the Zod request and response logging can still print invited addresses (see the `redactLog` item above). Mail and worker log lines no longer carry any address.
- reports (slice 3 must add): nothing sets `first_seen_at` or `window_started_at` yet. The columns and `ReportAccess.editState` honour them, and tests seed them with SQL. Slice 3 must set both together when a reviewer first opens a report, and test: seen, edited (window cleared), seen again, then past the window. A seen report with a null window is editable without limit today.
- reports (slice 3 must add): review decisions (approve, reject, reopen) and the `approved`, `rejected`, `reopened` events (the enum values already exist), the review queue, comments (`comments` is `[]` in every Report response) and tasks. Slice 3 reuses `ReportAccess`; it must also decide the Admin read rule: `reviewersFor` applied literally means an Admin cannot read a Staff report in a Space that has a Head, while CONTEXT.md says Admins monitor everything.
- reports: My record (`/dashboard/my-record`) still reads sample data because it needs the roster and analytics (slice 4). Home, search and the task board also still read sample data.
- reports: attachments store metadata only (`uploaded: false`); there is no upload. Location is stored as sent and is not gated on `location_tagging`. `edit_window_minutes` has no endpoint to change it (Settings, later).
- reports: the save-versus-submit race test only asserts where the report ended up. Make it deterministic by holding the row lock in one transaction while firing the other call.
- reports: `report.model.ts` and `schedule.model.ts` were not diffed column by column against `0002_reports.sql`. `tests/migration-0002.test.ts` covers the SQL. Diff them if certainty is wanted.
- reports: no automated test for the frontend screen states (loading, error, closed period); only the `src/lib` logic is tested. The browser pass was not run.
- reports: a second staff peer reading another member's draft was not tested live (the Admin was used as the other member). The tests cover it.
- reports: `npm test` in the frontend took 327s to 479s and the full backend suite 1709s under machine load, over the 3 minute rule. Setup, not tests, is the cost. `rg` is not installed here, so dash checks use `Select-String`.
- reports: `.gitattributes` is still missing for backend migrations. With `core.autocrlf=true` a checkout writes `0002_reports.sql` as CRLF, which changes its hash and runs it once more (harmless, it is idempotent). Same risk as slice 1.
- reports: the backend has one pre-existing em dash in a code comment, `src/db/postgres.schema.ts:1`.
- review (slice 3): no email for comments, tasks or submissions. Only approve and reject decisions send an email (`DECISION_EMAILS_ENABLED`). Notifications for the rest are in-app only.
- review: the bell polls every 60 seconds and on window focus. The backend already pushes `notification:new` over Redis, but the frontend has no websocket client yet.
- review: the review queue and the task list are capped at 500 rows with no pagination, and the cap truncates silently. The notification list asks for the 50 newest. The existing `total` in `GET /notifications` counts the fetched rows only.
- review: comments cannot be edited or deleted, and task completion files are metadata only (no upload).
- review: the task board no longer offers "Show older". The server keeps Done to the last 14 days and there is no way to ask for older ones.
- review: `src/data/notifications.ts` and `SAMPLE_TASKS` in `src/data/tasks.ts` are no longer read by any screen. They stay for the mock-only tests. Search, Analytics (Workspace and Space scope), the Assistant and the Console still read sample reports.
- review: `src/lib/review.ts` `queueFor` and `missingFor` are no longer called by a screen, because the server builds the queue and the missing list. They stay for their tests.
- review: `npx tsc --noEmit` reports syntax errors inside `.next/dev/types` while the owner's `next dev` is running, because the dev server rewrites those generated files. The errors are not in `src/`.
- reports: the live check left fixtures in the local `app` database: Workspace 8, Space 11, Membership 15, periods 2 and 3, reports 1 (soft deleted), 4 and 5.

## Not v1

### Structure
- Multiple Workspaces per Organization (every record already carries workspace_id)
- Multiple Heads per Space (a single field becomes a list; first decision wins)
- A different Schedule per Space
- Free-form schedule rules ("every second Tuesday")
- Configurable label per Workspace for "Space" (Department, Team, Division, custom)

### People and access
- Guest access for external people
- Domain auto-join, with DNS proof of domain ownership
- SSO and SCIM provisioning
- Microsoft sign-in
- Additional Super Admins

### Reports
- A deliberate "share this Report" feature for collaborators
- Grace windows and blocking after the deadline
- Reminder emails for missing Reports
- Precise versus city-only location
- Permanently erasing a person's data (legal requests)

### AI
- Confirmed actions: the AI proposes, the Admin clicks a confirmation card
- AI for Heads of Space, scoped to their own Space
- Auto-summaries for reviewers
- Sharing an Assistant conversation with other Admins

### Platform
- Self-service Workspace URL rename (old address redirects permanently)
- Dedicated database for large or regulated customers
- Native mobile apps
- Customisable dashboards and widgets (rejected for v1 in favour of fixed, role-based layouts)
