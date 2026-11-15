## 1. Build
- [ ] 1.1 BE: signup and `selectRole` hardening. Signup ignores the role, verify saves `member` with `roles: ["member"]`, `selectRole` rejects `admin`. Tests cover AC1, AC2, AC3.
- [ ] 1.2 BE: `PATCH /api/v1/user/:id/role` with guards, one role per user, last admin guard, session update, README note. Tests cover AC4 to AC8.
- [ ] 1.3 FE: signup sends no role, signup destination is `/dashboard`, `canEnterOnboarding` guard in `OnboardingFlow`, simulator shape. Tests cover AC9, AC10.

## 2. Validation
