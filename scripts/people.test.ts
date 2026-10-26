import assert from "node:assert/strict";
import test from "node:test";
import { INVITATIONS, SPACES } from "../src/data/members.ts";
import {
  expireInvitations,
  inviteRules,
  isExpired,
  seatUsage,
  setupState,
  spaceNameProblem,
} from "../src/lib/people.ts";

/* @info - The rules a Workspace Admin lives inside: who may invite whom, whether a
   seat is free, and when setup is finished. Written from the spec, not from the module. */

const admin = { membershipId: "mem_admin", role: "admin" as const, space: null };
const head = { membershipId: "mem_head_platform", role: "head" as const, space: "Platform" };
const staff = { membershipId: "mem_staff", role: "staff" as const, space: "Platform" };

test("an Admin may invite every role", () => {
  const rules = inviteRules(admin);
  assert.deepEqual(rules.roles, ["staff", "head", "admin"]);
  assert.equal(rules.fixedSpace, null);
});

test("a Head invites Staff only, into their own Space", () => {
  const rules = inviteRules(head);
  assert.deepEqual(rules.roles, ["staff"]);
  assert.equal(rules.fixedSpace, "Platform");
});

test("Staff cannot invite at all", () => {
  const rules = inviteRules(staff);
  assert.deepEqual(rules.roles, []);
  assert.match(rules.reason ?? "", /admin or a head/i);
});

test("a pending invitation reserves a seat", () => {
  const usage = seatUsage({
    memberLimit: 10,
    members: 9,
    invitations: 1,
  });
  assert.equal(usage.used, 10);
  assert.equal(usage.atLimit, true);
  assert.equal(usage.remaining, 0);
});

test("Team has no limit", () => {
  const usage = seatUsage({ memberLimit: null, members: 24, invitations: 3 });
  assert.equal(usage.atLimit, false);
  assert.equal(usage.remaining, null);
});

test("an invitation expires after seven days", () => {
  const sent = "2026-10-20T09:00:00.000Z";
  assert.equal(isExpired(sent, "2026-10-26T09:00:00.000Z"), false);
  assert.equal(isExpired(sent, "2026-10-27T09:00:00.000Z"), true);
  const expired = expireInvitations(INVITATIONS, "2026-10-27T09:00:00.000Z");
  assert.equal(expired.find((i) => i.id === "inv_2")?.expired, true);
  assert.equal(expired.find((i) => i.id === "inv_1")?.expired, false);
});

test("setup is unfinished without a Space", () => {
  const state = setupState({ spaces: [], admins: 1, invitations: 0 });
  assert.equal(state.finished, false);
  assert.deepEqual(state.missing, ["Space"]);
  assert.match(state.reason ?? "", /Space/);
});

test("setup is unfinished without an Admin", () => {
  const state = setupState({ spaces: SPACES, admins: 0, invitations: 2 });
  assert.equal(state.finished, false);
  assert.deepEqual(state.missing, ["Admin"]);
});

test("setup is finished with a Space and an Admin", () => {
  const state = setupState({ spaces: SPACES, admins: 1, invitations: 0 });
  assert.equal(state.finished, true);
  assert.deepEqual(state.missing, []);
  assert.equal(state.reason, null);
});

test("a Space name must be unique and non-empty", () => {
  assert.equal(spaceNameProblem("Platform", SPACES), "Platform is already a Space.");
  assert.equal(spaceNameProblem("  platform ", SPACES), "Platform is already a Space.");
  assert.equal(spaceNameProblem("", SPACES), "Give the Space a name.");
  assert.equal(spaceNameProblem("Logistics", SPACES), null);
});
