import assert from "node:assert/strict";
import test from "node:test";
import {
  type AuditEntry,
  auditSummary,
  readAudit,
  recordAudit,
} from "../src/lib/audit.ts";
import type { StorageLike } from "../src/lib/reports.ts";

/* @info - The audit log is the only record of who changed what, so its shape, its
   order and its append-only behaviour are pinned here rather than trusted. */

export function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  at: "2026-10-26T10:00:00.000Z",
  actorMembershipId: "mem_admin",
  action: "role.change",
  target: "mem_staff",
  summary: "Staff to Head of Space",
  ...over,
});

test("an entry carries who, what, where and a summary", () => {
  const storage = fakeStorage();
  recordAudit(storage, "mem_admin", entry());
  const [first] = readAudit(storage, "mem_admin");
  assert.equal(first.actorMembershipId, "mem_admin");
  assert.equal(first.action, "role.change");
  assert.equal(first.target, "mem_staff");
  assert.equal(first.summary, "Staff to Head of Space");
});

test("entries come back in the order they happened", () => {
  const storage = fakeStorage();
  recordAudit(
    storage,
    "mem_admin",
    entry({ action: "submitted", at: "2026-10-26T09:00:00.000Z" }),
  );
  recordAudit(
    storage,
    "mem_admin",
    entry({ action: "decided", at: "2026-10-26T11:00:00.000Z" }),
  );
  assert.deepEqual(
    readAudit(storage, "mem_admin").map((row) => row.action),
    ["submitted", "decided"],
  );
});

test("reading appends nothing", () => {
  const storage = fakeStorage();
  recordAudit(storage, "mem_admin", entry());
  readAudit(storage, "mem_admin");
  readAudit(storage, "mem_admin");
  assert.equal(readAudit(storage, "mem_admin").length, 1);
});

test("one Membership's log is not another's", () => {
  const storage = fakeStorage();
  recordAudit(storage, "mem_admin", entry());
  assert.equal(readAudit(storage, "mem_staff").length, 0);
});

test("a broken store does not throw at the caller", () => {
  const broken: StorageLike = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
    removeItem: () => {},
    key: () => null,
    length: 0,
  };
  assert.doesNotThrow(() => recordAudit(broken, "mem_admin", entry()));
  assert.deepEqual(readAudit(broken, "mem_admin"), []);
});

test("a summary names both sides of a change", () => {
  assert.equal(
    auditSummary("role.change", "Staff", "Head of Space"),
    "Staff to Head of Space",
  );
  assert.equal(
    auditSummary("space.change", "Platform", "Logistics"),
    "Platform to Logistics",
  );
  assert.equal(auditSummary("decided", "", "Rejected"), "Rejected");
});
