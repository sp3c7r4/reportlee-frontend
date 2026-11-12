## Why

The auth screens run on `src/lib/auth-simulator.ts`. The backend (`reportlee-backend`, `/api/v1`, port 5000) now
exists with a real auth module. This change points the auth calls at it, so sign up, sign in, verification,
password reset, refresh and sign out are real.

Gate 1 approval: the user approved decisions D1 to D5 as recommended on 2026-11-11.

## What Changes

- Rewrite the live branch of every call in `src/lib/auth.ts` to the backend contract: bodies (including
  `loginType`), the `{ success, data }` envelope, both error shapes (`error.message` and the Zod field map),
  and the `Authorization: Bearer` header.
- Add an in-memory token store (`src/lib/tokens.ts`) and pure helpers (`src/lib/auth-contract.ts`).
- Refresh once on a 401 and retry once, with one shared in-flight refresh. Add `signOut` and `fetchMe`.
- D1 roles: backend `admin` becomes `admin`, backend `member` becomes `staff`. `head` is not produced.
- D2 signup sends `role: "admin"`. No role picker is added.
- D3 tokens live in memory only. A full reload signs the user out.
- D4 `SIMULATED_AUTH = false`. The simulator stays intact (plus one additive `simulateMe`).
- D5 `OAuthButtons` renders nothing while live, because the backend has no OAuth routes.
- Field errors from the API show next to the field in the forms.

## Capabilities

### New Capabilities

- `auth`: how the frontend signs a person in against the backend and keeps the session.

### Modified Capabilities

None.

## Impact

- New: `src/lib/tokens.ts`, `src/lib/auth-contract.ts`, `scripts/auth.test.ts`, `scripts/auth-contract.test.ts`.
- Touched: `src/lib/auth.ts`, `src/lib/auth-simulator.ts`, `src/lib/session.ts`, `src/components/auth/*`,
  `src/components/dashboard/shell.tsx`, `src/components/dashboard/sidebar-footer.tsx`.
- Unchanged: `src/lib/leads.ts` (stays simulated), the backend (read-only), `src/data/`.
- No new dependency.
