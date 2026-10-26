import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER, SPACES } from "../src/data/members.ts";
import { SAMPLE_REPORTS } from "../src/data/reports.ts";
import {
  applyTemplate,
  canEditTemplate,
  reportsInSpace,
  spaceById,
  spaceStats,
} from "../src/lib/spaces.ts";

/* @info - The rules of one Space's page, written from the spec before the module
   existed: who may edit its KPI template, what its figures count, and why a draft
   keeps the rows it started with. */

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
const otherHead = {
  membershipId: "mem_zainab",
  role: "head" as const,
  space: "Programmes",
};
const staff = {
  membershipId: "mem_staff",
  role: "staff" as const,
  space: "Platform",
};

test("an unknown Space is not found", () => {
  assert.equal(spaceById(SPACES, "sp_nowhere"), null);
  assert.equal(spaceById(SPACES, "sp_platform")?.name, "Platform");
});

test("a Space's Reports are those written by its people", () => {
  const inPlatform = reportsInSpace(
    SAMPLE_REPORTS,
    CO_LEAGUE_ROSTER,
    "Platform",
  );
  assert.ok(inPlatform.length >= 3);
  assert.equal(
    inPlatform.every((report) =>
      CO_LEAGUE_ROSTER.some(
        (member) =>
          member.membershipId === report.authorMembershipId &&
          member.space === "Platform",
      ),
    ),
    true,
  );
});

test("the figures count people and decisions separately", () => {
  const stats = spaceStats({
    space: SPACES[0],
    roster: CO_LEAGUE_ROSTER,
    reports: SAMPLE_REPORTS,
  });
  assert.equal(stats.people, 3);
  assert.equal(stats.expected, 3);
  assert.equal(stats.submitted, stats.onTime + stats.late);
  assert.equal(
    stats.approved + stats.pending + stats.rejected,
    stats.submitted,
    "every submitted Report is in exactly one state",
  );
  assert.equal(
    stats.missing,
    Math.max(0, stats.expected - stats.peopleSubmitted),
  );

  const scoped = spaceStats({
    space: SPACES[0],
    roster: CO_LEAGUE_ROSTER,
    reports: SAMPLE_REPORTS,
    periodId: "per_2026_10_19",
  });
  assert.ok(
    scoped.peopleSubmitted <= scoped.expected,
    "more people cannot submit than are expected to",
  );
  assert.equal(scoped.missing, scoped.expected - scoped.peopleSubmitted);
});

test("an archived Space keeps its Reports readable", () => {
  const legacy = SPACES.find((space) => space.archived);
  assert.ok(legacy);
  const stats = spaceStats({
    space: legacy,
    roster: CO_LEAGUE_ROSTER,
    reports: SAMPLE_REPORTS,
  });
  assert.equal(stats.people, 0);
  assert.equal(stats.submitted, 0);
});

test("only an Admin or that Space's Head edits the KPI template", () => {
  assert.equal(canEditTemplate(admin, SPACES[0]).allowed, true);
  assert.equal(canEditTemplate(head, SPACES[0]).allowed, true);
  assert.equal(canEditTemplate(staff, SPACES[0]).allowed, false);
  const refused = canEditTemplate(otherHead, SPACES[0]);
  assert.equal(refused.allowed, false);
  assert.match(refused.reason ?? "", /Admin or the Head of Platform/);
});

test("a new draft starts from the Space's template", () => {
  const rows = applyTemplate([{ name: "Reports reviewed", unit: "count" }], []);
  assert.deepEqual(rows, [
    { name: "Reports reviewed", unit: "count", value: null },
  ]);
});

test("a draft that has rows keeps them when the template changes", () => {
  const existing = [{ name: "Old KPI", unit: "count", value: 3 }];
  const rows = applyTemplate([{ name: "New KPI", unit: "count" }], existing);
  assert.deepEqual(rows, existing);
});
