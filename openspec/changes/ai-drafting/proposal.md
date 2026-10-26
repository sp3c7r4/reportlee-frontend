## Why

The product promises that the Assistant can fill a Report for its author to edit, and nothing in the app drafts.
The form is plain text and empty, which is where most people stop. Drafting is the smallest feature that makes the
first screen worth opening twice.

## What Changes

- Add simulated AI drafting to the report form: a person asks for a draft, gets text in the three sections, and
  edits it like anything they typed.
- Gate it on the AI features switch and on the plan, using the entitlements module, with the reason shown when it
  is off.
- Drafting MUST NOT submit, MUST NOT overwrite typed text without asking, and MUST NOT read other people's
  Reports.
- Every draft request MUST be audited. No provider is called and no key exists in the app.
- No new dependency. `sentiment` or model access stays in the backend.

## Capabilities

### New Capabilities

- `ai-drafting`: who may ask for a draft, what it may read, what it may write, and how it is gated.

### Modified Capabilities

None. The form's own rules are unchanged; drafting fills the same fields a person could type.

## Impact

- New: `src/lib/drafting.ts`, `src/components/reports/draft-assist.tsx`, `scripts/drafting.test.ts`.
- Touched: `src/components/reports/submit-report.tsx` for the control and the fill behaviour,
  `src/lib/reports.ts` for the simulated call and its audit entry, `src/lib/entitlements.ts` for the feature name.
- No key, token or provider payload is added to the frontend.
