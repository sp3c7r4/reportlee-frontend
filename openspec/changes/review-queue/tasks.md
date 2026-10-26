## 1. Rules and tests (FE)

- [ ] 1.1 `scripts/review.test.ts` red: a Head sees their Space and never their own Report; an Admin sees all;
      a Space with no Head routes to Admins; Reject and Reopen need a reason and Approve does not; a bulk
      decision yields one entry per Report; decided Reports are refused by the bulk bar.
- [ ] 1.2 `src/lib/review.ts` to green, including `MissingPerson` per period.

## 2. The queue (FE)

- [ ] 2.1 `/dashboard/review`: period header, tabs, chips with counts, table with checkboxes, state pills,
      Workspace-timezone times; rows become cards at 390.
- [ ] 2.2 Not-submitted tab: hatched rows that also say "Not submitted".
- [ ] 2.3 Bulk bar: count, Approve, Reject with one shared reason, disabled while nothing is selected.
- [ ] 2.4 Dialogs: Approve with an optional note, Reject and Reopen with a required reason.
- [ ] 2.5 Loading, error with Retry, empty per tab and per filter.

## 3. Outcomes (FE)

- [ ] 3.1 Decisions write the Report's status and events; the Report page reflects them.
- [ ] 3.2 Reopen follows the recorded semantics: pending, cleared window, reason visible to the author.

## 4. Validation (FE)

- [ ] 4.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 4.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 4.3 Browser pass as Head and Admin, 1440 and 390, both themes: filters, not-submitted tab, reject
      without a reason, bulk reject, reopen, keyboard only.
- [ ] 4.4 Console and network clean; em dash scan; ROADMAP row; `openspec validate --all --strict`.

## 5. From review

- [ ] 5.1 Opening a Report page as a reviewer sets `firstSeenAt` and `windowStartedAt`; a queue row never does.
- [ ] 5.2 Not-submitted population: Staff and Heads only, a draft counts as missing, a Head sees their Space.
- [ ] 5.3 Admin override as Reopen then decide; a rejected Report cannot be approved directly; a second decision
      returns 409.
- [ ] 5.4 Read-only Workspace removes the decision controls with the reason; a posted decision is refused.
- [ ] 5.5 A reason is stored as a `decision` comment through the shared shape.

## Validation, step 1

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 107 pass, 0 fail (was 94) |
| Red first | `scripts/review.test.ts` before `src/lib/review.ts` | `ERR_MODULE_NOT_FOUND`, then two failing assertions that exposed missing sample data, fixed by building the cases in the test |
| Build | `npm run build` | compiled in 5.0s, 21/21 pages, `/dashboard/review` added |
| Lint | `npx biome check` on the touched files | clean |
| Specs | `npx openspec validate --all --strict` | 11 passed, 0 failed |

Browser, dark, Admin in Kano Programme Office, 1440:

- Tabs read Pending (5), Approved (1), Rejected (1), Not submitted (5) on first load.
- Approving moved Pending 4 to 3 and Approved 1 to 2, with "was notified: their Report is approved".
- Requesting changes with an empty reason was refused with "Give a reason. The author reads it as the reason for the change."; with a reason it moved the Report out of Pending and asked 4 to 3, notice "was notified and can edit their Report".
- Not submitted lists Tunde Adeyemi, Zainab Yusuf, Emeka Nwosu and Halima Sani, never an Admin, and a draft reads "Draft, not sent".

## Rules this shipped

- Scope lives in `queueFor` alone: an Admin sees the Workspace, a Head sees their own Space, Staff see nothing, and nobody sees their own Report.
- A Report from a Membership this Workspace does not know is not in its queue, which is what keeps another Workspace's sample Report out.
- A draft counts as missing and never as submitted.
- A read-only Workspace refuses every decision with a sentence.

## Still open in this change

- Opening a Report still writes no seen clock; `firstSeenAt` and `windowStartedAt` stay the next step.
- Reopen currently returns the Report to pending but does not restore the author's window, because the window write is the same step.
