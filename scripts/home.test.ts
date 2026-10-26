import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import {
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
} from "../src/data/reports.ts";
import { SAMPLE_TASKS } from "../src/data/tasks.ts";
import { homeFor } from "../src/lib/home.ts";

/* @info - Home is "what needs you now", so the order of these expectations is the
   product: the author's own Report first, then reviews waiting, then missing people,
   then open tasks. */

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
const author = {
  membershipId: "mem_staff",
  role: "staff" as const,
  space: "Platform",
};

const base = {
  reports: SAMPLE_REPORTS,
  roster: CO_LEAGUE_ROSTER,
  tasks: SAMPLE_TASKS,
  period: SAMPLE_PERIOD,
  now: SAMPLE_NOW,
};

test("Home names the open period and its deadline", () => {
  const home = homeFor({ ...base, viewer: author });
  assert.equal(home.period.label, SAMPLE_PERIOD.label);
  assert.equal(home.period.dueAt, SAMPLE_PERIOD.dueAt);
  assert.equal(home.period.isOpen, true);
});

test("an author who has not submitted is told so first", () => {
  const home = homeFor({ ...base, viewer: author, own: null });
  assert.equal(home.attention[0].kind, "submit");
  assert.match(home.attention[0].title, /Submit|submit/);
});

test("an author with a draft is pointed at the draft, not a new Report", () => {
  const home = homeFor({ ...base, viewer: author, hasDraft: true });
  assert.equal(home.attention[0].kind, "draft");
});

test("an author whose Report is in needs a decision only", () => {
  const home = homeFor({ ...base, viewer: author });
  const kinds = home.attention.map((item) => item.kind);
  assert.equal(kinds.includes("submit"), false);
  assert.equal(kinds.includes("draft"), false);
});

test("a reviewer sees how many Reports are waiting", () => {
  const home = homeFor({ ...base, viewer: admin });
  const waiting = home.attention.find((item) => item.kind === "review");
  assert.ok(waiting);
  assert.match(String(waiting.count), /^\d+$/);
  assert.equal(waiting.href, "/dashboard/review");
});

test("a Head's waiting count stops at their own Space", () => {
  const adminHome = homeFor({ ...base, viewer: admin });
  const headHome = homeFor({ ...base, viewer: head });
  const adminCount =
    adminHome.attention.find((i) => i.kind === "review")?.count ?? 0;
  const headCount =
    headHome.attention.find((i) => i.kind === "review")?.count ?? 0;
  assert.ok(headCount <= adminCount);
});

test("a reviewer is told who has not submitted", () => {
  const home = homeFor({ ...base, viewer: admin });
  const missing = home.attention.find((item) => item.kind === "missing");
  assert.ok(missing);
  assert.equal(missing.count, 4);
});

test("an assignee sees their open tasks, a done one excluded", () => {
  const home = homeFor({ ...base, viewer: author });
  const tasks = home.attention.find((item) => item.kind === "tasks");
  assert.ok(tasks);
  assert.equal(tasks.count, 2);
  assert.equal(tasks.href, "/dashboard/tasks");
});

test("an author sees their recent decisions", () => {
  const home = homeFor({ ...base, viewer: author });
  assert.ok(home.decisions.length > 0);
  assert.equal(
    home.decisions.every((row) => row.label.length > 0),
    true,
  );
});

test("a read-only Workspace offers no submit nudge and no decision list", () => {
  const home = homeFor({ ...base, viewer: author, readOnly: true });
  assert.equal(
    home.attention.some(
      (item) => item.kind === "submit" || item.kind === "draft",
    ),
    false,
  );
  assert.deepEqual(home.decisions, []);
});
