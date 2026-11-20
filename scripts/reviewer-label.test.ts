import assert from "node:assert/strict";
import test from "node:test";
import type { RosterMember } from "../src/data/members.ts";
import { reviewerLabel } from "../src/lib/review.ts";

/* @info - C1: "Reviewed by" names the Head, or the Admins when the rule sends the
   Report to them. Names are made up. */
const member = (
  membershipId: string,
  role: RosterMember["role"],
  space: string | null,
  active = true,
): RosterMember => ({
  membershipId,
  name: `Person ${membershipId}`,
  role,
  space,
  active,
});

const staffAuthor = member("31", "staff", "Ops");
const head = member("12", "head", "Ops");
const report = (authorMembershipId: string) => ({ authorMembershipId });

test("names the Head when the Space has one and the author is Staff", () => {
  assert.equal(
    reviewerLabel({ report: report("31"), roster: [staffAuthor, head] }),
    "Person 12",
  );
});

test("says Workspace admins when the Space has no Head", () => {
  assert.equal(
    reviewerLabel({ report: report("31"), roster: [staffAuthor] }),
    "Workspace admins",
  );
});

test("says Workspace admins when the author is a Head, even in a Space with another Head", () => {
  const otherHead = member("13", "head", "Ops");
  const headAuthor = member("14", "head", "Ops");
  assert.equal(
    reviewerLabel({
      report: report("14"),
      roster: [headAuthor, otherHead, staffAuthor],
    }),
    "Workspace admins",
  );
});

test("says Workspace admins when the Head is deactivated", () => {
  const gone = member("12", "head", "Ops", false);
  assert.equal(
    reviewerLabel({ report: report("31"), roster: [staffAuthor, gone] }),
    "Workspace admins",
  );
});

test("ignores the Head of another Space", () => {
  const other = member("15", "head", "Sales");
  assert.equal(
    reviewerLabel({ report: report("31"), roster: [staffAuthor, other] }),
    "Workspace admins",
  );
});

test("says Workspace admins when the author is not on the roster", () => {
  assert.equal(
    reviewerLabel({ report: report("99"), roster: [head] }),
    "Workspace admins",
  );
});
