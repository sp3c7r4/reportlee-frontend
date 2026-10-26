# Tasks

Frontend only. Tests first. `npm test` runs `node --test scripts/*.test.ts`, so the suite is a plain
Node test file.

## 1. Status vocabulary

- [x] 1.1 Write `scripts/status.test.ts` before the module exists. Assert the label and tone of all
      seven states as literal strings, and assert that draft is neither late nor missing. Run `npm test`
      and record the failure. It must fail because the module is missing, not because of a typo.
- [x] 1.2 Write `src/lib/status.ts`: the two unions, the `StatusTone` union, `StatusEntry`, and two
      tables typed `Record<...>`. No imports. Run `npm test` and record the pass.
- [x] 1.3 Refactor pass: check that adding a member to either union is a compile error before it is a
      silent missing label. Prove it by temporarily removing one entry from a table and running
      `npx tsc --noEmit`, then put it back.

## 2. Theme helpers

- [x] 2.1 Delete `nextTheme` and `themeToggleLabel` from `src/lib/theme.ts`. Confirm with
      `grep -rn "nextTheme\|themeToggleLabel" src scripts` that nothing references them.
- [x] 2.2 Rename the cookie to `reportlee-theme` and give `themeCookie` an optional hostname so it emits
      `domain=reportlee.app` only for `reportlee.app` and `*.reportlee.app`. Leave `iroyin-sidebar` alone
      and record it as backlog.
- [x] 2.3 Write `scripts/theme.test.ts`: `parseTheme` defaults, and `themeCookie` pinned for the name,
      `path`, `samesite`, and the domain present for `reportlee.app` and `team.reportlee.app` and absent
      for `localhost` and `notreportlee.app`. Run `npm test`.
- [x] 2.4 Confirm `(auth)/layout.tsx` and `onboarding/layout.tsx` are untouched and still render the
      dark class from the cookie.

## 3. Validation

- [x] 3.1 `npx biome check` on the touched files, compared against the same files in
      `reportlee-frontend/` so pre-existing diagnostics are not mistaken for new ones.
- [x] 3.2 `npx tsc --noEmit`.
- [x] 3.3 `npm test`.
- [x] 3.4 `npm run build`.
- [x] 3.5 Browser pass: `/login` and `/onboarding` in light and dark, confirming the theme wrapper
      renders as before, with a clear console.
- [x] 3.6 `rg -n "[\u2014\u2013]"` over the touched files, accepting hits only inside comments.
- [x] 3.7 Confirm the diff holds no component, `package.json` is unchanged, and no dependency moved.

## 4. Record

- [x] 4.1 Paste the results under "Validation" in the team plan file. That file was deleted on
      2026-10-26; the results are reproduced in the change's archive record.
- [x] 4.2 Add the row to `docs/ROADMAP.md` once the review has no open blockers.
- [ ] 4.3 Open item, not part of this change: the 12 to 14px legibility check in both themes, owned by UI-1.
