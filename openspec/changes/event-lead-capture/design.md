# Design: event-lead-capture

## Shape

| Area | Choice |
|---|---|
| Public route | `/capture/[token]`, outside `/dashboard`, no session. Short, reads as a booth URL, and the token is the whole scope |
| Internal route | `/dashboard/leads`, in the shell, a destination in the Admin and Staff navigation |
| Data | `src/data/leads.ts` (shapes, one sample `EventContext` keyed by a token constant, sample captured leads) |
| Logic | `src/lib/leads.ts` (validation, first-error resolver, CSV serialization, filter and search, the `simulate*` call bodies), no React |
| Scope | a lead is scoped to a Workspace and a Space, read from `src/data/viewer.ts`; the caller never names either |
| Contact rule | `email` and `phone` are each `string \| null`; at least one required, name required, consent required |
| Phone | stored exactly as entered, `string`, never reformatted |
| Consent | `LeadConsent { given: boolean, at: string }`, defaulting to unticked, required to submit |
| Kiosk | after a successful submit, a thank-you then a reset to empty; nothing carries to the next person |
| CSV | hand-rolled, header plus one row per lead, RFC-4180 quoting for commas, quotes and newlines, follows the active filter |
| Untrusted text | every captured field rendered through React text nodes only; no `dangerouslySetInnerHTML` anywhere |
| shadcn | reuse `src/components/ui/`; if `checkbox` is absent, `npx shadcn@latest add checkbox` (copied-in code, not a dependency) |
| Envelope | read `{ success, data }` and `{ success, error }` only, `error.message` a string |
| Token | a sample constant now; a per-event public capture token later, never a real boundary today |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | The public form is a route OUTSIDE `/dashboard`, at `/capture/[token]` | A booth device must reach the form with no session and must never render the shell or any Workspace data; a route under `/dashboard` reads the active Membership and shows the sidebar, which is exactly wrong here |
| D2 | `/capture/[token]` over `/events/[token]/capture` | One segment, not three; the token already carries which event it is, so the extra `events` and `capture` segments add length with no meaning. The short URL is easier to put on a booth sign |
| D3 | A lead is scoped to a Workspace and a Space, mirroring a Report | `CONTEXT.md` scopes a Report to a Workspace and a Space; a lead is the same kind of record and the internal list filters by Space, so it must carry one |
| D4 | The caller never sends `workspaceId` or `space`; the token resolves them | An unauthenticated caller that names its own Workspace could write into any Workspace; the scope must come from the server-validated token, never the body |
| D5 | Name required, email OR phone required, consent required | The user's agreed rule: a lead with no way to reach them and no opt-in is not a usable lead |
| D6 | `email` and `phone` are each `string \| null`, not one combined field | The two are validated differently (email format, phone kept verbatim) and the CSV needs them as separate columns |
| D7 | Phone is stored exactly as entered | Event phone numbers carry country codes, spaces and brackets; reformatting risks dropping a digit, and the follow-up caller can read it as written |
| D8 | Consent is a record with `given` and `at`, not a bare boolean | A follow-up contact rule needs to know when consent was given, and the CSV and any later audit need the timestamp |
| D9 | After submit, confirm then reset to empty | Kiosk behaviour: the booth device serves a queue of people, and a form still holding the last person's details is a privacy leak and a data error |
| D10 | Logic in `src/lib/leads.ts`, no React | Validation, the first-error resolver, CSV serialization and the filter are all testable with `node --test`, the same split `src/lib/search.ts` and `src/lib/review.ts` use |
| D11 | CSV is hand-rolled with RFC-4180 quoting | `AGENTS.md` forbids a new dependency without approval; a notes field with a comma or a newline must not break the columns, so quoting is explicit and tested |
| D12 | The export follows the active search and filters | A person filters to one event then exports; exporting the whole set would ignore what they set up and surprise them |
| D13 | The internal list is read-only in v1: no edit, no delete, no convert | Scope control; convert-to-member and convert-to-report are their own flows with their own guards, left to a later change |
| D14 | Captured text is rendered through React text nodes only | `AGENTS.md`: all captured text is untrusted; a booth is an open input, so a `<script>` in a notes field must render as characters |
| D15 | The public write path is designed, not enforced, and flagged for approval | `AGENTS.md` makes an unauthenticated write a HARD STOP; the token guard, CREATE-only rule and rate limit are documented for the backend and nothing claims they hold today |
| D16 | Both screens answer from `simulate*` functions while there is no backend | Matches `src/lib/auth.ts`: the backend swap is the flag and the documented paths, not a rewrite |
| D17 | The token is a sample constant now | A real token must never be persisted, logged or pasted into a spec (`AGENTS.md`); the sample constant resolves one event context so the form is reachable without inventing a token scheme |

## Backend

No backend change. The backend repo does not exist yet, so this section describes the contract the frontend
is written against, to be built when that repo lands. It STOPS for the user's approval before any code,
because it introduces the product's first unauthenticated write path.

Future endpoints:

- `GET /api/v1/public/capture/:token` (PUBLIC): no `jwt.validateToken`. Validates the per-event capture
  token, returns a minimal `EventContext` (Workspace name, Space, event name) and nothing else. Rate
  limited per token and per IP. Returns 404 for an unknown token, 410 for an expired or revoked one, 429
  when rate limited.
- `POST /api/v1/public/capture/:token` (PUBLIC): no `jwt.validateToken`. Validates the token, resolves the
  Workspace and Space from it (never from the body), validates the body server-side (the frontend does not
  assume the server trusts it), creates one lead, and returns only the new id. It is CREATE-only: it can
  never read a lead. Rate limited. Returns 400 on a bad body, 404 or 410 on a bad or expired token, 429
  when rate limited.
- `GET /api/v1/leads` (internal): `jwt.validateToken`, then a role guard admitting Workspace Admin and
  Staff, then the Workspace scope from the token so one Workspace never reads another's leads. Returns 401
  unauthenticated, 403 for a role not admitted.

The guard choke point is the token validation on the two public routes. The approval question is whether an
unauthenticated, token-scoped, CREATE-only, rate-limited public write is acceptable, and whether the token
should be revocable and expiring (the design assumes yes).

## Data

No backend change, so no migration and no schema in this change. When the backend lands, a lead is a new
table scoped to a Workspace and a Space, with the captured fields, a consent flag and timestamp, and a
capture time. The per-event capture token is its own record: a token value, the Workspace and Space it
scopes, and an optional expiry. The token value is never logged and never returned in a list. These are
additive (a new table, a new token table), so they fit the backward-compatible rule, but they do not exist
in this change.

## Frontend

Screens, states and the exact calls are in `specs/event-leads/spec.md` under `## Frontend` and the API
contract table. In short:

- `src/data/leads.ts`: `CapturedLead`, `LeadDraft`, `EventContext`, `LeadConsent`; the sample token
  constant and its `EventContext`; sample captured leads so the list, filters, search and export are all
  reachable. `Workspace` and `Membership` imported from `src/data/viewer.ts`.
- `src/lib/leads.ts`: `validateLead` (returns problems with the field each belongs to), `firstError` (what
  the form focuses), `leadToCsvRow` and `leadsToCsv` (hand-rolled, quoted), `filterLeads` (search plus event
  plus Space), and the `simulate*` bodies behind the three documented calls.
- `src/components/leads/`: the public capture form, the thank-you panel, the internal table, the filter bar
  and the export button. shadcn `ui/` first; `checkbox` added if absent.
- `src/app/capture/[token]/page.tsx`: the public kiosk route, no shell, no session.
- `src/app/dashboard/leads/page.tsx`: the internal list.
- `src/lib/nav.ts`: a Leads destination for Admin and Staff. No change to the public route, which is not in
  the shell.

## Rejected

- `/events/[token]/capture` for the public route. Three segments where one does the job; the token already
  names the event. Rejected for the shorter `/capture/[token]` (D2).
- Putting the capture form under `/dashboard` and hiding the shell with a flag. The dashboard layout reads
  the active Membership and renders the sidebar; a public kiosk must do neither, and a flag that strips the
  shell is a fragile way to say "this is not the dashboard". A separate route segment is honest (D1).
- One combined contact field for email or phone. They validate differently and the CSV needs two columns,
  so one field would need splitting again downstream (D6).
- A CSV library. It would be a new dependency, which `AGENTS.md` makes an approval item, for serialization
  that is a few lines with correct quoting (D11).
- Letting the public form choose its Workspace from a query parameter. That is the unauthenticated caller
  naming its own target, exactly the hole the token guard closes (D4).
- Convert-to-member and convert-to-report in v1. Each is its own guarded flow; folding them in here would
  widen the change past capture-and-list and pull in the Membership write path (D13).

## Known ceiling

Everything server-side is simulated. The capture `POST`, the token resolution, the rate limit and the
list read are all `simulate*` bodies over sample data. The token is a sample constant: the public form is
reached by visiting `/capture/<sample-token>`, and an unknown token reaches the invalid-link state. No real
scope, no real rate limit and no real CREATE-only boundary exist in this build, and the UI says nothing
that implies they do. When the backend lands, the three calls replace the `simulate*` bodies and the
screens stay as they are. The unauthenticated write path is the single item that cannot ship without the
user's approval.

## Order of work

No migration and no backend in this change (neither exists), so every step is frontend.

1. `src/data/leads.ts`: the shapes, the sample `EventContext` and token constant, the sample captured leads.
2. `scripts/leads.test.ts` first, run red: validation (name required, email-or-phone, email format, consent
   required), phone kept verbatim, the first-error resolver, CSV quoting for a comma, a quote and a newline,
   the filter combining search, event and Space.
3. `src/lib/leads.ts` to green, with the `simulate*` bodies behind the three documented calls.
4. The public screen at `/capture/[token]`: invalid-link state, the form, inline errors with focus, submit,
   thank-you, reset to empty. No shell, no session.
5. The internal screen at `/dashboard/leads`: table, search, event and Space filters, empty states, the CSV
   export button following the filter.
6. `src/lib/nav.ts`: the Leads destination for Admin and Staff.
7. Validation (see `tasks.md`), after the user approves the public write path.

## Acceptance checks

- AC1: `/capture/[token]` renders with no session, no shell and no other lead's data; an unknown token
  reaches the invalid-link state.
- AC2: submit is refused unless name is present, email or phone is present, and consent is ticked, each
  message beside its field and focus on the first problem.
- AC3: a submitted lead stores consent with its timestamp, then the form resets to empty for the next
  person.
- AC4: phone is stored exactly as entered.
- AC5: the internal list searches name, email, company and job title, and filters combine by event and by
  Space.
- AC6: the CSV export follows the active filter and quotes a field containing a comma, a quote or a newline.
- AC7: no captured field is rendered through `dangerouslySetInnerHTML` on either screen.
- AC8: no new dependency is added; `checkbox`, if added, is a shadcn copy-in named in the spec.
- AC9: the auth files are untouched, and no copy or comment describes the public token as a real boundary.
