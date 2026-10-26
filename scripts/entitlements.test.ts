import assert from "node:assert/strict";
import test from "node:test";
import type { Report } from "../src/data/reports.ts";
import {
  entitlement,
  type Feature,
  visibleTo,
} from "../src/lib/entitlements.ts";

/* @info - The matrix is the one place a plan answer lives, and the retention rule is
   the one place an old Report disappears. Both are read by four screens, so both are
   pinned here with the plan names written out. */

const FEATURES: Feature[] = [
  "trends",
  "spaceComparison",
  "kpiCards",
  "assistant",
  "aiDrafting",
  "locationTagging",
  "auditExport",
  "reportsExport",
];

test("Starter gets the cards and the list, nothing else", () => {
  const allowed = FEATURES.filter(
    (feature) => entitlement("starter", feature).allowed,
  );
  assert.deepEqual(allowed, ["reportsExport"]);
});

test("Team adds the growth features and location", () => {
  for (const feature of [
    "trends",
    "spaceComparison",
    "kpiCards",
    "assistant",
    "aiDrafting",
    "locationTagging",
    "reportsExport",
  ] as Feature[]) {
    assert.equal(entitlement("team", feature).allowed, true, feature);
  }
  assert.equal(entitlement("team", "auditExport").allowed, false);
});

test("Enterprise adds the audit file", () => {
  assert.equal(entitlement("enterprise", "auditExport").allowed, true);
});

test("a locked feature names the plan that unlocks it", () => {
  const locked = entitlement("starter", "trends");
  assert.equal(locked.allowed, false);
  if (locked.allowed) return;
  assert.match(locked.reason, /Team/);
  assert.equal(locked.unlockPlan, "team");

  const audit = entitlement("team", "auditExport");
  assert.equal(audit.allowed, false);
  if (audit.allowed) return;
  assert.match(audit.reason, /Enterprise/);
});

test("a trial is gated as Team", () => {
  assert.equal(entitlement("trial", "trends").allowed, true);
  assert.equal(entitlement("trial", "auditExport").allowed, false);
});

const NOW = "2026-10-26T10:00:00.000Z";
const report = (daysAgo: number): Report =>
  ({
    id: `rpt_${daysAgo}`,
    submittedAt: new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString(),
  }) as Report;

test("hidden Reports fall out of every reader on Starter", () => {
  const rows = [report(2), report(45)];
  assert.deepEqual(
    visibleTo(rows, "starter", NOW).map((r) => r.id),
    ["rpt_2"],
  );
  assert.deepEqual(
    visibleTo(rows, "team", NOW).map((r) => r.id),
    ["rpt_2", "rpt_45"],
  );
});
