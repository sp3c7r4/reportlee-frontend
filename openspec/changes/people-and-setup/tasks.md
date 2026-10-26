## 1. Rules and tests (FE)

- [x] 1.1 `scripts/people.test.ts` red: an Admin may invite every role; a Head gets Staff only and a fixed
      Space; a Staff invitation without a Space is refused; a deactivated member keeps their Reports and leaves
      the pickers; an archived Space leaves every picker.
- [ ] 1.2 `src/lib/people.ts` and `src/lib/setup.ts` to green, including the setup completion rule.

## 2. Setup (FE)

- [ ] 2.1 Setup resumes under `/onboarding`: the Spaces step and the Invitations step, with done steps marked.
- [x] 2.2 The Admin-only unfinished-setup banner on the dashboard names the missing steps.
- [ ] 2.3 The report form's "still being set up" state links to who can fix it.

## 3. Members and Spaces (FE)

- [x] 3.1 `/dashboard/members`: table with invitations, filter chips for role and status, invite dialog from
      `inviteRules`, row menu (resend, deactivate, change role or Space), addresses for Admins only.
- [x] 3.2 Rows become cards at 390 with 44px targets; loading, error with Retry, empty states.
- [x] 3.3 `/dashboard/spaces`: cards with Head, member count and submission bar; archive and restore.
- [ ] 3.4 Space page tabs: Reports, Members, KPI template, with the template editable by a Head and prefilling
      the form.

## 4. Validation (FE)

- [ ] 4.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 4.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 4.3 Browser pass as Admin and Head, 1440 and 390, both themes: invite flow for both roles, a missing
      Space, deactivation, archive and restore, the template reaching the form, keyboard only.
- [ ] 4.4 Console and network clean; no mail request of any kind; em dash scan; ROADMAP row; validate.

## 5. From review

- [x] 5.1 Guards with reasons: last active Admin, Space with members, Head replacement naming both, moving a
      person, promoting clears the Space, demoting requires one.
- [x] 5.2 Create space, rename, assign Head, Reactivate, Revoke invitation; unique Space names.
- [x] 5.3 Invite dialog shows seats used including pending, with an Upgrade link at the limit; seven day expiry.
- [ ] 5.4 Head reach through My Space, Staff only invites, no role or move controls; KPI template by Admin and
      the Space's Head, with existing drafts keeping their rows.

## Validation, step 1

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 86 pass, 0 fail (was 76) |
| Red first | `scripts/people.test.ts` before `src/lib/people.ts` | `ERR_MODULE_NOT_FOUND`, then one real assertion failure on invitation expiry that corrected the test, not the code |
| Build | `npm run build` | compiled in 4.7s, 19/19 pages, `/dashboard/members` and `/dashboard/spaces` added |
| Lint | `npx biome check` on the touched files | clean |
| Em dashes | `rg -n "[—–]"` on the touched files | none |

Browser, dark, Admin in Kano Programme Office:

- Members lists eight people and two invitations in one table, with chips All, Staff, Heads, Admins and Invited,
  and reads "9 of 10 seats used, pending invitations included". The expired head invitation says "Invitation
  expired" and can be revoked, releasing its seat.
- Deactivate is disabled on the person themselves, and the last active Admin cannot be demoted or deactivated
  (unit tested, with the sentence as the reason).
- Spaces shows four cards with Head or "No Head, reviewed by Admins", and Archive is disabled on every one with
  "Move its members out before archiving this Space", because each has members.
- The setup banner stays silent here because this Workspace already has Spaces and an Admin.

## The Space page, 2026-10-26

`/dashboard/spaces/<id>` with three tabs and figures scoped to the current period. Rules are pure in
`src/lib/spaces.ts` and pinned by `scripts/spaces.test.ts`: `spaceById`, `reportsInSpace`, `spaceStats`,
`canEditTemplate` and `applyTemplate` (a Report that already has rows keeps them, so a template change
only affects the next Report). `SPACES` now carries a `kpiTemplate`, and the setup banner resumes the flow
at `/onboarding?step=spaces`.

Evidence: `tsc` clean, `npm test` 93 pass 0 fail, build 20/20 pages, biome clean, no em dashes, browser
check of all three tabs as an Admin in Platform.

Known gap in the sample data, recorded not fixed: all five Platform Reports are authored by `mem_staff`
and share one period, so the Space reads "1 of 3 submitted this period" and 5 reports. One person, one
Report per period is the real rule; the samples need spreading across authors and periods.

## The template reaches the form, 2026-10-26

`templateFor(spaceName, spaces)` in `src/lib/spaces.ts` is the one lookup the submit form now uses, so a new
Report starts from the viewer's Space template and falls back to `SAMPLE_KPI_TEMPLATE` when the Membership
has no Space (every Admin does). Pinned in `scripts/spaces.test.ts`; `npm test` 94 pass 0 fail, build 20/20.

## Still open in this change

- Nothing recorded. The three remaining `/onboarding` resume steps are the next thing after `review-queue`.

## Refinement, 2026-10-26

Screens reviewed in the browser and changed:

- Spaces carries "Create space" on the same line as its heading, opening a dialog with a name and an
  optional Head of Space. The bottom form is gone.
- "Move Space" is now "Change Space", and its dialog says what it does: it moves the person, never their
  past Reports.
- Rows carry a grey header and an avatar, Deactivate is red, Reactivate and Restore are green, Make Admin
  is blue (the `--info` token), Make Staff and Change Space stay neutral.
- A data page fills the window from the left instead of centring a 1440 column, so a table uses a wide
  screen.
- Dialog content is anchored near the top and scrolls inside 88vh, so a long form spreads instead of
  being squeezed into the middle of the viewport.

### The members table, 2026-10-26

The grid of divs is replaced by a real `<table>` with `table-fixed` from `sm` up, because a hand-rolled
grid let the header and the rows pick different column widths. Measured at 1440: header and body agree on
every column (member 698, role 132, actions 300) and every row is one line, 57px tall. At 390 the Role
column drops, the actions wrap under one another and the page has no horizontal scroll.
