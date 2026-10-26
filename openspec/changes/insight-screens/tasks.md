## 1. Rules and tests (FE)

- [ ] 1.1 `scripts/home.test.ts` red: the attention list differs by role; an Admin with nothing behind gets a
      sentence, not an empty card; a read-only Workspace changes the state.
- [ ] 1.2 `scripts/notifications.test.ts` red: the unread count is a number; two fixed categories have no
      switch; a decision notifies the author only.
- [ ] 1.3 `scripts/search.test.ts` red: scope per role; a draft never appears; an address appears only for an
      Admin; grouping order and the five-per-group cap.
- [ ] 1.4 `scripts/analytics.test.ts` red: coverage on every figure; the in-progress label; the small-sample
      flag below five Reports; My record scoped to the person.

## 2. Home (FE)

- [ ] 2.1 `/dashboard` becomes the role's attention list plus summary cards, keeping the existing action slot.
- [ ] 2.2 Each item links to the screen that fixes it; loading, error with Retry, empty per role, read-only.

## 3. Notifications (FE)

- [x] 3.0 Shipped early: the supplied two-tone bell at 20px with a red unread badge, capped at 99+, silent at
      zero, and an accessible name that reads the count. The sample list lives in `src/data/notifications.ts`
      and `unreadCount` and `badgeLabel` are tested. The control stays disabled and says the popover arrives
      here.
- [ ] 3.1 Bell popover with a numeric unread count and the newest items.
- [ ] 3.2 `/dashboard/notifications`: list with Read and Unread filters and counts, mark one and mark all.
- [ ] 3.3 Preferences: per-category email switches, with invitation and security fixed and explained.

## 4. Search (FE)

- [ ] 4.1 Overlay from the sidebar control and the platform shortcut, with the hint shown per platform.
- [ ] 4.2 Grouped results with marked snippets, arrow-key movement, Enter to open, Escape to close, focus
      restored.
- [ ] 4.3 `/dashboard/search` for the full result list, reusing the same index function and scope.

## 5. Analytics (FE)

- [ ] 5.1 `/dashboard/analytics`: period selector, Space filter, four cards with coverage, trend, Space
      comparison, KPI cards, late-or-missing grouped by state.
- [ ] 5.2 Every chart has a table view; no leaderboard anywhere.
- [ ] 5.3 `/dashboard/my-record` for Staff, with the same coverage rules.

## 6. Validation (FE)

- [ ] 6.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 6.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 6.3 Browser pass as Staff, Head and Admin, 1440 and 390, both themes: each surface, the four states,
      keyboard-only search, table views, read-only Workspace.
- [ ] 6.4 Console and network clean; em dash scan; ROADMAP row; `openspec validate --all --strict`.

## 7. From review

- [ ] 7.1 Preferences move to `/dashboard/account/notifications`, profile to `/dashboard/account/profile`.
- [ ] 7.2 Analytics cards defined as On-time rate, Late, Missing and Average time to decision (submission to
      first decision); KPI cards read "N of M Reports included this figure"; a Head's Space filter is locked; the
      five-Report threshold marked as an assumption.
- [ ] 7.3 Search: an author finds their own draft labelled Draft, everyone finds Members and non-archived Spaces,
      recent searches per Membership cleared at sign-out.
- [ ] 7.4 Notification categories, tags send nothing, "new Report" routed through the queue scope function.
- [ ] 7.5 Neutral bell badge in place of the red one shipped earlier.
- [ ] 7.6 Home lists recent decisions for Staff.

## Validation, step 1 (Home)

Run on 2026-10-26 from `reportlee-frontend-new`.

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | 149 pass, 0 fail (was 135) |
| Red first | `scripts/home.test.ts` before `src/lib/home.ts` | `ERR_MODULE_NOT_FOUND`, then 10 expectations green |
| Build | `npm run build` | compiled in 3.6s, 22/22 pages |
| Detector | `impeccable detect` on the Home screen | `[]` |

Browser, dark, 1440:

- Admin in Kano: "Good evening, Amara", period and deadline, then Reports waiting for a decision (4) and People who have not submitted (4, naming them). No author cards, because an Admin authors nothing.
- Staff in Arthurite: Tasks assigned to you (2, naming them) and Recent decisions reading Changes requested and Approved.

## Decision clocks, 2026-10-26

The gap recorded in `review-queue` is closed. `seenOnOpen(report, viewer, now)` in `src/lib/report-view.ts` is the
only thing that decides the two clocks: a reviewer opening the Report page sets `firstSeenAt` once and
`windowStartedAt` on first look at the current version, an author reading their own Report writes nothing, and a
Reopen clears `windowStartedAt` so the next look starts a fresh window while `firstSeenAt` survives. Four
expectations in `scripts/report-view.test.ts` pin it, and the browser shows First seen, Locks 30 minutes later and
a "Seen by reviewer" timeline entry on `rpt_unseen`.

## Still open in this change

- Notifications, search and analytics.
