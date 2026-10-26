import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import { SAMPLE_NOW, SAMPLE_REPORTS } from "../src/data/reports.ts";
import { SAMPLE_TASKS } from "../src/data/tasks.ts";
import {
  authorOf,
  canComment,
  commentBodies,
  followUpProblem,
  threadsFor,
} from "../src/lib/discussion.ts";

/* @info - Discussion on a Report: who may start a thread, who may reply, and when a
   follow-up task is refused. Written from the spec before the module existed. */

const report =
  SAMPLE_REPORTS.find((row) => row.id === "rpt_rejected") ?? SAMPLE_REPORTS[0];
const author = {
  membershipId: report.authorMembershipId,
  role: "staff" as const,
  space: "Platform",
};
const head = {
  membershipId: "mem_head_platform",
  role: "head" as const,
  space: "Platform",
};
const admin = {
  membershipId: "mem_admin",
  role: "admin" as const,
  space: null,
};
const colleague = {
  membershipId: "mem_tunde",
  role: "staff" as const,
  space: "Platform",
};

test("a reviewer of the Report may start a thread", () => {
  assert.equal(
    canComment({ report, viewer: head, readOnly: false }).allowed,
    true,
  );
  assert.equal(
    canComment({ report, viewer: admin, readOnly: false }).allowed,
    true,
  );
});

test("the author may reply but not start a thread", () => {
  assert.equal(
    canComment({ report, viewer: author, readOnly: false }).allowed,
    true,
  );
  const first = canComment({
    report,
    viewer: author,
    readOnly: false,
    starting: true,
  });
  assert.equal(first.allowed, false);
  assert.match(first.reason ?? "", /reviewer/i);
});

test("a colleague from another Space cannot comment", () => {
  const guard = canComment({ report, viewer: colleague, readOnly: false });
  assert.equal(guard.allowed, false);
});

test("a read-only Workspace accepts no comment", () => {
  const guard = canComment({ report, viewer: head, readOnly: true });
  assert.equal(guard.allowed, false);
  assert.match(guard.reason ?? "", /read-only/i);
});

test("an empty body is refused", () => {
  const guard = canComment({
    report,
    viewer: head,
    readOnly: false,
    body: "   ",
  });
  assert.equal(guard.allowed, false);
  assert.match(guard.reason ?? "", /something/i);
});

test("threads group the discussion by its opener and keep the decision out", () => {
  const threads = threadsFor(report, CO_LEAGUE_ROSTER);
  assert.ok(threads.length > 0);
  assert.equal(
    threads.some((thread) => thread.opener.body === ""),
    false,
  );
  assert.equal(
    threads.flatMap((thread) => thread.replies).length + threads.length,
    report.comments.filter((comment) => comment.kind === "comment").length,
  );
});

test("a follow-up task needs a title, an assignee and a future date", () => {
  assert.match(
    followUpProblem({ title: "", assignee: "", dueAt: "", now: SAMPLE_NOW }) ??
      "",
    /title/i,
  );
  assert.match(
    followUpProblem({
      title: "Fix it",
      assignee: "",
      dueAt: "2026-11-01",
      now: SAMPLE_NOW,
    }) ?? "",
    /assign/i,
  );
  assert.match(
    followUpProblem({
      title: "Fix it",
      assignee: "mem_staff",
      dueAt: "2026-10-01",
      now: SAMPLE_NOW,
    }) ?? "",
    /today/i,
  );
  assert.equal(
    followUpProblem({
      title: "Fix it",
      assignee: "mem_staff",
      dueAt: "2026-11-01",
      now: SAMPLE_NOW,
    }),
    null,
  );
});

test("comments render as text, never as markup", () => {
  const bodies = commentBodies({
    ...report,
    comments: [
      ...report.comments,
      {
        id: "c1",
        reportId: report.id,
        authorMembershipId: head.membershipId,
        body: "<b>bold</b> & text",
        at: SAMPLE_NOW,
        kind: "comment",
      },
    ],
  });
  assert.equal(bodies.includes("<b>bold</b> & text"), true);
});

test("the author of a Report is named from the roster", () => {
  assert.equal(
    authorOf(report, CO_LEAGUE_ROSTER)?.membershipId,
    report.authorMembershipId,
  );
});

test("tasks for a Report are the follow-ups raised on it", () => {
  const tasks = SAMPLE_TASKS.filter((task) => task.reportId === "rpt_rejected");
  assert.ok(tasks.length > 0);
});
