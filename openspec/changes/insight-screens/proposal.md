## Why

Four screens read what the other three wrote: the landing page inside the app, the inbox, the command
palette and the numbers. Without them a signed-in person has to navigate to find out what needs them, and no
figure in the product can be questioned or drilled into.

## What Changes

- Add `/dashboard` as Home: a role-specific "Needs your attention" list and summary cards, replacing the
  placeholder.
- Add the notification bell popover, `/dashboard/notifications` with Read and Unread filters, and
  notification preferences.
- Add the search overlay (Ctrl K on Windows and Linux, Cmd K on macOS), `/dashboard/search`, with grouped
  results, snippets and role scoping.
- Add `/dashboard/analytics` and `/dashboard/my-record`: period selector, Space filter, metric cards, trend,
  Space comparison, KPI cards and the late-or-missing list, each drilling down and each with a table view.
- No new dependency. No backend.

## Capabilities

### New Capabilities

- `home`: what each role is shown first, and what "needs your attention" means per role.
- `notifications`: the bell, the list, the preferences and what cannot be switched off.
- `search`: scope, grouping, snippets and keyboard operation.
- `analytics`: the figures, their coverage, the in-progress and small-sample labels, and the table views.

### Modified Capabilities

None.

## Impact

- New: `src/lib/home.ts`, `src/lib/notifications.ts`, `src/lib/search.ts`, `src/lib/analytics.ts`,
  `src/components/home/`, `src/components/notifications/`, `src/components/search/`,
  `src/components/analytics/`, the four routes, and a test beside each lib module.
- Touched: `src/app/dashboard/page.tsx`, the top bar's bell, the nav's Search and Analytics items.
- Charts are drawn with what is installed; no chart library is added.
