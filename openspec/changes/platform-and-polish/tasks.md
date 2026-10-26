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

## Validation, 2026-10-26

| Step | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean (the generated route validator cache is stale after adding `/super-admin`, rebuilt by `npm run build`) |
| Tests | `npm test` | 190 pass, 0 fail (was 166) |
| Build | `npm run build` | 33/33 pages, including `/super-admin` and `/super-admin/workspaces/[id]` |
| Detector | `impeccable detect` on the three screens | `[]` |
| Specs | `openspec validate --all --strict` | 11 passed, 0 failed |

Browser, dark, 1440:

- Settings on Starter: the schedule reads "Weekly, starting Mondays at 17:00 (Africa/Lagos). Takes effect from the period starting Mon 2 Nov 2026.", the AI switch is disabled with "Team includes the Assistant and AI drafting", Export reports is enabled and Audit file is disabled with "Enterprise".
- Assistant on Starter: input disabled, the same gate reason, suggestions visible but inert.
- Console at `/super-admin`: four Workspaces with plan state, no dashboard navigation anywhere, and the operator note. Opening Meridian writes "Opened Meridian Health Trust content" to the log before the read-only banner renders, and there is no Workspace switcher.

## Polish audit, 2026-10-26

| Screen | Render | Console | 200% zoom | Names | Touch targets | Notes |
|---|---|---|---|---|---|---|
| `/dashboard` | 200, one h1 | clean | no scroll, nothing clipped | every button named | 44px from sm up | Empty state reads "Nothing needs you right now" |
| `/dashboard/reports` | 200 | clean | clean | named | 44px | Filters are tabs, rows a grid |
| `/dashboard/reports/new` | 200 | clean | clean | named | 44px | Draft with AI states its gate |
| `/dashboard/reports/[id]` | 200 | clean | clean | named | 44px | Details and Timeline start level with the title |
| `/dashboard/review` | 200 | clean | clean | named | 44px | Reasons required on Reject and Reopen |
| `/dashboard/tasks` | 200 | clean | clean | named | 44px | Drag is pointer only; Move to covers phones |
| `/dashboard/members` | 200 | clean | clean | named | 36px row actions, 44px at phone width | Nowrap lives on action chips, not prose |
| `/dashboard/spaces` and one Space | 200 | clean | clean | named | 44px | Archive states its guard |
| `/dashboard/notifications` and preferences | 200 | clean | clean | switches named | 44px | Invitations and security have no switch |
| `/dashboard/search` | 200 | clean | clean | named | 44px | Overlay scrim matches the dialog |
| `/dashboard/analytics` and `/dashboard/my-record` | 200 | clean | clean | named | 44px | Small-sample banner; table view |
| `/dashboard/settings` and audit | 200 | clean | clean | named | 44px | One banner, no money computed |
| `/dashboard/assistant` | 200 | clean | clean | named | 44px | Gate sentence when the plan or switch blocks it |
| `/super-admin` and one Workspace | 200 | clean | clean | named | 44px | No dashboard navigation; audit written before the read |

Every route answered 200 with a title and a non-empty body. The dashboard routes carry the shell; the console does
not, which is the isolation the spec asks for.

## Still open in this change

- A positive Assistant answer is unreachable in the browser with the current samples: the only Admin Membership is in a Starter Workspace with AI off. `scripts/assistant.test.ts` proves the answers, and one Team Workspace with an Admin Membership would make it clickable.
- Row action chips in the members table are 36px tall from `sm` up. The 44px floor holds at phone width; on desktop the tablet target convention was chosen deliberately.
- No screen-reader software was run; the pass checked accessible names, one h1 per page and switch roles in the served markup.
