import assert from "node:assert/strict";
import test from "node:test";
import { attachmentsRefusal } from "../src/lib/report-draft.ts";
import {
  clearReportStateFor,
  draftKey,
  editCopyKey,
  hiddenReportIds,
  hideReport,
  putHandoff,
  readDraft,
  type StorageLike,
  takeHandoff,
  writeDraft,
} from "../src/lib/reports.ts";

/* @info - The storage path is where a draft is either kept or lost, so it gets the
   same treatment as the pure rules: a fake Storage that throws proves the UI can tell
   the truth about a failed save. */

function fakeStorage(seed: Record<string, string> = {}): StorageLike {
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

test("the draft key names both the Membership and the period", () => {
  assert.equal(
    draftKey("mem_staff", "per_1"),
    "reportlee.report.draft.mem_staff.per_1",
  );
  assert.notEqual(
    draftKey("mem_staff", "per_1"),
    draftKey("mem_head", "per_1"),
  );
  assert.notEqual(
    draftKey("mem_staff", "per_1"),
    draftKey("mem_staff", "per_2"),
  );
});

test("a form that changes saves and comes back", () => {
  const storage = fakeStorage();
  const key = draftKey("mem_staff", "per_1");

  assert.equal(readDraft(storage, key), null);
  assert.deepEqual(
    writeDraft(storage, key, {
      id: "draft_1",
      periodId: "per_1",
      authorMembershipId: "mem_staff",
      accomplishments: "Worked on the backlog",
      challenges: "None",
      plans: "Ship the form",
      kpis: [],
      attachments: [],
      taggedMembershipIds: [],
      location: null,
      submissionStatus: "draft",
      reviewStatus: "pending",
      updatedAt: "2026-10-26T10:00:00.000Z",
    }),
    { ok: true },
  );
  assert.equal(
    readDraft(storage, key)?.accomplishments,
    "Worked on the backlog",
  );
});

test("a throwing storage reports a failed save, never a saved one", () => {
  const broken: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
    key: () => null,
    length: 0,
  };

  const result = writeDraft(broken, draftKey("mem_staff", "per_1"), {
    id: "draft_1",
    periodId: "per_1",
    authorMembershipId: "mem_staff",
    accomplishments: "",
    challenges: "",
    plans: "",
    kpis: [],
    attachments: [],
    taggedMembershipIds: [],
    location: null,
    submissionStatus: "draft",
    reviewStatus: "pending",
    updatedAt: "2026-10-26T10:00:00.000Z",
  });

  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.message : "", /device/i);
});

test("signing out clears only that Membership's drafts", () => {
  const storage = fakeStorage({
    [draftKey("mem_staff", "per_1")]: "{}",
    [draftKey("mem_staff", "per_2")]: "{}",
    [draftKey("mem_admin", "per_1")]: "{}",
    "reportlee-theme": "dark",
  });

  clearReportStateFor(storage, "mem_staff");

  assert.equal(readDraft(storage, draftKey("mem_staff", "per_1")), null);
  assert.equal(readDraft(storage, draftKey("mem_staff", "per_2")), null);
  assert.notEqual(readDraft(storage, draftKey("mem_admin", "per_1")), null);
  assert.equal(storage.getItem("reportlee-theme"), "dark");
});

test("attachments name the allowed types and the limit", () => {
  assert.equal(
    attachmentsRefusal({ name: "a.png", size: 1024, type: "image/png" }),
    null,
  );
  assert.equal(
    attachmentsRefusal({ name: "a.pdf", size: 1024, type: "application/pdf" }),
    null,
  );
  assert.equal(
    attachmentsRefusal({
      name: "a.docx",
      size: 1024,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    null,
  );

  const big = attachmentsRefusal({
    name: "a.pdf",
    size: 11 * 1024 * 1024,
    type: "application/pdf",
  });
  assert.match(big ?? "", /10 MB/);

  const wrong = attachmentsRefusal({
    name: "a.exe",
    size: 1024,
    type: "application/x-msdownload",
  });
  assert.match(wrong ?? "", /PDF/);
  assert.match(wrong ?? "", /Office/);
});

test("the edit copy has its own key, apart from the draft", () => {
  assert.equal(
    editCopyKey("mem_staff", "rpt_1"),
    "reportlee.report.edit.mem_staff.rpt_1",
  );
  assert.notEqual(
    editCopyKey("mem_staff", "rpt_1"),
    draftKey("mem_staff", "per_1"),
  );
});

test("the handoff is consumed once, so a second visit is a plain form", () => {
  const storage = fakeStorage();
  putHandoff(storage, "mem_staff", "rpt_1");
  assert.equal(takeHandoff(storage, "mem_staff"), "rpt_1");
  assert.equal(takeHandoff(storage, "mem_staff"), null);
});

test("a deleted report stays hidden for that Membership only", () => {
  const storage = fakeStorage();
  hideReport(storage, "mem_staff", "rpt_1");
  hideReport(storage, "mem_staff", "rpt_1");
  hideReport(storage, "mem_admin", "rpt_9");

  assert.deepEqual(hiddenReportIds(storage, "mem_staff"), ["rpt_1"]);
  assert.deepEqual(hiddenReportIds(storage, "mem_admin"), ["rpt_9"]);
});

test("signing out clears the draft, the edit copy, the handoff and the hidden set", () => {
  const storage = fakeStorage({
    [draftKey("mem_staff", "per_1")]: "{}",
    [editCopyKey("mem_staff", "rpt_1")]: "{}",
    "reportlee.report.handoff.mem_staff": "rpt_1",
    "reportlee.report.hidden.mem_staff": '["rpt_1"]',
    "reportlee.report.hidden.mem_admin": '["rpt_9"]',
    "reportlee-theme": "dark",
  });

  clearReportStateFor(storage, "mem_staff");

  assert.equal(storage.getItem(draftKey("mem_staff", "per_1")), null);
  assert.equal(storage.getItem(editCopyKey("mem_staff", "rpt_1")), null);
  assert.equal(storage.getItem("reportlee.report.handoff.mem_staff"), null);
  assert.equal(storage.getItem("reportlee.report.hidden.mem_staff"), null);
  assert.equal(
    storage.getItem("reportlee.report.hidden.mem_admin"),
    '["rpt_9"]',
  );
  assert.equal(storage.getItem("reportlee-theme"), "dark");
});
