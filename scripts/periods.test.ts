import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReportingPeriod } from "../src/data/reports.ts";
import {
  GRACE_MS,
  isOpen,
  periodTitle,
  pickSubmitPeriod,
} from "../src/lib/periods.ts";

const week = (id: string, start: string, due: string): ReportingPeriod => ({
  id,
  label: `Week ${id}`,
  startsAt: start,
  endsAt: due,
  dueAt: due,
});

const older = week(
  "41",
  "2026-10-19T00:00:00.000Z",
  "2026-10-26T16:00:00.000Z",
);
const newer = week(
  "42",
  "2026-10-26T00:00:00.000Z",
  "2026-11-02T16:00:00.000Z",
);

test("picks the oldest open period the caller has not submitted for", () => {
  const picked = pickSubmitPeriod([newer, older], newer, new Set());
  assert.equal(picked?.id, "41");
});

test("skips a period the caller already submitted for", () => {
  const picked = pickSubmitPeriod([older, newer], newer, new Set(["41"]));
  assert.equal(picked?.id, "42");
});

test("falls back to the current period when every open period is submitted", () => {
  const picked = pickSubmitPeriod([older, newer], newer, new Set(["41", "42"]));
  assert.equal(picked?.id, "42");
});

test("is null when nothing is open and there is no current period", () => {
  assert.equal(pickSubmitPeriod([], null, new Set()), null);
});

test("does not mutate the list it was given", () => {
  const list = [newer, older];
  pickSubmitPeriod(list, newer, new Set());
  assert.deepEqual(
    list.map((p) => p.id),
    ["42", "41"],
  );
});

test("isOpen: the grace is exactly 7 days after the deadline", () => {
  const due = Date.parse(older.dueAt);
  assert.equal(GRACE_MS, 168 * 60 * 60 * 1000);
  assert.equal(isOpen(older, new Date(due + GRACE_MS).toISOString()), true);
  assert.equal(
    isOpen(older, new Date(due + GRACE_MS + 1).toISOString()),
    false,
  );
});

test("periodTitle uses a known label, else a plain fallback", () => {
  assert.equal(periodTitle("41", [older, newer]), "Week 41");
  assert.equal(periodTitle("7", [older]), "Reporting period");
});

test("isOpen: not open before the period starts", () => {
  assert.equal(isOpen(newer, "2026-10-25T23:59:59.999Z"), false);
  assert.equal(isOpen(newer, "2026-10-26T00:00:00.000Z"), true);
});
