## Why

The product captures Reports from people who are already Members. It has no way to capture someone who is
not: a prospect at a conference booth who hands over a name and an email. Sales and events teams collect
those leads on paper or in a stranger's spreadsheet, and the data never reaches the Workspace. This change
adds a lead-capture form that lives at an event booth, on a shared device, with no login, so anyone at the
booth can leave their details. The captured leads land in the Workspace for its Admins and Staff to review
later.

This opens an unauthenticated public write path, the first in the product. That is a HARD STOP under
`AGENTS.md` (auth, tokens and permissions are never defaulted), so this proposal and the design flag it as
the item needing the user's approval at the spec gate. Everything is simulated now, the way the rest of
the app is: a `simulate*` function answers each documented call while there is no backend, and the public
guard design below is written for when the backend lands.

## What Changes

- Add the lead shapes, once, in `src/data/leads.ts`: `CapturedLead`, `LeadDraft` (the wire shape the public
  form posts), `EventContext` (which Workspace, Space and event a public link is for) and a `LeadConsent`
  record. A lead is scoped to a Workspace and a Space the same way a Report is, read from `src/data/viewer.ts`.
- Add plain logic in `src/lib/leads.ts`, no React: field validation (name required, email OR phone
  required, email format, consent required), the first-error resolver the form focuses, CSV serialization
  by hand (no dependency), and the list filter and search for the internal screen.
- Add a PUBLIC capture screen at `/capture/[token]`, OUTSIDE the dashboard and with no session: a kiosk
  form a stranger fills, a thank-you confirmation on submit, and an automatic reset for the next person. No
  data about any other lead is ever rendered on this screen.
- Add an internal leads list at `/dashboard/leads` for Admins and Staff: a searchable, filterable
  (by event and by Space) table of captured leads with a hand-rolled CSV export.
- Sample data only: one `EventContext` keyed by a sample token constant, and a handful of captured leads,
  so the list, the filters, the search and the CSV export are all reachable without a backend.
- Wire both screens to the documented API calls that do not exist yet, each answered by a `simulate*`
  function for now, so the backend swap is a flag and a path rather than a rewrite.
- No backend change (the backend repo does not exist). The public capture guard is designed, not built:
  a per-event public capture token in the URL scopes the write to one Workspace and one Space, the endpoint
  can only CREATE a lead and never read one, and it is rate limited. This is documented in the design and
  is the approval item.

## Capabilities

### New Capabilities

- `event-leads`: the public capture lifecycle (the kiosk form, consent, required-field rules, thank-you
  and reset), the event-scoped public link, and the internal list with its search, filters and CSV export.

### Modified Capabilities

None. `dashboard-shell` keeps its requirements; this change adds one internal destination and one public
route that sits outside the dashboard entirely.

## Impact

- New: `src/data/leads.ts` (shapes, the sample `EventContext`, sample captured leads), `src/lib/leads.ts`
  (validation, CSV, filter and search, and the `simulate*` call bodies), `src/components/leads/` (the public
  capture form, the thank-you panel, the internal table, the filter bar, the export button),
  `src/app/capture/[token]/page.tsx` (the public kiosk route, outside the dashboard),
  `src/app/dashboard/leads/page.tsx` (the internal list), `scripts/leads.test.ts`.
- Touched: `src/lib/nav.ts`, to add the Leads destination to the Admin and Staff navigation and a page
  label for the public route is not needed since it is outside the shell.
- shadcn components: the internal table and the public form reuse `src/components/ui/` first. If `checkbox`
  is not already present in `src/components/ui/`, adding it is `npx shadcn@latest add checkbox`, a copied-in
  code change, not a dependency. The spec names it so the build gate can confirm the add.
- No dependency is added. CSV export is hand-rolled in `src/lib/leads.ts`. The auth files
  (`src/lib/auth.ts`, `src/lib/auth-simulator.ts`, `src/lib/session.ts`, `src/lib/cookies.ts`) are untouched.
- The envelope is fixed by `AGENTS.md` and the backend's `sendSuccessResponse`:
  `{ timestamp, status, success, data }` on success and `{ timestamp, status, success, error }` on failure.
  Field-level validation stays on the client, so no `error.fields` convention is invented.
- HARD STOP flagged for approval: the public unauthenticated write path. It is designed, not built, and no
  code enforces it today.
