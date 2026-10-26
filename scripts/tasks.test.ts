import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import { SAMPLE_NOW } from "../src/data/reports.ts";
import { SAMPLE_TASKS } from "../src/data/tasks.ts";
import {
  assigneeProblem,
  dueProblem,
  effectiveView,
  moveTask,
  overdue,
  viewsFor,
  visibleTasks,
} from "../src/lib/tasks.ts";

/* @info - The board's rules, written from the task-board spec before the module
   existed: which views a role gets, who may move a card, and what a move clears. */

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
  membershipId: "mem_tunde",
  role: "staff" as const,
  space: "Platform",
};
const assignee = {
  membershipId: "mem_staff",
  role: "staff" as const,
  space: "Platform",
};

test("a Staff member is offered Assigned to me only", () => {
  assert.deepEqual(viewsFor(staff), ["mine"]);
});

test("a Head is offered three views", () => {
  assert.deepEqual(viewsFor(head), ["mine", "by", "space"]);
});

test("an Admin gets Everyone and never Assigned to me", () => {
  assert.deepEqual(viewsFor(admin), ["by", "all"]);
  assert.equal(viewsFor(admin).includes("mine"), false);
});

test("a view the role is not offered falls back to the first it is", () => {
  assert.equal(effectiveView(admin, "mine"), "by");
  assert.equal(effectiveView(staff, "all"), "mine");
  assert.equal(effectiveView(head, "space"), "space");
});

test("Assigned to me is the tasks assigned to the viewer", () => {
  const rows = visibleTasks({
    tasks: SAMPLE_TASKS,
    roster: CO_LEAGUE_ROSTER,
    viewer: staff,
    view: "mine",
  });
  assert.ok(rows.length > 0);
  assert.equal(
    rows.every((task) => task.assigneeMembershipId === staff.membershipId),
    true,
  );
});

test("an Admin is not offered and cannot reach Assigned to me", () => {
  const rows = visibleTasks({
    tasks: SAMPLE_TASKS,
    roster: CO_LEAGUE_ROSTER,
    viewer: admin,
    view: "mine",
  });
  assert.equal(
    rows.every((task) => task.assigneeMembershipId !== admin.membershipId),
    true,
  );
});

test("a Head's My Space stops at their own Space", () => {
  const rows = visibleTasks({
    tasks: SAMPLE_TASKS,
    roster: CO_LEAGUE_ROSTER,
    viewer: head,
    view: "space",
  });
  assert.ok(rows.length > 0);
  assert.equal(
    rows.every(
      (task) =>
        CO_LEAGUE_ROSTER.find(
          (m) => m.membershipId === task.assigneeMembershipId,
        )?.space === "Platform",
    ),
    true,
  );
});

test("an assignee moves a card in Assigned to me", () => {
  const task = SAMPLE_TASKS.find(
    (row) => row.assigneeMembershipId === staff.membershipId,
  );
  assert.ok(task);
  const moved = moveTask({
    task,
    status: "doing",
    viewer: staff,
    view: "mine",
    now: SAMPLE_NOW,
  });
  assert.equal(moved.ok, true);
  assert.equal(moved.task.status, "doing");
});

test("a reviewer cannot move somebody else's card", () => {
  const task = SAMPLE_TASKS.find(
    (row) => row.assigneeMembershipId === staff.membershipId,
  );
  assert.ok(task);
  const moved = moveTask({
    task,
    status: "done",
    viewer: head,
    view: "space",
    now: SAMPLE_NOW,
  });
  assert.equal(moved.ok, false);
  assert.match(moved.reason ?? "", /assignee/i);
});

test("a read-only Workspace blocks the move", () => {
  const task = SAMPLE_TASKS.find(
    (row) => row.assigneeMembershipId === staff.membershipId,
  );
  assert.ok(task);
  const moved = moveTask({
    task,
    status: "doing",
    viewer: staff,
    view: "mine",
    now: SAMPLE_NOW,
    readOnly: true,
  });
  assert.equal(moved.ok, false);
  assert.match(moved.reason ?? "", /read-only/i);
});

test("leaving Done clears the completion note and file", () => {
  const done = SAMPLE_TASKS.find(
    (row) =>
      row.status === "done" &&
      row.assigneeMembershipId === assignee.membershipId,
  );
  assert.ok(done);
  const moved = moveTask({
    task: done,
    status: "doing",
    viewer: assignee,
    view: "mine",
    now: SAMPLE_NOW,
  });
  assert.equal(moved.ok, true);
  assert.equal(moved.task.completionNote, null);
  assert.equal(moved.task.completionFile, null);
  assert.equal(moved.task.completedAt, null);
});

test("a completion keeps the note it was given", () => {
  const task = SAMPLE_TASKS.find(
    (row) =>
      row.status === "todo" &&
      row.assigneeMembershipId === assignee.membershipId,
  );
  assert.ok(task);
  const moved = moveTask({
    task,
    status: "done",
    viewer: assignee,
    view: "mine",
    now: SAMPLE_NOW,
    note: "Sent the corrected sheet.",
  });
  assert.equal(moved.task.completionNote, "Sent the corrected sheet.");
  assert.ok(moved.task.completedAt);
});

test("a due date is required and cannot be in the past", () => {
  assert.match(dueProblem("", SAMPLE_NOW) ?? "", /due date/i);
  assert.match(dueProblem("2026-10-25", SAMPLE_NOW) ?? "", /today/i);
  assert.equal(dueProblem("2026-10-26", SAMPLE_NOW), null);
  assert.equal(dueProblem("2026-11-02", SAMPLE_NOW), null);
});

test("overdue is measured against the today of the Workspace", () => {
  const late = SAMPLE_TASKS.find(
    (row) => row.dueAt < SAMPLE_NOW && row.status !== "done",
  );
  assert.ok(late);
  assert.equal(overdue(late, SAMPLE_NOW), true);
});

test("a deactivated assignee is flagged so an Admin can reassign", () => {
  const task = SAMPLE_TASKS[0];
  const roster = CO_LEAGUE_ROSTER.map((member) =>
    member.membershipId === task.assigneeMembershipId
      ? { ...member, active: false }
      : member,
  );
  const problem = assigneeProblem(task, roster);
  assert.match(problem ?? "", /deactivated/i);
  assert.equal(assigneeProblem(task, CO_LEAGUE_ROSTER), null);
});
