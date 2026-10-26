# Design: insight-screens

| Area | Choice |
|---|---|
| Routes | `/dashboard` (Home), `/dashboard/notifications`, `/dashboard/search`, `/dashboard/analytics`, `/dashboard/my-record` |
| Logic | one pure module each: `src/lib/home.ts`, `notifications.ts`, `search.ts`, `analytics.ts`, each with a `node --test` suite |
| Charts | hand-drawn SVG with the palette's tones; a chart library would be a new dependency for four simple shapes |
| Coverage | a single `Coverage` type carried by every figure, rendered under each card, and reused by the table views |
| Bell | count from one place, so the popover, the list and the badge cannot disagree |
| Search | one index function that takes the viewer, so every surface uses the same scope |

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Every figure carries a `Coverage` value | "18 of 24" without a period and scope is the most common way analytics lies |
| D2 | Table views are first class, not a fallback | They are the accessible version and the printable one, so they are designed, not generated |
| D3 | No leaderboard, ever | Ranking people turns a reporting product into a surveillance product |
| D4 | Small samples flagged at five Reports | A percentage from one Report is a sentence about one person's week |
| D5 | Search scope is computed once, server-shaped | Two scopes (overlay and full page) is how the overlay leaks a row |
| D6 | Notifications carry a number, never a dot | A dot cannot tell "one thing" from "nine things" and fails a colour-blind reader |
| D7 | Home is "needs your attention" first | The person opens the app to act, not to admire a dashboard |
| D8 | Invitation and security emails are fixed in code | A switch that silently re-enables security mail is a security hole with a UI |

| D9 | An author finds their own draft, labelled Draft | A draft is the author's own work, and hiding it from them in their own search is a bug |
| D10 | The badge is neutral, never red | Unread is not an error; red is reserved for destructive and failure |
| D11 | Four analytics cards with defined measures | "Average time to decision" must say from submission to first decision or two people will read two numbers |
| D12 | The five-Report small-sample threshold is an assumption | No document fixes it, so it is marked and held in one constant |
| D13 | Recent searches are per Membership and cleared at sign-out | Search history on a shared device is somebody else's memory |

## Rejected

- A chart library: four shapes, no interaction, and a dependency the spec would have to stop for.
- An infinite notifications feed: the list is filterable and bounded; a feed invites a scroll nobody finishes.
- Search across every Workspace the person belongs to: the Workspace is the frame, and crossing it would leak
  names between employers.
- Trend series on Home: it is a status page, and the trend belongs where the period selector lives.

## Known ceiling

All four surfaces read sample data and compute on this device. "Small sample", "in progress" and the coverage
lines are real logic and are tested; the numbers themselves are not. The eight calls above replace the
`simulate*` bodies when the backend lands.
