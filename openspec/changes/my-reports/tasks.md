## 1. Shapes and the state table (FE)

- [x] 1.1 `src/data/reports.ts`: `Report` with `firstSeenAt`, `windowStartedAt`, `revisions`, `events`,
      `submittedAt`; `Revision`; `ReportEvent` including a `reopened` kind and its label; `ReportAction`;
      `ReportViewer`. Six samples: not seen, seen inside the window, seen past it, rejected with a reason,
      approved with an open window, and one in a read-only Workspace. No reopened sample.
- [x] 1.2 `scripts/report-view.test.ts` written and run red: approved inside an open window is still
      locked; rejected past a closed window is still editable; unseen is editable and deletable; a
      resubmitted Report (a revision exists) is never deletable; seen inside the window is editable and not
      deletable; seen past it is locked; read-only removes both; the primary action for each row of the
      table; the timeline sorts and labels each event; `lockAt` and `timeLeft` come from
      `windowStartedAt` plus the Workspace's minutes.
- [x] 1.3 `scripts/report-draft.test.ts` gains `htmlToLines`: paragraphs and list items become separate
      lines, `<script>` survives as characters, and no tag is left behind.
- [x] 1.4 `src/lib/report-view.ts` to green, with the precedence as ordered code.

## 2. Edit copy and storage (FE)

- [x] 2.1 `scripts/report-storage.test.ts` gains: the edit copy key is separate from the draft key; the
      handoff is consumed once, so a second `takeHandoff` returns `null`; the hidden set holds ids per
      Membership; signing out clears the draft, the copy, the handoff and the hidden set.
- [x] 2.2 `src/lib/reports.ts` gains `readEditCopy`, `writeEditCopy`, `clearEditCopy`, `takeHandoff`,
      `putHandoff`, `hideReport`, `hiddenReportIds`, `clearReportStateFor` and the four simulated calls.

## 3. The form as an editor (FE)

- [x] 3.1 The form reads the handoff on mount, bypasses the already-submitted screen for edit only, labels
      the action Save changes (Resubmit when the Report was rejected), and autosaves to the edit copy rather
      than the Report.
- [x] 3.2 Save changes writes the Report, records one revision with the previous content and an Edited
      event, clears the copy, and returns to the Report page.
- [x] 3.3 The window is rechecked when Edit is pressed and when Save is pressed; a refusal keeps the text,
      names the lock time in the Workspace's timezone, and offers Copy text.
- [x] 3.4 The already-submitted screen respects the hidden set, so a deleted Report frees the period.

## 4. My reports (FE)

- [x] 4.1 `/dashboard/reports`: the author's draft as a top row reading "Draft, continue", filter chips with
      counts, groups by period, rows with period, state pill, submitted time in the Workspace's zone, late
      marker and the Edited marker.
- [x] 4.2 The Starter note about the 30 day window; older Reports absent for Starter.
- [x] 4.3 Mobile rows as cards; loading, error with Retry, empty per filter and empty overall.

## 5. The Report page (FE)

- [x] 5.1 `/dashboard/reports/:id`: header with the state pill and one primary action, rejection banner,
      sections as escaped plain text with line breaks, KPIs, attachments with no link, colleagues, location.
- [x] 5.2 Sticky panel: period, submitted, first seen, locked at, revision count, who reviews it (Admins
      when the author is the Head of that Space), then the timeline including the Edited and Reopened labels.
- [x] 5.3 Locked, read-only and approved explanations, each naming when or why, in the Workspace's zone.
- [x] 5.4 Delete behind a confirmation, unseen and unrevisioned only, hiding the Report on this device and
      saying the server owns the real delete.
- [x] 5.5 Not-found and forbidden share one message; error offers Retry.
- [x] 5.6 Reviewers read only: no controls, and no seen clock is written.

## 6. Wire the endpoints (FE)

- [x] 6.1 The submit confirmation's View report links to the Report page; the already-submitted state links
      to its Report.
- [x] 6.2 Sign out clears the drafts, the edit copy, the handoff and the hidden set; `src/lib/session.ts`
      untouched.

## 7. Validation (FE)

- [x] 7.1 `npx biome check` on the touched files, compared against the previous copy.
- [x] 7.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [x] 7.3 Browser pass as Staff and as Head of Space, 1440 and 390, dark and light: every filter, each
      sample Report, the draft row, the countdown and lock text in the Workspace's zone, Save changes,
      the closed-window refusal with Copy text, the second visit not reopening, delete and the freed period,
      the read-only Workspace, the not-found message, keyboard only.
- [x] 7.4 Console and network: no errors, no off-host request.
- [x] 7.5 `rg -n "[\u2014\u2013]"` over the touched files.
- [x] 7.6 ROADMAP row and `openspec validate --all --strict`.

## Validation, UI-7

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 54 pass, 0 fail (was 38) |
| Red first | `scripts/report-view.test.ts` and the new storage tests before their modules | `ERR_MODULE_NOT_FOUND` on `src/lib/report-view.ts`, then seven named export failures |
| Build | `npm run build` | compiled in 3.8s, 17/17 pages, `/dashboard/reports` and `/dashboard/reports/[id]` added |
| Lint | `npx biome check` on the touched files | no new diagnostics; the four remaining are pre-existing in untouched files |
| Detector | `impeccable.cmd detect --json` on the page | `[]` |
| Em dashes | `rg -n "[—–]"` on the touched files | none |

Browser, 1440 and 390, dark and light, as Staff, Head of Space and Workspace Admin:

- The list shows five authored Reports for Staff in Arthurite with chips All (5), Pending (4), Approved (1),
  Rejected (0), the Edited marker on the revised row, and "Times shown in Africa/Lagos". Empty filter offers
  Show all. Admin sees the "Admins monitor Reports" panel instead of an empty table.
- Rejected Report as its author: reason in a banner, Edit and resubmit in the header and at the end of the
  page, no Delete (it has been seen), timeline Submitted, Seen, Rejected with the reason.
- Edit handoff: Edit and resubmit opens the form titled Edit report, prefilled, action Resubmit, and the
  handoff key is gone after the first read (second visit is the plain form, proven by unit test).
- Resubmit returns to the Report with Revisions 2, an Edited entry at the end of the timeline, state Pending,
  and the new sentence visible. The action label follows the state back to Edit report.
- Sections render as three paragraphs with no list elements, so stored markup is reduced to text.
- Locked Report as its author: no action, "This Report is locked: the edit window has closed." and a Locks
  row in the details panel.
- Approved inside an open window: still locked, as the precedence test requires.
- Meridian Health Trust (read-only): a Head's own Report shows no Edit and no Delete, says the Workspace is
  read-only, and the panel reads Reviewed by Workspace Admins.
- Phone 390: rows are cards, no horizontal overflow, filters and rows reachable.
- Console: no messages. No off-host requests.

Known gap, stated rather than hidden: deleting a Report is a device-local hide, so the freed period was
proven by unit test and not by a browser click, because no browser surface can observe the server's delete.

## Refinement, 2026-10-26: the state pill, destructive delete, the rail

- The state pair renders as one pill in the tone the review state owns: warning for pending, success for
  approved, destructive for rejected, each with its glyph.
- Delete report reads as destructive at rest (red text, red border) and stays filled on confirm.
- The timeline is a rail: dashed connector, filled circles with white glyphs, animate-in from one spot with
  a 70ms stagger and `motion-reduce:animate-none`, newest event lifted out of the connector.
- Tones: success for submitted, seen and approved; warning for a submitted-but-unseen Report; destructive for
  rejected; and a new `--notice` purple for reopened, added to both palettes.
- The breadcrumb names a single Report instead of repeating "Dashboard", and a test pins it.

Verified in the browser at 1440, dark: pill reads Pending · Submitted in the warning tone; the rail shows
green check, green check, red X with the reason under it, and a neutral pencil for Edited. `tsc` clean,
`npm test` 54/54, build 17/17, biome clean, no em dashes.

## Refinement, 2026-10-26: the pill goes back, the reason becomes an alert

- The state pill returns to what it was: one quiet hairline pill reading "Pending · Submitted", with the tone in
  the border and the text and no filled badge or glyph.
- The reviewer's reason is no longer a tinted pill. It is an alert: 14px radius, a soft tint, a glyph in a circle,
  a "Changes requested" heading, the reason as body text and the time and author underneath. A reopened Report
  uses the same block in the notice tone with "Reopened for changes".
- Delete report is a solid destructive button rather than an outline.

Verified at 1440 in dark: banner radius 14px, tinted background, heading, body and meta line; the pill reads
"Rejected · Submitted" with a hairline. `tsc` clean, `npm test` 76/76, build 17/17, biome clean, no em dashes.

## Refinement, 2026-10-26

The reading column no longer centres itself or pins the pill to the far edge: the page fills the window
from the left, the state pill sits beside the title, KPI values sit next to their label instead of at the
far edge of a 978px column, and the list rows are a three column grid. Details and Timeline now start at
the top of the page, level with the title, because they used to begin below the whole article. Measured at
1440: the title sits at x 100 y 116 and the panel at x 1102 y 108.
