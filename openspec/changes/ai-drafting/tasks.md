## 1. Rules and tests (FE)

- [ ] 1.1 `scripts/drafting.test.ts` red: the gate needs both the switch and the plan, and returns the reason;
      a suggestion replaces nothing without confirmation; a confirmed suggestion fills all three sections; the
      request body carries no other Membership's content; generated text is stored as escaped text.
- [ ] 1.2 `src/lib/drafting.ts` to green.

## 2. The control (FE)

- [ ] 2.1 "Draft with AI" above the three sections, disabled with its reason when gated.
- [ ] 2.2 Asking writes through the simulated call, shows a sending state, and asks before replacing text.
- [ ] 2.3 Failure keeps the form and offers Retry; success leaves the draft a draft and does not submit.
- [ ] 2.4 Every request appends an audit entry through the shared audit module.

## 3. Validation (FE)

- [ ] 3.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 3.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 3.3 Browser pass at 1440 and 390, both themes: gated states on Starter and Team, filling empty sections,
      refusing to overwrite typed text, a failure path, keyboard only.
- [ ] 3.4 No network request leaves the machine, and no key appears anywhere in the bundle.
- [ ] 3.5 Em dash scan; ROADMAP row; `openspec validate --all --strict`.

## 4. Order

- [ ] 4.1 Build after the assistant change, because it reads the same entitlement and the same audit module.

## Validation, 2026-10-26

`src/lib/drafting.ts` holds `gate` (plan first, switch second), `mergeDraft` (a blank section takes the
suggestion, a filled one waits for a yes), `sanitizeSuggestion` (tags stripped, so the editor only ever gets
text) and a simulated `requestSuggestion`. Six expectations in `scripts/drafting.test.ts` pin them.

The control sits above the three sections in the submit form: it never submits, it audits
`draft.requested`, and when typed text would be replaced it asks Keep my text or Replace first.

`npm test` 190 pass 0 fail, build 33/33, `tsc` clean, detector `[]`.
