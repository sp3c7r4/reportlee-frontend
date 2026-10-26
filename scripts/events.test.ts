import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import { eventsFor, reviewersFor } from "../src/lib/events.ts";

/* @info - Events reach one person. The two rules that go wrong first are a decision
   notifying the wrong side and a tag notifying anybody at all. */

test("a decision reaches the author and not the reviewer", () => {
  const events = eventsFor({
    kind: "decision",
    authorMembershipId: "mem_staff",
    actorMembershipId: "mem_admin",
    reportId: "rpt_1",
    at: "2026-10-26T10:00:00.000Z",
    reason: "Say who agreed to it.",
  });
  assert.deepEqual(
    events.map((event) => event.membershipId),
    ["mem_staff"],
  );
  assert.equal(events[0].href, "/dashboard/reports/rpt_1");
  assert.match(events[0].body, /Say who agreed/);
});

test("a comment reaches the other side of the conversation", () => {
  const author = eventsFor({
    kind: "comment",
    authorMembershipId: "mem_staff",
    actorMembershipId: "mem_admin",
    reportId: "rpt_1",
    at: "2026-10-26T10:00:00.000Z",
  });
  assert.deepEqual(
    author.map((event) => event.membershipId),
    ["mem_staff"],
  );

  const reviewer = eventsFor({
    kind: "comment",
    authorMembershipId: "mem_staff",
    actorMembershipId: "mem_staff",
    reportId: "rpt_1",
    at: "2026-10-26T10:00:00.000Z",
    reviewerMembershipIds: ["mem_admin"],
  });
  assert.deepEqual(
    reviewer.map((event) => event.membershipId),
    ["mem_admin"],
  );
});

test("a tag reaches nobody", () => {
  assert.deepEqual(
    eventsFor({
      kind: "tag",
      authorMembershipId: "mem_staff",
      actorMembershipId: "mem_staff",
      reportId: "rpt_1",
      at: "2026-10-26T10:00:00.000Z",
      taggedMembershipIds: ["mem_ifeoma"],
    }),
    [],
  );
});

test("a new Report goes to the Head of its Space", () => {
  const reviewers = reviewersFor({
    space: "Platform",
    members: CO_LEAGUE_ROSTER,
  });
  assert.deepEqual(reviewers, ["mem_head_platform"]);
});

test("a Space with no Head sends its Reports to the Admins", () => {
  const reviewers = reviewersFor({
    space: "Programmes",
    members: CO_LEAGUE_ROSTER,
  });
  assert.deepEqual(reviewers, ["mem_admin", "mem_admin_two"]);
});

test("a submission notifies whoever must review it", () => {
  const events = eventsFor({
    kind: "submitted",
    authorMembershipId: "mem_staff",
    actorMembershipId: "mem_staff",
    reportId: "rpt_1",
    at: "2026-10-26T10:00:00.000Z",
    space: "Platform",
    members: CO_LEAGUE_ROSTER,
  });
  assert.deepEqual(
    events.map((event) => event.membershipId),
    ["mem_head_platform"],
  );
  assert.equal(events[0].href, "/dashboard/review");
});
