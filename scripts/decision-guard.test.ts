import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_NOW, SAMPLE_REPORTS } from "../src/data/reports.ts";
import { decisionGuard } from "../src/lib/review.ts";

/* @info - Which decision buttons are live. The server repeats every rule; this keeps
   the controls honest: an approved report can only be reopened, and only an approved
   report can be reopened. */
const reviewer = {
  membershipId: "mem_admin",
  role: "admin" as const,
  space: null,
};
const base = {
  ...SAMPLE_REPORTS[0],
  authorMembershipId: "mem_staff",
  submissionStatus: "submitted" as const,
};
const withStatus = (reviewStatus: "pending" | "approved" | "rejected") => ({
  ...base,
  reviewStatus,
});
const ask = (
  decision: "approve" | "reject" | "reopen",
  reviewStatus: "pending" | "approved" | "rejected",
  extra: { readOnly?: boolean; viewer?: typeof reviewer } = {},
) =>
  decisionGuard({
    report: withStatus(reviewStatus),
    viewer: extra.viewer ?? reviewer,
    readOnly: extra.readOnly ?? false,
    now: SAMPLE_NOW,
    decision,
  });

test("a pending report can be approved or rejected but not reopened", () => {
  assert.equal(ask("approve", "pending").allowed, true);
  assert.equal(ask("reject", "pending").allowed, true);
  const reopen = ask("reopen", "pending");
  assert.equal(reopen.allowed, false);
  assert.equal(reopen.reason, "Only an approved Report can be reopened.");
});

test("an approved report can only be reopened", () => {
  assert.equal(ask("reopen", "approved").allowed, true);
  const approve = ask("approve", "approved");
  assert.equal(approve.allowed, false);
  assert.match(approve.reason ?? "", /Reopen it first/);
  assert.equal(ask("reject", "approved").allowed, false);
});

test("a rejected report can be approved again, not reopened", () => {
  assert.equal(ask("approve", "rejected").allowed, true);
  assert.equal(ask("reopen", "rejected").allowed, false);
});

test("staff, the author and a read-only Workspace block every decision", () => {
  const staff = { membershipId: "mem_x", role: "staff" as const, space: "Ops" };
  assert.equal(ask("approve", "pending", { viewer: staff }).allowed, false);
  const author = { ...reviewer, membershipId: "mem_staff" };
  assert.equal(ask("approve", "pending", { viewer: author }).allowed, false);
  assert.equal(ask("reopen", "approved", { readOnly: true }).allowed, false);
});
