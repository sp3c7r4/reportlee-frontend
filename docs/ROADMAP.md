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

## In progress

Nothing. Ask before starting the next row.

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

Seven OpenSpec changes cover every remaining UI task: `shared-records` (the comment shape, the audit log, the
event stream and the plan gate), `people-and-setup` (UI-4 and UI-5), `review-queue` (UI-8),
`comments-and-tasks` (UI-9), `insight-screens` (UI-10 to UI-13), `platform-and-polish` (UI-14 to UI-17) and
`ai-drafting`. `openspec validate --all --strict` passes 11 of 11.

Build order: shared modules first, then people-and-setup, review-queue, comments-and-tasks, insight-screens,
platform-and-polish, then ai-drafting. One at a time, each stopping for approval at its validation gate.

## Backlog (known, not started)

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
