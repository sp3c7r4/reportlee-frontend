# Design: my-reports

## Shape

| Area | Choice |
|---|---|
| Routes | `/dashboard/reports` and `/dashboard/reports/[id]`, matching the nav module's existing "My reports" href |
| Data | `Report` and `ReportEvent` added to `src/data/reports.ts`; `ReportDraft` keeps its meaning (pre-submit) |
| Logic | `src/lib/report-view.ts`, plain functions over `(report, viewer, now)`, no React, so `node --test` holds the state table |
| State table | one `ReportAction` value per viewer and state, rendered by the page; a second copy of the rules is forbidden |
| Table | grouped by period, filter chips with counts, rows on desktop and cards below the medium breakpoint |
| Page | reading column at 760px, sticky panel at 300px; the panel stacks under the report below the large breakpoint |
| Time | the existing `SAMPLE_NOW` constant plus the Workspace's `editWindowMinutes`, never `Date.now()` inside the rules; every display goes through one `Intl.DateTimeFormat` with the Workspace's zone |
| Seen | `firstSeenAt` is permanent and governs Delete; `windowStartedAt` is per version and resets on resubmission |
| Edit | a private copy under its own key; the live Report changes only on Save changes |
| Text | sections render as escaped plain text with line breaks, never HTML |
| Timeline | a vertical rail: dashed connector, one filled circle per event, glyph inside each |
| Tones | success for submitted, seen and approved; warning for pending; destructive for rejected; `--notice` (purple) for reopened |
| State pill | one pill for the pair, in the tone the review state owns, with its glyph |
| Edit | the UI-6 form, loaded through a one-shot handoff key, so there is one editor in the product |
| Delete | confirmation, then hidden on this device through a stored id set, with the simulation stated in the UI |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Rules live in `report-view.ts` as pure functions | The edit window and the delete rule are the two places a reviewer will check; they must be readable and testable without a browser |
| D2 | One `ReportAction` union, not booleans per button | Five conditions spread across three buttons is how a screen shows Edit and Delete at the same time |
| D3 | Seen is permanent and only a reviewer can set it | `CONTEXT.md` is explicit: the author opening a Report never counts as seen |
| D4 | Two clocks: `firstSeenAt` and `windowStartedAt` | One field cannot answer both "was this ever read" and "how long has the author been on the clock", and Delete depends on the first while the countdown depends on the second |
| D4b | Precedence is ordered code, not a pile of booleans | Approved above rejected above unseen above inside-window above locked. Written once, tested at the two seams a boolean mess gets wrong |
| D5 | Unseen and rejected reports are always editable; approved is locked | Same source, stated once in the table rather than in five conditionals |
| D6 | Editing reuses the UI-6 form through a one-shot handoff | A second editor would drift from the first within a week, and the form already owns the draft, the counters and the blocked states |
| D6b | The handoff is a private copy, consumed once | Autosaving into the live Report would publish every keystroke; a key that survives a second visit would silently reopen an old edit |
| D7 | Reviewer actions are absent, not disabled | Approve and Reject belong to review, and a disabled button with no reason is the pattern this project keeps refusing |
| D8 | Delete hides the report on the device and says the server owns the real delete | The alternative is pretending a data write happened |
| D9 | The not-found copy is the same for missing and forbidden | Otherwise the page answers "does this report exist" to anyone who asks |
| D10 | Sample Reports cover five states plus a read-only one, chosen by one `now` | The state table has to be walkable without a query parameter, a cookie or a second sample build |
| D11 | Sections are reduced to plain text for display | The form stores HTML for the editor, but a report is a document; rendering stored markup is how a draft becomes a script tag |
| D12 | Attachments are rows with no link | Nothing was uploaded, so a link would open a file that does not exist |
| D13 | Reviewers get no controls and write no seen clock | Seen belongs to review, and a read that mutates state is the bug that makes the window lie |
| D14 | Reopen behaves like a rejection, and the control lives in review | A reviewer who reopens is asking for a fix, so the author must be able to make it; the control is a review action, not an author one |
| D14b | The state table reads the last decision event | One derivation answers reopened, rejected, approved and approved-again without a second flag that can drift |
| D15 | Starter hides older than 30 days, with a note | `docs/LAUNCH-REQUIREMENTS.md` fixes the window; a silently shorter list is a support ticket |
| D16 | A new `--notice` token for "request changes" | Purple is a fourth meaning in the timeline, and hard-coding a hex would not survive the dark palette |
| D17 | Every circle carries a glyph and the entry carries words | Colour alone fails a screen reader and a colour-blind reviewer |
| D18 | The newest event is lifted out of the rail | The rail answers "what happened", but the person opens the page to learn where the Report is now |

## Rejected

- Editing in place, autosaving the live Report. It publishes half-written sentences and leaves no revision
  to compare against, which is the one thing the screen exists to show.
- An inline editor on the Report page. It duplicates the form's validation, its KPI parsing and its save
  indicator, and the two would disagree within a week.
- A separate `/dashboard/reports/:id/edit` route rendering its own copy of the form. It is the same
  duplication one route further away.
- Approve and Reject on this page now, ahead of the review queue. They need the reason dialog and the
  decision log that review owns, and a half-built decision path is worse than none.
- Computing the countdown with a live ticking interval. One render plus the exact lock time is enough, and
  a timer per row is a leak waiting for the first person to leave the tab open.

## Known ceiling

Four things are simulated and the UI says so or is commented as such: the delete, the edit-window clock (one
`SAMPLE_NOW`), the reviewer's seen clock (never written here) and the 30 day Starter window. The four calls
in the spec replace the `simulate*` bodies when the backend lands, and the state table stays the same. What a
reading reviewer cannot verify is whether the real server refuses a delete after seen and refuses a save
after the window closes: the spec states both, and review has to check them when the endpoints exist. Reopen
is modelled and labelled here, and its control ships with review.
