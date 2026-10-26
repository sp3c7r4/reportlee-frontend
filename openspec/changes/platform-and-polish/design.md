# Design: platform-and-polish

| Area | Choice |
|---|---|
| Routes | `/dashboard/settings/...` inside the shell; `/super-admin/...` outside it, with no Workspace context |
| Logic | `src/lib/settings.ts`, `assistant.ts`, `super-admin.ts`, plus the audit pass as a checklist artifact |
| Settings | one form component driven by a field list, so "Save changes waits for a change" is written once |
| Assistant | one transcript component used by the panel and the page, so the two cannot diverge |
| Console | its own layout with no shell, no Workspace switcher and no nav from the product |
| Money | displayed from the API only; no arithmetic anywhere in the app |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | The read-only banner lives in the shell | It is a Workspace-wide truth, so it belongs where every screen passes |
| D2 | Settings saves diff the form against the loaded values | A dirty flag maintained by hand is the classic "Save changes is enabled on open" bug |
| D3 | A schedule change is shown as a date, not a preference | "Takes effect from 2 November" is the sentence an Admin needs |
| D4 | The AI switch greys, never hides | A missing feature looks like a bug; a greyed one with a reason looks like a setting |
| D5 | The Assistant renders sources as filters, not ids | A link that opens the Reports list with the same filter is verifiable; an id is not |
| D6 | The console is a separate layout | Sharing the dashboard shell would put a Workspace switcher on a screen that spans Workspaces |
| D7 | Audit entries are read-only in the UI | An append-only record with an edit button is not a record |
| D8 | The polish pass produces a table with evidence | "Checked" without what was seen is not a check |
| D9 | No new chart or UI dependency for any of these screens | The palette and the primitives already carry them |

| D10 | The AI switch has no Save | A switch with a Save step is a switch people leave half-set |
| D11 | Four banners, exactly one at a time | Two banners means two truths on one screen |
| D12 | Console imports are tested, not trusted | Isolation that is only a convention lasts until the first shortcut |
| D13 | The operator identity is a constant, not a Membership | A Membership would put a Workspace role on somebody who has none |
| D14 | Exports log themselves and exclude conversations | An export is the largest data event a Workspace Admin can cause |

## Rejected

- A settings drawer: six pages with their own addresses is what makes a setting linkable in support.
- An in-app checkout form: payments stop the task, and the hosted page is the safe path.
- Preset questions as the only Assistant input: the panel is a chat, and a chat with three buttons is a menu.
- A Super Admin role inside the dashboard: the console crosses Workspaces, so it cannot live in one.
- Fixing polish issues inline without a record: the audit table is what stops the same defect returning.

## Known ceiling

The Assistant answers are simulated and no model is called. Plan management and billing display sample values,
because money is displayed and never computed here. The console's privileged read is simulated, and the UI says
so in the code; the audit-before-read requirement is stated for the server to keep.
