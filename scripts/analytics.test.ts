import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import { SAMPLE_PERIOD, SAMPLE_REPORTS } from "../src/data/reports.ts";
import { analyticsFor, SMALL_SAMPLE } from "../src/lib/analytics.ts";

/* @info - Every figure states its scope and drills down; nothing ranks a person. */

const admin = { membershipId: "mem_admin", role: "admin" as const, space: null };
const head = { membershipId: "mem_head_platform", role: "head" as const, space: "Platform" };
const staff = { membershipId: "mem_staff", role: "staff" as const, space: "Platform" };

const base = { reports: SAMPLE_REPORTS, roster: CO_LEAGUE_ROSTER, period: SAMPLE_PERIOD };

test("every figure carries its coverage", () => {
  const view = analyticsFor({ ...base, viewer: admin });
  assert.ok(view.coverage.expected > 0);
  assert.ok(view.coverage.submitted <= view.coverage.expected);
});

test("the four cards are named and present", () => {
  const view = analyticsFor({ ...base, viewer: admin });
  assert.deepEqual(
    view.cards.map((card) => card.key),
    ["onTime", "late", "missing", "decision"],
  );
  assert.equal(view.cards.every((card) => card.label.length > 0), true);
});

test("a small sample is flagged, not silently averaged", () => {
  const view = analyticsFor({ ...base, viewer: admin });
  assert.equal(view.smallSample, view.coverage.submitted < SMALL_SAMPLE);
});

test("a Staff member's view is their own record only", () => {
  const view = analyticsFor({ ...base, viewer: staff });
  assert.equal(view.scope, "me");
  assert.equal(view.coverage.expected, 1);
});

test("a Head's view is locked to their own Space", () => {
  const view = analyticsFor({ ...base, viewer: head, spaceFilter: "Programmes" });
  assert.equal(view.scope, "space");
  assert.equal(view.spaceFilter, "Platform");
  assert.ok(view.lockedReason);
});

test("KPI cards count how many Reports included the figure", () => {
  const view = analyticsFor({ ...base, viewer: admin });
  assert.ok(view.kpis.length > 0);
  assert.equal(
    view.kpis.every((kpi) => kpi.included <= kpi.total),
    true,
  );
});

test("late and missing people are grouped by state, never ranked", () => {
  const view = analyticsFor({ ...base, viewer: admin });
  assert.ok(Array.isArray(view.groups));
  assert.equal(
    view.groups.every((group) => group.people.every((p) => typeof p === "string")),
    true,
  );
  assert.equal(
    view.groups.some((group) => group.state === "late" || group.state === "missing"),
    true,
  );
});
