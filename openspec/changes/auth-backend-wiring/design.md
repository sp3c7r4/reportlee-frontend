## Context

Backend `reportlee-backend` (read-only here) serves `/api/v1/auth/*`. Base URL comes from
`NEXT_PUBLIC_API_URL` only.

## Decisions

| ID | Decision | Status |
|---|---|---|
| D1 | Roles: backend `admin` to `admin`, `member` to `staff`; `head` unreachable | Approved 2026-11-11 |
| D2 | Signup sends `role: "admin"`; no role picker | Approved 2026-11-11 |
| D3 | Access and refresh tokens in memory only; reload signs out | Approved 2026-11-11 |
| D4 | `SIMULATED_AUTH = false` (flag flip, no env switch) | Approved 2026-11-11 |
| D5 | `OAuthButtons` renders nothing while live | Approved 2026-11-11 |

## Backend

No backend change. Contract read from the backend code:

| Endpoint | Auth | Body | `data` |
|---|---|---|---|
| POST /auth/signup | none | firstName, lastName, email, password, role | message, token |
| POST /auth/login | none | email, password, loginType "password" or email, loginType "otp" | tokens and user, or message and token |
| POST /auth/verify-email | Bearer verification token | otp (6 chars) | tokens and user, or accessToken for reset |
| POST /auth/resend-otp | Bearer verification token | empty | message, new token |
| POST /auth/forgot-password | none | email | message, accessToken |
| POST /auth/reset-password | Bearer token from verify | password | message |
| POST /auth/refresh | none | refreshToken | accessToken, refreshToken (rotates) |
| POST /auth/logout | Bearer access token | refreshToken | message |
| GET /auth/me | Bearer access token | none | user at `data.data` |

Errors: `error.message` for app errors (401 or 404 for bad credentials); a field map keyed by path for Zod
400s, where the empty key means password. Refresh failure with an expired token is a 400.

## Data

No data change.

## Frontend

Calls live in `src/lib/auth.ts`; forms only call those functions. Real and simulated branches return the same
shape. Verification tokens stay in flow state (session storage) as before. Local email delivery is not
configured, so code based flows cannot be tested end to end locally.

## Rejected alternatives

- Refresh token in session storage: breaks the memory-only rule.
- Env driven switch for `SIMULATED_AUTH`: a provider switch change that needs separate approval.

## Order of work

Tokens store, pure helpers with tests, `auth.ts` real branch, forms, shell, verification.

## Acceptance checks

- AC1: sign in sends `loginType` and stores the pair in memory.
- AC2: field errors show next to fields.
- AC3: one refresh and one retry on 401, shared across parallel calls.
- AC4: sign out sends the latest refresh token and always clears tokens.
- AC5: `tsc`, `biome`, `npm test` and `npm run build` pass.
