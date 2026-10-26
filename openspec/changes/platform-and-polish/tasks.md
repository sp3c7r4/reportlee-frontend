## 1. Rules and tests (FE)

- [ ] 1.1 `scripts/settings.test.ts` red: Save changes is disabled until a field changes; a schedule change
      names the period it starts from; the AI switch applies on save; a read-only Workspace names what an Admin
      can still do.
- [ ] 1.2 `scripts/assistant.test.ts` red: Admin only; AI off greys rather than hides; the context chip narrows;
      every answer carries coverage and sources; a conversation belongs to one Admin.
- [ ] 1.3 `scripts/super-admin.test.ts` red: no Workspace switcher; Super Admin absent from role pickers; a
      rename keeps the old address and writes an audit entry; money is passed through, never computed.

## 2. Settings (FE)

- [ ] 2.1 `/dashboard/settings` with General, Reporting, AI features, Plan and billing, Audit log, Data export,
      each at its own address.
- [ ] 2.2 One form component with the dirty comparison, the changed fields named, and success and failure
      handled beside the form.
- [ ] 2.3 Reporting: schedule cadence and deadline, the effective date, edit window, location tagging.
- [ ] 2.4 AI features: the switch, its notice, and the greyed Assistant everywhere.
- [ ] 2.5 Billing: plan, status and next payment as returned; checkout opens the hosted page.
- [ ] 2.6 The read-only banner in the shell, on every screen, naming what an Admin can still do.

## 3. Assistant (FE)

- [ ] 3.1 Docked panel for Admins with a context chip and an expand control.
- [ ] 3.2 `/dashboard/assistant` with history, a transcript, coverage lines and source links.
- [ ] 3.3 Off state greyed with its reason; sending, error with Retry and empty states.

## 4. Super Admin console (FE)

- [ ] 4.1 `/super-admin`: Workspace list with search, plan, member count, status and last activity.
- [ ] 4.2 `/super-admin/workspaces/:id`: plan management, URL rename with its confirmation, Admins, Spaces,
      record counts.
- [ ] 4.3 The platform audit log, read-only, with the notice that opening content was recorded.
- [ ] 4.4 No Workspace switcher, no dashboard nav, and no Super Admin in any role picker.

## 5. Polish and audit (FE)

- [ ] 5.1 The audit table in the plan: every screen, light and dark, 1440 and 390, keyboard, reduced motion,
      contrast and the four states, each with what was seen.
- [ ] 5.2 Fix what the table finds, then re-run it once.
- [ ] 5.3 Confirm no orange carries status anywhere, and that every status has a glyph.

## 6. Validation (FE)

- [ ] 6.1 `npx biome check` on the touched files, compared against the previous copy.
- [ ] 6.2 `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] 6.3 Browser pass per role and per screen, both themes, both widths, keyboard only.
- [ ] 6.4 Console and network clean, no request to an AI provider, no mail request; em dash scan.
- [ ] 6.5 ROADMAP row and `openspec validate --all --strict`.

## 7. From review

- [ ] 7.1 Schedule gains the Workspace timezone and cadence-dependent fields.
- [ ] 7.2 AI switch applies instantly with a confirmation and its notice, controls drafting, and shows the plan
      reason on Starter.
- [ ] 7.3 Four banners (trial days left, 14 day grace, past due, read-only) and the suspended-Workspace screen.
- [ ] 7.4 Audit page with filters; export page with Reports, comments and members as CSV and JSON, Assistant
      conversations excluded, each export logged, audit file on Enterprise only.
- [ ] 7.5 Edit-window bounds, the location visibility notice, and the logo marked simulated.
- [ ] 7.6 Assistant: figures equal the analytics module (test), the "Checked N Reports across M Spaces" line, a
      429 state, no draft access, escaped text, structured sources, sidebar opens the panel and the phone tab the
      page.
- [ ] 7.7 Console: suspend and restore, recover a locked-out Admin, rename reusing creation rules with "console"
      reserved and the old address never claimable.
- [ ] 7.8 Polish: the reworded orange rule, the device-storage audit, a screen-reader pass, 200 percent zoom and
      the term audit.
