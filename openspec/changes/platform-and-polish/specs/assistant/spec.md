# assistant

## Purpose

A read-only AI chat for Workspace Admins, which answers questions about the Workspace and shows where every
number came from.

No provider is wired and no model is called in this change. The panel, the context chip, the sources and the
off state are built against the documented contract, answered by a `simulate*` function. Keys and guardrails
stay in the backend, never in the app.

## ADDED Requirements

### Requirement: Admins only, and greyed when off

The Assistant MUST appear only for a Workspace Admin. When the AI features switch is off it MUST be greyed
with its reason, in the sidebar and anywhere else it is offered, rather than hidden.

#### Scenario: AI off

- **WHEN** the Workspace has AI features off and an Admin opens the app
- **THEN** the Assistant item is greyed with the reason and no panel opens

#### Scenario: A Head of Space

- **WHEN** a Head of Space uses the app
- **THEN** no Assistant entry exists for them

### Requirement: The context chip narrows, never widens

The context chip MUST show what the conversation is scoped to (Workspace, Space, period) and MUST ONLY offer
scopes the Admin can already see. Nothing the Admin could not open through the normal screens may be answered.

#### Scenario: A Space the Admin can see

- **WHEN** the chip is set to one Space
- **THEN** answers cover that Space only, and the chip says so

### Requirement: Every claim links to its sources

Every figure in an answer MUST state how many Reports it covers and MUST link to the Reports behind it. An
answer that cannot be sourced MUST say so instead of asserting a number.

#### Scenario: A count

- **WHEN** the answer says 12 Reports were late
- **THEN** it shows the coverage and a link that opens those 12

### Requirement: The figures are the analytics figures

Every number the Assistant reports MUST come from the same module analytics uses, and a test MUST prove the two
produce the same values for the same period. An answer MUST carry the "Checked N Reports across M Spaces" line.

#### Scenario: The same period

- **WHEN** analytics and the Assistant are asked about one period
- **THEN** their on-time, late and missing numbers are identical

### Requirement: No drafts, ever

The Assistant MUST NOT read a draft, and a question that could only be answered from one MUST say the data is not
available rather than inventing a figure.

#### Scenario: A question about a draft

- **WHEN** an Admin asks what a draft says
- **THEN** the answer says drafts are not readable and no content appears

### Requirement: Answers are text, sources are links

Answer text MUST be escaped and rendered as text with line breaks. Sources MUST be built from structured source
objects and rendered as links that open the matching Reports list, never as raw ids.

#### Scenario: A source

- **WHEN** an answer cites a figure
- **THEN** the source opens the Reports list with the same period and scope

### Requirement: States, including rate limiting

The Assistant MUST have sending, empty with example questions, error with Retry, and a 429 state that names the
limit and says when to try again.

#### Scenario: Rate limited

- **WHEN** the provider answers 429
- **THEN** the transcript keeps the question and the panel says the limit was reached

### Requirement: Two entry points, two shapes

The sidebar item MUST open the docked panel, and the phone tab MUST open the full page at `/dashboard/assistant`.
Neither MUST open the other.

#### Scenario: The phone tab

- **WHEN** the Assistant tab is used at 390px
- **THEN** the full page opens with history

### Requirement: Conversations are private and read-only

A conversation MUST belong to the Admin who started it, MUST be visible only to them, and MUST NOT change any
Workspace data. The Assistant MUST offer no action that writes.

#### Scenario: A second Admin

- **WHEN** another Admin opens the Assistant
- **THEN** they see their own history and none of the first Admin's conversations

### Requirement: The panel and the page

The Assistant MUST be a docked panel on the right with an expand control, and a full page at
`/dashboard/assistant` with the Admin's own history. Both MUST have a sending state, an error state with
Retry, and an empty state with example questions.

#### Scenario: A failed answer

- **WHEN** an answer fails
- **THEN** the question stays in the transcript and a message offers Retry

## API contract (documented, simulated today)

| Call | Method and path | Body | Success `data` | Errors |
|---|---|---|---|---|
| Ask | `POST /api/v1/assistant/messages` | `{ conversationId?, question, context }` | `AssistantMessage` | 401, 403, 429 |
| History | `GET /api/v1/assistant/conversations` | none | `Conversation[]` | 401, 403 |

Guards: `jwt.validateToken`, then a Workspace Admin role guard, then the AI switch, then conversation
ownership. The server applies the Admin's own permissions to every tool call the model asks for.

## Frontend

- A docked panel in the shell for Admins, plus `/dashboard/assistant` with history.
- Sources render as links to the Reports list with the same filter, never as raw ids.
- Types: `AssistantMessage`, `Conversation`, `AssistantContext`, `Source` in `src/lib/assistant.ts`.
