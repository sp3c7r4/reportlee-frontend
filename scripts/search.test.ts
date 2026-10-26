import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER, SPACES } from "../src/data/members.ts";
import { SAMPLE_NOW, SAMPLE_REPORTS } from "../src/data/reports.ts";
import {
  clearRecent,
  recentSearches,
  recordSearch,
  search,
} from "../src/lib/search.ts";

/* @info - Search never shows what a person could not open through normal screens, and
   the one exception is an author finding their own draft. */

const admin = { membershipId: "mem_admin", role: "admin" as const, space: null };
const head = { membershipId: "mem_head_platform", role: "head" as const, space: "Platform" };
const staff = { membershipId: "mem_staff", role: "staff" as const, space: "Platform" };

const base = {
  reports: SAMPLE_REPORTS,
  roster: CO_LEAGUE_ROSTER,
  spaces: SPACES,
};

const draft = {
  ...SAMPLE_REPORTS[0],
  id: "draft_staff",
  authorMembershipId: "mem_staff",
  submissionStatus: "draft" as const,
  accomplishments: "<p>Ledger reconciliation notes</p>",
};

test("an empty query returns nothing", () => {
  const result = search({ ...base, q: "   ", viewer: admin });
  assert.deepEqual(result.reports, []);
  assert.deepEqual(result.members, []);
  assert.deepEqual(result.spaces, []);
});

test("a Staff member finds only their own Reports", () => {
  const result = search({ ...base, q: "week", viewer: staff });
  assert.ok(result.reports.length > 0);
  assert.equal(
    result.reports.every((hit) => hit.ownerMembershipId === staff.membershipId),
    true,
  );
});

test("an Admin finds Reports from more than one person", () => {
  const result = search({ ...base, q: "the", viewer: admin });
  const owners = new Set(result.reports.map((hit) => hit.ownerMembershipId));
  assert.ok(owners.size > 1, "the Admin's search is not limited to one author");
});

test("nobody finds somebody else's draft", () => {
  const result = search({
    ...base,
    reports: [...SAMPLE_REPORTS, draft],
    q: "reconciliation",
    viewer: admin,
  });
  assert.equal(result.reports.length, 0);
});

test("an author finds their own draft, labelled Draft", () => {
  const result = search({
    ...base,
    reports: [...SAMPLE_REPORTS, draft],
    q: "reconciliation",
    viewer: staff,
  });
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].label, "Draft");
});

test("a Head finds their own Space's Reports", () => {
  const result = search({ ...base, q: "week", viewer: head });
  assert.equal(
    result.reports.every((hit) => hit.space === "Platform"),
    true,
  );
});

test("a member's detail is wider for an Admin than for Staff", () => {
  const asAdmin = search({ ...base, q: "amara", viewer: admin });
  assert.ok(asAdmin.members.some((hit) => hit.subtitle?.includes("Workspace Admin")));
  const asStaff = search({ ...base, q: "amara", viewer: staff });
  assert.equal(
    asStaff.members.every((hit) => !hit.subtitle?.includes("Workspace Admin")),
    true,
  );
});

test("an archived Space is not findable", () => {
  const result = search({ ...base, q: "legacy", viewer: admin });
  assert.equal(result.spaces.length, 0);
});

test("at most five of each kind come back", () => {
  const result = search({ ...base, q: "a", viewer: admin });
  assert.ok(result.reports.length <= 5);
  assert.ok(result.members.length <= 5);
  assert.ok(result.spaces.length <= 5);
});

test("recent searches are per Membership and cleared on request", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  recordSearch(storage, "mem_staff", "schedule", SAMPLE_NOW);
  recordSearch(storage, "mem_staff", "kpi", SAMPLE_NOW);
  assert.deepEqual(recentSearches(storage, "mem_staff"), ["kpi", "schedule"]);
  assert.deepEqual(recentSearches(storage, "mem_admin"), []);
  clearRecent(storage, "mem_staff");
  assert.deepEqual(recentSearches(storage, "mem_staff"), []);
});
