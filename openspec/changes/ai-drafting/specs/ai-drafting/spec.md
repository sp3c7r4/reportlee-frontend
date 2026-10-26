# ai-drafting

## Purpose

A person who does not know how to start gets three paragraphs to edit, instead of a blank page.

No provider is called in this change. The call below is the documented contract, answered by a `simulate*`
function built from the same sample data the report form uses. Keys, guardrails and model access stay in the
backend, and this app never holds one.

## ADDED Requirements

### Requirement: Gated by the switch and the plan

Drafting MUST be offered only when the Workspace's AI features switch is on and the plan includes AI. When it is
not available the control MUST be visible, disabled, and carry the reason, and a request posted anyway MUST be
refused by the server.

#### Scenario: AI off

- **WHEN** the Workspace has AI features off and the form is opened
- **THEN** the control is disabled and says AI is off for this Workspace

#### Scenario: Starter

- **WHEN** a Starter Workspace author opens the form
- **THEN** the control is disabled and names the plan that includes drafting

### Requirement: The author asks, and the author decides

Drafting MUST be started by the author from the form. It MUST NOT submit the Report, MUST NOT change any field the
person has already typed without asking first, and MUST leave everything editable.

#### Scenario: Text already there

- **WHEN** a section already holds the person's own text
- **THEN** drafting asks whether to replace it, and does nothing if the answer is no

#### Scenario: Never submits

- **WHEN** a draft is generated
- **THEN** the Report is still a draft and the submit action is unchanged

### Requirement: It reads the author's own context only

A drafting request MUST carry only the author's own period, Space and KPI template. It MUST NOT read another
person's Report, a comment, or a draft other than the one on screen, and the request body MUST be documented as
such.

#### Scenario: A colleague's Report

- **WHEN** a drafting request is built
- **THEN** it contains no other Membership's content, and a test asserts the request shape

### Requirement: The output is text and is audited

Generated text MUST be treated as untrusted: rendered only inside the editor as text, never as HTML, and MUST be
audited with the period and the Membership that asked. A failed request MUST keep the form as it was.

#### Scenario: A failure

- **WHEN** the drafting call fails
- **THEN** the form keeps its text and a message offers Retry

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Draft | `POST /api/v1/reports/draft-suggestion` | `{ periodId, spaceId, kpiTemplate, typed: boolean }` | `{ accomplishments, challenges, plans }` | 401, 403, 402, 429 |

Guards: `jwt.validateToken`, then the Membership from the token, then the AI switch, then the plan entitlement.
The rate limit is the server's; the client only renders the 429.

## Frontend

- A quiet control above the three sections reading "Draft with AI", with its disabled reason when unavailable.
- Filled text lands in the same editors a person types into, with the save indicator behaving as usual.
- Types: `DraftSuggestion`, `DraftingGate` in `src/lib/drafting.ts`.
