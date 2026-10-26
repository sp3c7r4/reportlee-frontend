import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import {
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
} from "../src/data/reports.ts";
import {
  canDecide,
  decisionBlocked,
  missingFor,
  queueFor,
} from "../src/lib/review.ts";

/* @info - The reviewer's rules, written from the review-queue spec before the module
   existed: scope by role, who counts as missing, and which decisions are refused. */

const admin = {
  membershipId: "mem_admin",
  role: "admin" as const,
  space: null,
};
const head = {
  membershipId: "mem_head_platform",
  role: "head" as const,
  space: "Platform",
};
const staff = {
  membershipId: "mem_staff",
  role: "staff" as const,
  space: "Platform",
};

const periodId = SAMPLE_PERIOD.id;

/** The samples carry no draft and no Report by the Kano Head, so those cases are built. */
function with_(overrides: Partial<(typeof SAMPLE_REPORTS)[number]>) {
  const base = SAMPLE_REPORTS[1];
  return { ...base, ...overrides };
}

test("an Admin sees every submitted Report in the Workspace", () => {
  const rows = queueFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: admin,
    periodId,
  });
  const known = new Set(CO_LEAGUE_ROSTER.map((member) => member.membershipId));
  const submitted = SAMPLE_REPORTS.filter(
    (report) =>
      report.periodId === periodId &&
      report.submissionStatus !== "draft" &&
      known.has(report.authorMembershipId),
  );
  assert.equal(rows.length, submitted.length);
});

test("a Head sees only their own Space's Reports", () => {
  const rows = queueFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: head,
    periodId,
  });
  const platformAuthors = new Set(
    CO_LEAGUE_ROSTER.filter((member) => member.space === "Platform").map(
      (member) => member.membershipId,
    ),
  );
  assert.ok(rows.length > 0);
  assert.equal(
    rows.every((report) => platformAuthors.has(report.authorMembershipId)),
    true,
  );
});

test("a Head never sees their own Report in the queue", () => {
  const rows = queueFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: head,
    periodId,
  });
  assert.equal(
    rows.some((report) => report.authorMembershipId === head.membershipId),
    false,
  );
});

test("Staff have no queue", () => {
  const rows = queueFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: staff,
    periodId,
  });
  assert.deepEqual(rows, []);
});

test("a draft never reaches the queue", () => {
  const rows = queueFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: admin,
    periodId,
  });
  assert.equal(
    rows.some((report) => report.submissionStatus === "draft"),
    false,
  );
});

test("missing lists Staff and Heads, never an Admin", () => {
  const rows = missingFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: admin,
    periodId,
  });
  assert.ok(rows.length > 0);
  assert.equal(
    rows.some((row) => row.role === "admin"),
    false,
  );
});

test("a Head's missing list stops at their own Space", () => {
  const rows = missingFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: head,
    periodId,
  });
  assert.equal(
    rows.every((row) => row.space === "Platform"),
    true,
  );
});

test("somebody with a draft but no submission is missing", () => {
  const draft = with_({
    id: "rpt_draft_tunde",
    authorMembershipId: "mem_tunde",
    submissionStatus: "draft",
  });
  const rows = missingFor({
    reports: [...SAMPLE_REPORTS, draft],
    roster: CO_LEAGUE_ROSTER,
    viewer: admin,
    periodId,
  });
  const drafted = rows.find((row) => row.membershipId === "mem_tunde");
  assert.ok(drafted, "a draft never counts as submitted");
  assert.equal(drafted.submitted, false);
  assert.equal(drafted.hasDraft, true);

  const submitted = missingFor({
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    viewer: admin,
    periodId,
  });
  assert.equal(
    submitted.some((row) => row.membershipId === "mem_staff"),
    false,
    "somebody who submitted is not on the missing list",
  );
});

test("a read-only Workspace accepts no decision", () => {
  const report = SAMPLE_REPORTS.find((row) => row.reviewStatus === "pending");
  assert.ok(report);
  const guard = canDecide({
    report,
    viewer: admin,
    readOnly: true,
    now: SAMPLE_NOW,
  });
  assert.equal(guard.allowed, false);
  assert.match(guard.reason ?? "", /read-only/i);
});

test("an approved Report is not decided again without reopening", () => {
  const report = SAMPLE_REPORTS.find((row) => row.reviewStatus === "approved");
  assert.ok(report);
  const guard = canDecide({
    report,
    viewer: admin,
    readOnly: false,
    now: SAMPLE_NOW,
  });
  assert.equal(guard.allowed, false);
  assert.match(guard.reason ?? "", /Reopen/i);
});

test("a pending Report can be decided", () => {
  const report = SAMPLE_REPORTS.find((row) => row.reviewStatus === "pending");
  assert.ok(report);
  const guard = canDecide({
    report,
    viewer: admin,
    readOnly: false,
    now: SAMPLE_NOW,
  });
  assert.equal(guard.allowed, true);
});

test("an author cannot decide on their own Report", () => {
  const own = with_({ id: "rpt_own", authorMembershipId: head.membershipId });
  const guard = canDecide({
    report: own,
    viewer: head,
    readOnly: false,
    now: SAMPLE_NOW,
  });
  assert.equal(guard.allowed, false);
  assert.match(guard.reason ?? "", /your own Report/i);
});

test("Reject and Reopen need a reason, Approve does not", () => {
  assert.equal(decisionBlocked("approve", ""), null);
  assert.match(decisionBlocked("reject", "  ") ?? "", /reason/i);
  assert.equal(decisionBlocked("reject", "Numbers do not match."), null);
  assert.match(decisionBlocked("reopen", "") ?? "", /reason/i);
});
