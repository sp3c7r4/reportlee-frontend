import assert from "node:assert/strict";
import { test } from "node:test";
import { REPORT_STATUS, SUBMISSION_STATUS } from "../src/lib/status.ts";

/* @info - Labels are asserted as literal strings, never read back from the module,
   so a silent rename fails here instead of comparing the module to itself. */

test("a report has exactly three review states, each with its own label and tone", () => {
  assert.deepEqual(
    Object.entries(REPORT_STATUS).map(([state, entry]) => [
      state,
      entry.label,
      entry.tone,
    ]),
    [
      ["pending", "Pending", "warning"],
      ["approved", "Approved", "success"],
      ["rejected", "Rejected", "danger"],
    ],
  );
});

test("a submission has exactly four states, draft included", () => {
  assert.deepEqual(
    Object.entries(SUBMISSION_STATUS).map(([state, entry]) => [
      state,
      entry.label,
      entry.tone,
    ]),
    [
      ["draft", "Draft", "neutral"],
      ["submitted", "Submitted", "success"],
      ["late", "Late", "warning"],
      ["missing", "Missing", "neutral"],
    ],
  );
});

test("draft is an author-only state: it is the only state with no reviewer meaning", () => {
  // A person with only a draft is shown as missing to reviewers, so draft never
  // appears in the mapping a reviewer reads. The label is the author's alone.
  assert.equal(SUBMISSION_STATUS.draft.label, "Draft");
  assert.notEqual(SUBMISSION_STATUS.draft.tone, "warning");
  assert.equal(SUBMISSION_STATUS.missing.label, "Missing");
});

test("no two states share an icon", () => {
  const icons = [
    ...Object.values(REPORT_STATUS),
    ...Object.values(SUBMISSION_STATUS),
  ].map((entry) => entry.icon);
  assert.equal(icons.length, 7);
  assert.equal(new Set(icons).size, 7);
});

test("rejected is the only red state", () => {
  const red = [
    ...Object.values(REPORT_STATUS),
    ...Object.values(SUBMISSION_STATUS),
  ].filter((entry) => entry.tone === "danger");
  assert.deepEqual(
    red.map((entry) => entry.label),
    ["Rejected"],
  );
});
