## 1. Build

- [x] 1.1 FE: token store `src/lib/tokens.ts` with tests
- [x] 1.2 FE: pure contract helpers `src/lib/auth-contract.ts` with tests
- [x] 1.3 FE: real branch of `src/lib/auth.ts`, refresh, sign out, `fetchMe`, `SIMULATED_AUTH = false`
- [x] 1.4 FE: wire the auth forms, shell and sidebar sign out; hide OAuth buttons while live
- [x] 1.5 FE: sign out re-reads the refresh token on retry (review finding 4)

## 2. Validation

Run on 2026-11-12 on `feat/wire-real-auth`, final tree:

- `openspec validate auth-backend-wiring --strict`: Change 'auth-backend-wiring' is valid.
- `npm run build`: exit 0 in 166 s. Compiled, TypeScript finished, 36 of 36 static pages.
- `npx tsc --noEmit`: exit 0 in 42 s, no errors. The earlier `LayoutProps` error in `src/app/layout.tsx` was
  the missing Next generated types and cleared after the first build.
- `npm test`: 228 of 228 pass, 0 fail.
- `npx biome check` on 5 touched files: 3 `format` diagnostics only (`auth.ts`, `login-form.tsx`,
  `verify-form.tsx`). `auth.ts` differs from biome output only by CRLF line endings (CRLF checkout). The two
  forms also keep their original line wrapping from `main`, kept on purpose to avoid formatter churn. No lint
  diagnostics.
- New test "sign out after an in-call refresh sends the rotated refresh token": fails on the previous
  `signOut` (0 pass, 1 fail), passes now.
- Em dash search over touched files: no matches.
- Not run: a manual browser pass against the local backend.
