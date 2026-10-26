# Design: shared-records

| Area | Choice |
|---|---|
| Comment | one type in `src/data/reports.ts` with `kind: "comment" | "decision"`; a decision reason IS a comment |
| Audit | `src/lib/audit.ts` with `record(entry)`, `readEntries(filter)`, append-only, stored per Membership |
| Events | `src/lib/events.ts` turns a change into per-Membership events and reuses the queue's scope function |
| Gate | `src/lib/entitlements.ts` with one `entitlement(plan, feature)` query and a matrix that is data |
| Hidden Reports | `visibleTo(plan, now)` over `submittedAt`, used by every reader |
| Storage | one key family under `reportlee.*`, keyed by Membership, cleared at sign-out |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | A decision reason is a comment | The Report page already renders comments; a second field would need a second renderer and could drift |
| D2 | Audit entries are written by the simulate functions, not by components | A component that forgets to log is indistinguishable from a change that did not happen |
| D3 | Events are derived in one place | Notifications, the bell count and the queue all ask the same question |
| D4 | The gate returns a reason, never a boolean | A boolean forces every caller to invent the copy, and one of them will invent nothing |
| D5 | Hidden Reports are excluded by a function over the plan | Four screens remembering a retention window is four chances to leak an old Report |
| D6 | Tags produce no events | A tag grants no access and asks nothing; telling someone they were tagged is noise dressed as a feature |
| D7 | Entitlements are presentation only, and the spec says so | Hiding a control is not a rule; the server enforces the same matrix |
| D8 | The trial is treated as Team for gating | A trial that cannot test the paid features is a 30 day dead end |

## Rejected

- A comment field on the Report for decisions: two sources for the same sentence.
- An audit log written in the UI layer: reads, renders and re-renders would all be candidates.
- Per-screen plan checks: nine screens, nine chances to disagree with the billing page.
- A hard-coded retention constant on Starter inside the list screen: the Assistant and search would not know it.
- A separate events store from the notifications: the bell count and the list would diverge on first use.

## Known ceiling

Everything is on this device and cleared at sign out. The audit log is append-only in the UI only, because a
browser cannot refuse a write. The matrix is sample data; the server must own it. Two asked-for behaviours are
stated as assumptions above: the trial mapping to Team, and the 30 day Starter window it inherits.
