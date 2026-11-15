## 1. Build
- [ ] 1.1 BE: signup and `selectRole` hardening. Signup ignores the role, verify saves `member` with `roles: ["member"]`, `selectRole` rejects `admin`. Tests cover AC1, AC2, AC3.
- [ ] 1.2 BE: `PATCH /api/v1/user/:id/role` with guards, one role per user, last admin guard, session update, README note. Tests cover AC4 to AC8.
- [ ] 1.3 FE: signup sends no role, signup destination is `/dashboard`, `canEnterOnboarding` guard in `OnboardingFlow`, simulator shape. Tests cover AC9, AC10.

## 2. Validation

Run on 2026-11-12, branch feat/signup-member-role in both repos, nothing pushed.

### Backend (reportlee-backend, commits 73cadcf and edf7ca5)

| Command | Duration | Result |
|---|---|---|
| `npx tsc --noEmit` | 21 s | pass, 0 errors |
| `npm run check:circular` | 7 s | fail, 1 cycle: `modules/user/user.model.ts > modules/user/user-role.model.ts`. Pre-existing: neither model file is in the diff against `main` (`git diff main..HEAD --name-only`). |
| `npm test` (full, once) | 55 s | pass, 8 files, 44 tests passed, 0 failed |
| `npm run build` | 5 s | pass |

Targeted suites (earlier run): signup-member-role 6, user-role-grant 13, role-guards 4, all passed.
Not covered by unit tests: the advisory lock and last-admin count inside `replaceRoleGuarded` (needs a live database).

### Frontend (reportlee-frontend, commit b655db5)

| Command | Duration | Result |
|---|---|---|
| `npx biome check` on the 7 touched files | 4 s | fail, 6 errors, all format-only on 6 files (line endings). Same 6 errors on the base commit f3f57db (files checked out from f3f57db, then restored), so no new diagnostics. |
| `npx tsc --noEmit` | 12 s | pass, 0 errors |
| `npm test` | 31 s | pass, 231 passed, 0 failed |
| `npm run build` | 113 s | pass |

### OpenSpec

| Command | Duration | Result |
|---|---|---|
| `openspec validate signup-member-role --strict` | 34 s | pass, change is valid |

Em dash check (`Select-String -Pattern "[\u2014\u2013]"`): no hits in the frontend files touched. Backend: 7 hits, all in README or code comments (not user-facing strings).
Manual browser pass: not done (no browser available). Live check against the local stack: not done in this step.
