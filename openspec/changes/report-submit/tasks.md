## 1. Shapes (FE)

- [x] 1.1 `src/data/reports.ts`: `ReportingPeriod`, `KpiTemplateField`, `KpiEntry`, `Attachment`,
      `ReportDraft`, `DraftBody` (the wire shape without `authorMembershipId`), the sample period with
      `SAMPLE_NOW`, the sample KPI template, the sample colleagues and the sample submitted report.
      `SubmissionStatus` and `ReportStatus` are imported from `src/lib/status.ts`.
- [x] 1.2 `src/data/viewer.ts` gains `timeZone`, `locationTagging` and `readOnly` on `Workspace`, set so
      the default Membership gets an open period, location off in Kano and on in Arthurite, and no
      Workspace read-only by default.

## 2. Logic, tests first (FE)

- [x] 2.1 `scripts/report-draft.test.ts` written and run red: accomplishments under 50 characters blocks
      submit and names the field; 5,000 is the ceiling on every section; a blank KPI is `null` and reads
      "Not provided"; `0` stays `0`; `twelve` is refused; an added row without a name is refused; colleagues
      de-duplicate and cap at 5; the deadline resolves to `late` after `dueAt` and `submitted` before it;
      `submitBlockers` returns every problem with the field it belongs to.
- [x] 2.2 `scripts/report-storage.test.ts` written and run red: the key is
      `reportlee.report.draft.<membershipId>.<periodId>`; a throwing `Storage` returns
      `{ ok: false, message }` and never reports a save; a cleared Membership takes only its own drafts.
- [x] 2.3 `src/lib/report-draft.ts` and `src/lib/reports.ts` to green, with the `simulate*` bodies behind
      the documented calls and an injectable `Storage`.

## 3. The screen (FE)

- [x] 3.1 `/dashboard/reports/new`: cards for period, accomplishments, challenges, next plans, KPIs,
      attachments, colleagues and location when the Workspace allows it.
- [x] 3.2 Blocked states, each with its own sentence and no form: Admin, no open period, no Space,
      read-only, already submitted.
- [x] 3.3 Draft lifecycle: debounce, flush on blur and on hidden, the three-state live indicator, the older
      tab's "updated elsewhere" notice, reload restore.
- [x] 3.4 Primary action in the shell's top bar slot, plus a sticky version above the tab bar below md, no
      second submit row.
- [x] 3.5 Field messages beside fields, focus to the first problem, counter per section, KPI add and remove,
      colleague picker with Admin-only addresses, attachment type and size refusals.
- [x] 3.6 Submit: disabled in flight, draft cleared only on success, `reviewStatus: "pending"`, land on
      `/dashboard` with the Submitted confirmation and the disabled "View report" placeholder.
- [x] 3.7 Sign out in the sidebar footer clears this Membership's drafts before the session is cleared;
      `src/lib/session.ts` untouched.

## 4. Validation (FE)

- [x] 4.1 `npx biome check` on the touched files, compared against the previous copy.
- [x] 4.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [x] 4.3 Browser pass as Staff, Head of Space and Admin, at 1440 and 390, dark and light: type, reload,
      blank KPI, zero KPI, letters in a KPI, add and remove a row, colleague cap, oversized file, wrong file
      type, location off in Kano and on in Arthurite, refused submit with focus, happy submit and the
      confirmation, already-submitted Membership, keyboard only.
- [x] 4.4 Console and network: no errors, no off-host request, nothing uploaded.
- [x] 4.5 `rg -n "[\u2014\u2013]"` over the touched files.
- [x] 4.6 ROADMAP row and `openspec validate --all --strict`.

## Validation, UI-6

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 36 pass, 0 fail (was 22; two new suites and the breadcrumb guard) |
| Red first | both new suites run before their modules existed | `ERR_MODULE_NOT_FOUND` on `src/lib/report-draft.ts` and `src/lib/reports.ts` |
| Red first, behaviour | deleted the `disabledBy: "ai"` flag earlier, and the colleague test failed against a toggle that removed instead of keeping one id | `actual: undefined, expected: 'ai'`; the cap test failed until `selectColleague` was idempotent |
| Build | `npm run build` | compiled in 2.4s, 15/15 pages (the form is the new route) |
| Lint | `npx biome check` on the touched files | no fixes needed |
| Em dashes | `rg -n "[—–]"` on the touched files | none |

Browser, dark and light, 1440 and 390, as Staff, Head of Space and Workspace Admin:

- Admin at `/dashboard/reports/new`: "Admins monitor Reports", no form, no Submit action in the top bar.
- Head of Space in Northline: "Your report for this period is in", no editable fields.
- Staff in Arthurite: 3 KPI rows from the template, location field present (Arthurite allows it); in Northline there is none.
- Typing shows "Saved just now"; a reload restores the text and the indicator.
- Submit with 5 characters: message beside Accomplishments, focus moves to that textarea, nothing submits.
- `twelve` in a KPI: "Enter a number, or leave it blank." beside the row; `0` is accepted as a value.
- Happy submit: draft removed from `localStorage`, `/dashboard` shows "Submitted · Week of 19 October" with "View report" disabled.
- Phone 390: breadcrumb reads "Submit report", the one primary action sticks above the tab bar, every form control measures at least 44px except the shell's bell.
- Keyboard only: 23 focus stops from the first field to the Submit button.
- Console: no messages. No off-host requests. Nothing is uploaded.

## Refinement, 2026-10-26: rich text, searched colleagues, captured location

- The three sections are Tiptap editors with bold, italic, bulleted and numbered lists plus indent and
  outdent. The draft stores HTML; the counters and every length rule run through `htmlToText`, proven by a
  test where 40 real characters inside paragraphs and bold tags are still refused.
- Colleagues are not listed on open. A search field and a Search button return up to six matches by name;
  an empty search lists the first six. Admin sees addresses, Staff and Head do not.
- Location is captured, not typed: "Share my location" asks the browser, stores latitude, longitude and
  accuracy, and a refusal is a sentence that does not block submit. `ReportLocation` replaced the string.
- Attachments read as a dashed "Add files" tile and rows carry a file glyph, the formatted size and
  "Not uploaded".
- The divider above the save row is gone, and the phone's Submit report moved from a pinned bar to the end
  of the page, so it appears when the person scrolls to the bottom.

Verified at 390 and 1440: three editors each with six tools, a bulleted list persists as `<ul><li>`, the
counter reads 113 characters for that list, "Nobody is listed until you search" precedes the search, the
Search button returns the match, and the page ends with the in-flow Submit report with no rule above it.
`tsc` clean, `npm test` 38/38, build 15/15 pages, biome clean, detector `[]`, no em dashes.
