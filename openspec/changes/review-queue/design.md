# Design: review-queue

| Area | Choice |
|---|---|
| Route | `/dashboard/review`, the href the nav module already uses for both reviewer roles |
| Logic | `src/lib/review.ts`: `queueFor`, `missingFor`, `canDecide`, `decisionBlocker`, pure |
| Decisions | one record per Report, even in bulk, each with its own timestamp |
| Reopen | the semantics recorded in `my-reports`: reason, pending, cleared window |
| Scope | `queueFor(reports, viewer)` mirrors the server and is tested; it is not access control |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | One decision record per Report | "Who approved this" must be answerable from the Report, not a batch log |
| D2 | Reject and Reopen require a reason, Approve does not | The reason is the author's only instruction |
| D3 | Hatched rows say "Not submitted" in words | A pattern alone is invisible to a screen reader |
| D4 | The bulk bar refuses decided Reports | Re-deciding in a batch is how a decision log grows lies |
| D5 | Decisions never touch content | A decision changes state, never the author's words |

| D6 | Opening a Report sets the clocks, a row never does | Seen is about the reviewer having read it; a queue render is not reading |
| D7 | Not-submitted is Staff and Heads only | An Admin authors nothing, so listing them as missing invents a gap |
| D8 | Overrides go Reopen then decide | One action per record, and the timeline then tells the whole truth |

## Rejected

- A modal per Report: the queue is a scanning surface, not a page per row.
- A separate Reopen screen: it is the same surface with one more reason.
- Optimistic updates without a record: a decision that fails silently is worse than a slow one.

## Known ceiling

Decisions live in sample data and on this device. The author's notification is a row once notifications
exist; until then the Report page is the record.
