# Design: report-submit

## Shape

| Area | Choice |
|---|---|
| Route | `/dashboard/reports/new`, so the existing Submit report action has one destination and a report page can later sit at `/dashboard/reports/:id` |
| Data | `src/data/reports.ts` (shapes, sample period, sample KPI template, sample colleagues) and `src/lib/report-draft.ts` (logic, no React) |
| Storage | `localStorage`, key `reportlee.report.draft.<membershipId>.<periodId>`. `sessionStorage` was rejected: a draft that dies with the tab is not a draft |
| Saving | 600 ms debounce, flushed on blur and on `visibilitychange` to hidden; the indicator has three words and one of them is a failure |
| KPI values | `number \| null`. `null` is "not provided", `0` is a measurement, and anything unparseable is refused by name |
| Attachments | metadata only (name, size, type, `uploaded: false`); no upload, no blob, no object URL kept |
| Location | `string \| null`, rendered only when `workspace.locationTagging`; no switch in the form |
| Colleagues | Membership ids, matched on name by an explicit search action; an Admin sees the address, Staff and Head do not |
| Sections | Tiptap rich text, HTML in the draft, rules measured with `htmlToText` |
| Location | `{ latitude, longitude, accuracy }`, captured by the browser |
| Envelope | read `{ success, data }` and `{ success, error }` only with `error.message` as a string |
| Time | one `SAMPLE_NOW` constant; the deadline is formatted with `Intl.DateTimeFormat` in `workspace.timeZone` |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Reuse `SubmissionStatus` and `ReportStatus` from `src/lib/status.ts` | Two vocabularies is how one report reads "Draft" on one screen and "Pending" on another |
| D2 | Logic in `src/lib/report-draft.ts`, no React | The length rules, KPI parsing, colleague cap and deadline resolution are testable with `node --test` |
| D3 | A blank KPI is `null`; `0` is a value; letters are refused | `CONTEXT.md` forbids counting a blank as zero, and coercion is how a typo becomes a data point |
| D4 | Tags store Membership ids | A name changes; the id is what the review screen will resolve against a Member |
| D5 | The colleague cap of 5 is an assumption | No document fixes it; the spec says so and one constant changes it |
| D6 | Location is `workspace.locationTagging` | `docs/LAUNCH-REQUIREMENTS.md` puts location tagging off by default at the Workspace level, not per form |
| D7 | No `authorMembershipId` in the request body | The server reads the Membership from the token; sending it invites a caller to name someone else |
| D8 | One primary action, in the header slot, duplicated for phones | The slot exists for exactly this, and a phone needs it reachable without scrolling to the end of a long form |
| D9 | After submit, confirm on `/dashboard` | The Report page is UI-7; landing on a route that does not exist yet is a worse lie than a confirmation |
| D10 | "Saved just now" only after a successful write | A save indicator that lies is worse than none: people close the tab on it |
| D11 | Two tabs resolve by `updatedAt`, the loser says so | Silent last-write-wins destroys a paragraph someone typed |
| D12 | Storage calls take an injectable `Storage` | The failure path (quota, private mode) is unit-testable without a browser |
| D13 | Attachments say "not uploaded" twice: in the card and on each row after a reload | The UI must not imply a file left the machine |
| D14 | Sign out clears drafts for the Membership | A shared device must not hand the next person someone else's draft; the clearing lives in the shell, not `session.ts` |
| D15 | Blocked states are screens, not disabled buttons | A disabled Submit with no sentence is a dead end; each state names itself |
| D16 | Deadline in `workspace.timeZone` | "Due Friday" means Friday where the Workspace is, not where the reader is |
| D17 | Admin form state is commented as tidiness | `AGENTS.md`: hiding a screen is not access control, and the comment must not imply it is |
| D18 | Tiptap for the three sections, storing HTML | It is already a dependency; a plain textarea loses the lists reviewers read |
| D19 | Length is measured with `htmlToText` | Counting markup would let 40 real characters pass as 50 and would make the counter meaningless |
| D20 | The editor sanitises by construction | Tiptap parses stored HTML into its own schema, so unknown tags never reach the DOM; nothing uses `dangerouslySetInnerHTML` |
| D21 | Location is a browser capture, not a text field | A typed place name is unverifiable; the product question is where the person was, and the browser answers it |
| D22 | Colleagues are fetched on an action, not listed | A Workspace can hold hundreds of Members; a list on open is a wall to scroll and a data leak waiting to be added to |
| D23 | The phone action is in the flow, at the end | A pinned bar covers the last card and the tab bar; an in-flow button appears exactly when the person has finished reading |

## Rejected

- A stepper. The build order says one scrolling page, and a stepper would put the deadline and the draft
  indicator behind a step boundary.
- Storing attachments as base64 in `localStorage`. It blows the quota and implies an upload that did not
  happen.
- A rich text editor for the three sections. Plain text matches what review needs; Tiptap is installed for
  a later surface that actually needs formatting.
- Free-text tags. The user's rule is that tags are colleagues; free text would create a second, unmanaged
  people list.
- Selecting the scenario (on-time, late, already submitted) by query parameter or cookie. One constant and
  the sample rows decide, so the address bar can never change what the screen claims.

## Known ceiling

Everything server-side is simulated: the draft, the deadline, the single-report-per-period rule and
"already submitted". `SAMPLE_NOW` is a constant, so the late case is reached by moving it, and the
already-submitted case by switching to the Membership whose sample report exists. Device-to-device drafts
cannot be simulated honestly, so the UI does not claim them. When the backend lands, the five calls above
replace the `simulate*` bodies and the screens stay as they are.
