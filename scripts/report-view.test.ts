import assert from "node:assert/strict";
import test from "node:test";
import {
  type Report,
  type ReportEvent,
  type ReportViewer,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
} from "../src/data/reports.ts";
import {
  canDelete,
  canEdit,
  lastDecision,
  lockAt,
  primaryAction,
  timeLeft,
  timelineFor,
  visibleReports,
} from "../src/lib/report-view.ts";

/* @info - The state table is the screen. Every expectation below is written from the
   spec, not from the module: two clocks, an ordered precedence, and the last decision
   event deciding whether a reopened Report is editable. */

const MINUTE = 60 * 1000;
const at = (offset: number) =>
  new Date(Date.parse(SAMPLE_NOW) + offset * MINUTE).toISOString();

const viewer: ReportViewer = {
  membershipId: "mem_staff",
  role: "staff",
  space: "Platform",
};

const report = (over: Partial<Report> = {}): Report =>
  ({
    id: "rpt_1",
    periodId: SAMPLE_PERIOD.id,
    authorMembershipId: "mem_staff",
    accomplishments: "<p>Work</p>",
    challenges: "",
    plans: "",
    kpis: [],
    attachments: [],
    taggedMembershipIds: [],
    location: null,
    submissionStatus: "submitted",
    reviewStatus: "pending",
    submittedAt: at(-500),
    firstSeenAt: null,
    windowStartedAt: null,
    editWindowMinutes: 30,
    revisions: [],
    events: [
      { kind: "submitted", at: at(-500), actorMembershipId: "mem_staff" },
    ],
    comments: [],
    updatedAt: at(-500),
    ...over,
  }) as Report;

const live = { workspaceReadOnly: false };

test("unseen is editable and deletable", () => {
  const r = report();
  assert.equal(canEdit(r, viewer, SAMPLE_NOW, live), true);
  assert.equal(canDelete(r, viewer, live), true);
  assert.equal(primaryAction(r, viewer, SAMPLE_NOW, live).kind, "edit");
});

test("seen inside the window is editable and no longer deletable", () => {
  const r = report({ firstSeenAt: at(-5), windowStartedAt: at(-5) });
  assert.equal(canEdit(r, viewer, SAMPLE_NOW, live), true);
  assert.equal(canDelete(r, viewer, live), false);
  assert.equal(timeLeft(SAMPLE_NOW, lockAt(r)), 25 * MINUTE);
});

test("seen past the window is locked, and the page can name when", () => {
  const r = report({ firstSeenAt: at(-180), windowStartedAt: at(-180) });
  assert.equal(canEdit(r, viewer, SAMPLE_NOW, live), false);
  assert.equal(lockAt(r), at(-150));
  const action = primaryAction(r, viewer, SAMPLE_NOW, live);
  assert.equal(action.kind, "none");
  assert.match(action.reason ?? "", /locked/i);
});

test("a resubmitted Report is never deletable", () => {
  const r = report({
    revisions: [
      {
        at: at(-100),
        previous: {
          accomplishments: "",
          challenges: "",
          plans: "",
          kpis: [],
          attachments: [],
          taggedMembershipIds: [],
          location: null,
        },
      },
    ],
    windowStartedAt: null,
    firstSeenAt: at(-200),
  });
  assert.equal(canDelete(r, viewer, live), false);
});

test("approved beats an open window", () => {
  const r = report({
    reviewStatus: "approved",
    firstSeenAt: at(-1),
    windowStartedAt: at(-1),
    events: [
      { kind: "submitted", at: at(-500), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-1), actorMembershipId: "mem_admin" },
      { kind: "approved", at: at(-1), actorMembershipId: "mem_admin" },
    ],
  });
  assert.equal(canEdit(r, viewer, SAMPLE_NOW, live), false);
  assert.equal(primaryAction(r, viewer, SAMPLE_NOW, live).kind, "none");
});

test("rejected beats a closed window", () => {
  const r = report({
    reviewStatus: "rejected",
    firstSeenAt: at(-4_000),
    windowStartedAt: at(-4_000),
    events: [
      { kind: "submitted", at: at(-5_000), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-4_000), actorMembershipId: "mem_admin" },
      { kind: "rejected", at: at(-3_000), actorMembershipId: "mem_admin" },
    ],
    comments: [
      {
        id: "cmt_1",
        reportId: "rpt_1",
        authorMembershipId: "mem_admin",
        body: "Say who agreed to it.",
        at: at(-3_000),
        kind: "decision",
      },
    ],
  });
  assert.equal(canEdit(r, viewer, SAMPLE_NOW, live), true);
  assert.equal(primaryAction(r, viewer, SAMPLE_NOW, live).kind, "resubmit");

  // Once the author resubmits, the Report is pending again and the label follows.
  const resubmitted = report({ ...r, reviewStatus: "pending" });
  assert.equal(
    primaryAction(resubmitted, viewer, SAMPLE_NOW, live).kind,
    "edit",
  );
});

test("reopened beats a closed window, and a later approval locks it again", () => {
  const reopened = report({
    reviewStatus: "pending",
    firstSeenAt: at(-4_000),
    windowStartedAt: null,
    events: [
      { kind: "submitted", at: at(-5_000), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-4_000), actorMembershipId: "mem_admin" },
      { kind: "approved", at: at(-3_000), actorMembershipId: "mem_admin" },
      { kind: "reopened", at: at(-10), actorMembershipId: "mem_admin" },
    ],
    comments: [
      {
        id: "cmt_2",
        reportId: "rpt_1",
        authorMembershipId: "mem_admin",
        body: "The second figure is wrong.",
        at: at(-10),
        kind: "decision",
      },
    ],
  });
  assert.equal(lastDecision(reopened)?.kind, "reopened");
  assert.equal(canEdit(reopened, viewer, SAMPLE_NOW, live), true);

  const approvedAgain = report({
    ...reopened,
    reviewStatus: "approved",
    events: [
      ...reopened.events,
      { kind: "approved", at: at(-1), actorMembershipId: "mem_admin" },
    ],
  });
  assert.equal(canEdit(approvedAgain, viewer, SAMPLE_NOW, live), false);
});

test("a read-only Workspace removes both controls and says why", () => {
  const r = report();
  const action = primaryAction(r, viewer, SAMPLE_NOW, {
    workspaceReadOnly: true,
  });
  assert.equal(
    canEdit(r, viewer, SAMPLE_NOW, { workspaceReadOnly: true }),
    false,
  );
  assert.equal(canDelete(r, viewer, { workspaceReadOnly: true }), false);
  assert.match(action.reason ?? "", /read-only/i);
});

test("a reviewer never gets an author action", () => {
  const r = report();
  const reviewer: ReportViewer = {
    membershipId: "mem_admin",
    role: "admin",
    space: null,
  };
  const action = primaryAction(r, reviewer, SAMPLE_NOW, live);
  assert.equal(action.kind, "none");
  assert.match(action.reason ?? "", /review/i);
});

test("the timeline is chronological and named in the product's words", () => {
  const r = report({
    events: [
      { kind: "seen", at: at(-400), actorMembershipId: "mem_admin" },
      { kind: "submitted", at: at(-500), actorMembershipId: "mem_staff" },
      { kind: "rejected", at: at(-300), actorMembershipId: "mem_admin" },
    ] satisfies ReportEvent[],
    comments: [
      {
        id: "cmt_3",
        reportId: "rpt_1",
        authorMembershipId: "mem_admin",
        body: "Add the figures.",
        at: at(-300),
        kind: "decision",
      },
    ],
  });
  const entries = timelineFor(r, viewer);
  assert.deepEqual(
    entries.map((entry) => entry.label),
    ["Submitted", "Seen by reviewer", "Rejected"],
  );
  assert.equal(entries[0].actor, "You");
  assert.equal(entries[2].reason, "Add the figures.");
});

test("Starter hides Reports older than thirty days", () => {
  const fresh = report({ id: "fresh", submittedAt: at(-60) });
  const stale = report({ id: "stale", submittedAt: at(-60 * 24 * 40) });
  assert.deepEqual(
    visibleReports([fresh, stale], "starter", SAMPLE_NOW).map((r) => r.id),
    ["fresh"],
  );
  assert.deepEqual(
    visibleReports([fresh, stale], "team", SAMPLE_NOW).map((r) => r.id),
    ["fresh", "stale"],
  );
});
