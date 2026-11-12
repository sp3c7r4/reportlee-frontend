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

### Re-check after `npm ci` (2026-11-12)

- `npx tsc --noEmit`: exit 0 in 42 s.
- `npm test`: 228 of 228 pass, 0 fail, 63 s.
- `npx biome check` on the 16 touched `src/` and `scripts/` files, checked from LF copies of the committed
  blobs so CRLF checkout noise is excluded: 0 lint diagnostics. `scripts/auth.test.ts` had one format
  diagnostic, now fixed with `npx biome format --write` on that file only. `login-form.tsx` and `verify-form.tsx`
  keep 2 format diagnostics, both already on `main` (main has 6 across these files). No new diagnostics.

### Manual check against the local stack (2026-11-12)

No browser was available to the agent, so this ran as HTTP requests with `Origin: http://localhost:3000`
against the backend on `localhost:5000` (Postgres and Redis in the `app-db` and `app-cache` containers) and the
frontend dev server on `localhost:3000`. Tokens were held in script variables and never printed.

- CORS preflight `OPTIONS /auth/login`: 204, `Access-Control-Allow-Origin: http://localhost:3000`, allows
  `Content-Type, Authorization`.
- `dev-admin@example.com` password login: 200, `roles=[admin]`, both tokens in the body. `/auth/me` with the
  access token: 200, same email, `roles=[admin]` at `data.data`. Refresh: 200, refresh token rotated. Logout
  with the rotated pair: 200 "Logged out successfully.". Refresh with the logged-out token: 400.
- `dev-member@example.com`: same sequence, same results, `roles=[member]` (maps to frontend `staff`).
- Wrong password: 401 `{"message":"Invalid email or password"}`. `signIn` returns it as `{ ok:false, message }`
  with no field errors, and `login-form.tsx` shows it in the `FormAlert` above the fields. Read from code; the
  rendered alert was not seen in a browser.
- `/auth/me` with no token: 401 "Token not found...". Refresh with a junk token: 401 "Invalid token".
- `GET /login` on the frontend: 200, login form present.
- `GET /dashboard` and `/dashboard/reports` while logged out: 200 with an empty `<body>` (the shell renders
  nothing until a live session answers `/auth/me`, then the client effect calls `router.replace("/login")`).
  The client redirect itself was not observed without a browser. The RSC script payload still carries the
  fake sample identity from `src/data/viewer.ts`; this is the existing sample data, not real personal data,
  and the client check is convenience only, not access control.
- Not run: browser console and network tab review; OTP signup, OTP login and forgot-password (Resend is not
  configured locally, so no code arrives).
