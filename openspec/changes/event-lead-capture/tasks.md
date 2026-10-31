## 1. Shapes (FE)

- [x] 1.1 `src/data/leads.ts`: `CapturedLead`, `LeadDraft` (the wire shape, no `workspaceId` and no
      `space`), `EventContext` (Workspace name, Space, event name), `LeadConsent` (`given`, `at`). Import
      `Workspace` and `Membership` from `src/data/viewer.ts`; do not redeclare them.
- [x] 1.2 `src/data/leads.ts` sample data: one `SAMPLE_CAPTURE_TOKEN` constant and the `EventContext` it
      resolves to, plus a handful of sample `CapturedLead` rows across two events and two Spaces so the
      list, the filters, the search and the CSV export are all reachable.

## 2. Logic, tests first (FE)

- [x] 2.1 `scripts/leads.test.ts` written and run red: name required blocks submit and names the field;
      neither email nor phone present blocks submit with the one combined message; a malformed email is
      refused; consent unticked blocks submit and names the checkbox; phone is stored exactly as entered;
      `firstError` returns the first problem in reading order; `leadsToCsv` quotes a field with a comma, a
      field with a quote and a field with a newline, and keeps the column count; `filterLeads` combines
      search with an event filter and a Space filter.
- [x] 2.2 `src/lib/leads.ts` to green: `validateLead`, `firstError`, `leadToCsvRow`, `leadsToCsv`,
      `filterLeads`, and the `simulate*` bodies behind `GET /public/capture/:token`,
      `POST /public/capture/:token` and `GET /leads`. No React, no new dependency.

## 3. The public capture screen (FE)

- [x] 3.1 `/capture/[token]`: the route lives OUTSIDE `/dashboard`, renders with no session, no shell, no
      sidebar, no tab bar, no Workspace switcher, and no other lead's data.
- [x] 3.2 Invalid or expired link state: an unknown token says the link is not valid and renders no form.
- [x] 3.3 The form: full name, email, phone, company, job title, event name (from the context, read-only),
      notes, and the consent checkbox, defaulting to unticked with a label saying what is agreed.
      shadcn `ui/` first; `checkbox` was absent, so added as a copied-in component over the
      `@base-ui/react` checkbox primitive (named in the spec, not a new dependency).
- [x] 3.4 Inline validation: messages beside the field, focus to the first problem, email format check,
      phone kept verbatim, consent required. All client-side.
- [x] 3.5 Submit: disabled in flight, a thank-you confirmation on success, then a reset to an empty form
      with consent unticked and nothing carried from the previous person.
- [x] 3.6 Every captured field renders through React text nodes only; no `dangerouslySetInnerHTML`.

## 4. The internal leads list (FE)

- [x] 4.1 `/dashboard/leads`: the table of captured leads for Admin and Staff, with loading, load error
      with Retry, and the empty-Workspace state ("no leads captured yet").
- [x] 4.2 Search (name, email, company, job title) and filters by event and by Space, combining; the
      empty-filter result says no leads match and disables the export button.
- [x] 4.3 CSV export: hand-rolled, follows the active search and filters, quotes commas, quotes and
      newlines, and includes a consent column.
- [x] 4.4 Every captured field renders through React text nodes only; no `dangerouslySetInnerHTML`.
- [x] 4.5 `src/lib/nav.ts`: add the Leads destination to the Admin and Staff navigation.

## 5. Validation (FE)

Run after the user approves the public unauthenticated write path at the spec gate. Fill the evidence at
build time, not now.

- [ ] 5.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 5.2 `npx tsc --noEmit` (or `npm run typecheck`).
- [ ] 5.3 `npm test` (the `scripts/leads.test.ts` suite plus the existing suites).
- [ ] 5.4 `npm run build`.
- [ ] 5.5 Browser pass: the public screen at `/capture/<sample-token>` with no session (form, invalid
      token, every field error with focus, submit, thank-you, reset), and `/dashboard/leads` as Admin and
      as Staff (table, search, event and Space filters, empty-filter result, empty Workspace, CSV export
      opening with the right columns and quoting), at 1440 and 390, dark and light, keyboard only.
- [ ] 5.6 Console and network: no errors, no off-host request, and the public screen leaks no other lead.
- [ ] 5.7 `rg -n "[\u2014\u2013]"` over the touched files: no em dash in any user-facing string.
- [ ] 5.8 Confirm no new dependency slipped in; if `checkbox` was added, it is a shadcn copy-in named in
      the spec.
- [ ] 5.9 ROADMAP row and `openspec validate --all --strict`.

## Validation

Run in `reportlee-frontend` on branch `feature/event-lead-capture`. Evidence below is real output.

### 1. Tests, red then green (`node --test`)

RED (before `src/lib/leads.ts` existed), `node --test scripts/leads.test.ts`:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '...\reportlee-frontend\src\lib\leads.ts' imported from
  '...\reportlee-frontend\scripts\leads.test.ts'
not ok 1 - scripts\leads.test.ts
1..1
# tests 1
# pass 0
# fail 1
```

GREEN, `node --test scripts/leads.test.ts`:

```
1..20
# tests 20
# pass 20
# fail 0
```

Full suite (serial `npm test` is slow on the timer suites; run with concurrency),
`node --test --test-concurrency=8 scripts/*.test.ts`:

```
# tests 210
# pass 210
# fail 0
# cancelled 0
# skipped 0
```

The two touched behaviour suites together, `node --test scripts/nav.test.ts scripts/leads.test.ts`:

```
# tests 28
# pass 28
# fail 0
```

### 2. Types (`npx tsc --noEmit`)

Exit code 0, no errors.

### 3. Lint and format (`npx biome check <touched files>`)

After a hand fix of two `useOptionalChain` diagnostics in `src/lib/leads.ts` and
`npx biome format --write` on the touched files:

```
Checked 11 files in 100ms. No fixes applied.
```

No new diagnostics on touched files. `npm run format` was not run.

### 4. Build (`npm run build`)

```
✓ Compiled successfully in 88s
✓ Generating static pages (35/35)
```

35 routes. Both feature routes appear:

```
  /capture/[token]          (Partial Prerender: static shell + server-streamed)
ƒ /dashboard/leads          (Dynamic: server-rendered on demand)
```

`/capture/[token]` is outside `/dashboard`, so it carries no dashboard layout and
renders as a partial-prerender route with no session read.

### 5. Em dash and en dash scan (`rg`/`Select-String "[\u2014\u2013]"` over touched files)

```
no em or en dashes found
```

### 6. Acceptance checks AC1..AC9 (reasoning pass)

- AC1 (public route, no session, no shell, no other lead's data; unknown token to invalid-link):
  MET by code inspection and the build. `src/app/capture/[token]/page.tsx` is outside
  `src/app/dashboard/`, so it never hits `dashboard/layout.tsx` (the only place the shell and the
  active Membership are read). `CaptureScreen.tsx` reads only the token and the resolved
  `EventContext` (workspace name, Space, event name), never a lead list. An unresolved token sets
  `status: "invalid"` and renders `InvalidLink` with no form. The build lists the route as a
  partial-prerender page, not under the dashboard tree. A human should load
  `/capture/booth-arthurite-techexpo-2026` logged out and confirm no sidebar or tab bar, then load
  `/capture/wrong-token` and confirm the invalid-link message with no form.
- AC2 (submit refused unless name + (email or phone) + consent, message beside field, focus to first):
  MET by tests. `validateLead` returns a `fullName`, `contact`, `email` or `consent` error; the tests
  "a missing name...", "neither email nor phone...", "a malformed email...", "consent unticked..."
  cover the rules, and "firstError returns the first problem in reading order" plus "firstError orders
  contact above consent" cover ordering. `CaptureForm.handleSubmit` maps each error beside its field
  and calls `focusField(firstError(...).field)`. A human should press Submit on an empty form and
  confirm focus lands on the name field.
- AC3 (submitted lead stores consent with timestamp, then resets to empty): MET by code inspection.
  `toDraft` sets `consent.at` to `new Date().toISOString()` when ticked; on a successful
  `captureLead` the form calls `setFields(EMPTY)` and shows `ThankYou`. A human should submit a valid
  lead and confirm the thank-you, then "Add another" returns an empty, unticked form.
- AC4 (phone stored exactly as entered): MET by the test "phone is stored exactly as entered". The
  phone field is never trimmed or reformatted in `toDraft` (`phone: fields.phone ? fields.phone : null`),
  and `validateLead` never rewrites it.
- AC5 (list searches name, email, company, job title; filters combine by event and Space): MET by the
  `filterLeads` tests, including "an event filter and a Space filter combine". `LeadsScreen` wires the
  search box and two selects into one `filterLeads` call.
- AC6 (CSV follows the active filter and quotes comma, quote, newline): MET by the `leadsToCsv` and
  `leadToCsvRow` tests. `LeadsScreen.handleExport` serializes `filtered`, the active set, so the export
  follows search and filters.
- AC7 (no `dangerouslySetInnerHTML` on either screen): MET. `grep` for `dangerouslySetInnerHTML` across
  the new files finds nothing; every captured value renders as a React text node.
- AC8 (no new dependency; `checkbox` is a shadcn copy-in named in the spec): MET. `package.json` is
  unchanged; `src/components/ui/checkbox.tsx` is a copied-in component over the existing
  `@base-ui/react` checkbox primitive.
- AC9 (auth files untouched, no copy or comment calls the token a real boundary): MET. No change to
  `src/lib/auth.ts`, `src/lib/auth-simulator.ts`, `src/lib/session.ts`, `src/lib/cookies.ts`. Comments
  in `src/lib/leads.ts` and `src/data/leads.ts` state the token is a sample constant and not a real
  scope, rate limit or CREATE-only boundary.

### Human-only checks (no live browser run here)

A dev server was not started in this pass. A human must click to confirm the three interaction checks:
AC1 (no shell and no session on `/capture/[token]` while logged out, plus the invalid-token state),
AC2 (focus moves to the first field with a problem), and AC3 (the form resets to empty after a submit).
The logic behind each is covered by the tests and the code paths cited above.
