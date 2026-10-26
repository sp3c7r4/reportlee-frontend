# Design: ai-drafting

| Area | Choice |
|---|---|
| Entry | one control above the three sections, inside the existing form, not a second screen |
| Logic | `src/lib/drafting.ts`: `gate(plan, aiEnabled)`, `mergeDraft(current, suggestion, confirmed)`, pure |
| Request | period, Space and KPI template only; no other Membership's content |
| Fill | asks before replacing any section that already has text, then writes into the editors |
| Audit | every request and its outcome recorded through `src/lib/audit.ts` |
| Simulation | a `simulate*` body composed from the sample period and template, clearly labelled as such |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Gate on the switch and the plan through one function | Two conditions checked in two places is how a Starter Workspace gets drafting |
| D2 | Ask before overwriting typed text | Silently replacing somebody's paragraph is the one thing that would stop them trusting the control |
| D3 | Never submit | A machine that files a Report under a person's name is not a drafting feature |
| D4 | Treat output as untrusted text | The model's output is as untrusted as a comment body, and it lands in an editor that accepts HTML |
| D5 | Audit the request and the outcome | "Who asked the model about this period" is a question an Admin will ask |
| D6 | No key, no provider, no prompt in this repository | The frontend cannot hold a secret, and the backend owns guardrails |

## Rejected

- Drafting on model-generated KPIs: a KPI is a measurement, and inventing one is inventing data.
- A separate drafting screen: the form already holds the draft, the counters and the save indicator.
- Streaming tokens into the editor: it fights the autosave debounce and the undo history for no gain at this size.
- Remembering a suggestion to apply later: an unapplied suggestion is a second draft with no owner.

## Known ceiling

The draft is simulated text assembled from sample data. It is honest as a flow and a gate, and it proves nothing
about model quality. When the backend lands, the request body above goes to a guarded endpoint and the simulated
body is deleted.
