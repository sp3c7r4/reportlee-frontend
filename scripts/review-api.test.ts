import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { CODE_NOT_APPROVED } from "../src/lib/api-types.ts";
import { reportErrorMessage } from "../src/lib/report-errors.ts";
import {
  bulkApprove,
  bulkSummary,
  decide,
  loadQueue,
  markSeen,
} from "../src/lib/review-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - Paths, methods, bodies and error mapping of the review calls, against a
   stubbed fetch. Ids and text are made up. */
type Seen = { url: string; method: string; body: unknown };

const realFetch = globalThis.fetch;

function stub(status: number, body: unknown) {
  const calls: Seen[] = [];
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => setTokens({ accessToken: "fake-a", refreshToken: "fake-r" }));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearTokens();
});

const apiReport = {
  id: "7",
  periodId: "41",
  authorMembershipId: "31",
  submissionStatus: "submitted",
  reviewStatus: "pending",
  comments: [
    {
      id: "1",
      reportId: "7",
      authorMembershipId: "15",
      body: "Add the figures.",
      at: "2026-11-18T10:00:00.000Z",
      kind: "comment",
      taskId: null,
    },
    {
      id: "2",
      reportId: "7",
      authorMembershipId: "15",
      body: "Second.",
      at: "2026-11-18T10:05:00.000Z",
      kind: "comment",
      taskId: "9",
    },
  ],
};

test("markSeen posts to the seen path with no body and returns the times", async () => {
  const calls = stub(200, {
    data: { firstSeenAt: "2026-11-18T10:00:00.000Z", windowStartedAt: null },
  });
  const result = await markSeen("7/../8");
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /\/reports\/7%2F\.\.%2F8\/seen$/);
  assert.equal(calls[0].body, undefined);
  assert.equal(
    result.ok && result.data.firstSeenAt,
    "2026-11-18T10:00:00.000Z",
  );
});

test("markSeen hands back a 403 so the page can ignore it", async () => {
  stub(403, { error: { message: "No.", code: "NOT_REVIEWER" } });
  const result = await markSeen("7");
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("decide sends the decision, and the trimmed reason only when there is one", async () => {
  let calls = stub(200, { data: apiReport });
  await decide("7", "approve");
  assert.deepEqual(calls[0].body, { decision: "approve" });
  assert.match(calls[0].url, /\/reports\/7\/decision$/);

  calls = stub(200, { data: apiReport });
  await decide("7", "reject", "  Needs figures.  ");
  assert.deepEqual(calls[0].body, {
    decision: "reject",
    reason: "Needs figures.",
  });

  calls = stub(200, { data: apiReport });
  await decide("7", "approve", "   ");
  assert.deepEqual(calls[0].body, { decision: "approve" });
});

test("decide turns a null comment taskId into no taskId", async () => {
  stub(200, { data: apiReport });
  const result = await decide("7", "approve");
  assert.ok(result.ok);
  assert.equal(result.data.comments[0].taskId, undefined);
  assert.equal(result.data.comments[1].taskId, "9");
});

test("decide keeps the server code and the reason field error", async () => {
  stub(400, { error: { reason: "Write a reason of up to 1000 characters." } });
  const missing = await decide("7", "reject", "");
  assert.ok(!missing.ok);
  assert.equal(
    missing.fields?.reason,
    "Write a reason of up to 1000 characters.",
  );

  stub(409, {
    error: {
      message: "Only an approved report can be reopened.",
      code: "NOT_APPROVED",
    },
  });
  const conflict = await decide("7", "reopen", "why");
  assert.ok(!conflict.ok);
  assert.equal(conflict.code, CODE_NOT_APPROVED);
  assert.equal(conflict.fields, undefined);
});

test("loadQueue encodes both ids and normalises the reports", async () => {
  const calls = stub(200, {
    data: {
      reports: [apiReport],
      missing: [
        {
          membershipId: "17",
          name: "Dev Member",
          role: "staff",
          space: "Ops",
          submitted: false,
          hasDraft: true,
        },
      ],
    },
  });
  const result = await loadQueue("8", "4&1");
  assert.equal(calls[0].method, "GET");
  assert.match(calls[0].url, /\/review\/queue\?workspaceId=8&periodId=4%261$/);
  assert.ok(result.ok);
  assert.equal(result.data.reports[0].comments[0].taskId, undefined);
  assert.equal(result.data.missing[0].hasDraft, true);
});

test("bulkApprove posts the workspace and the ids", async () => {
  const calls = stub(200, { data: { approved: ["7"], skipped: [] } });
  const result = await bulkApprove("8", ["7", "9"]);
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /\/review\/bulk-approve$/);
  assert.deepEqual(calls[0].body, { workspaceId: "8", reportIds: ["7", "9"] });
  assert.ok(result.ok);
});

test("bulkSummary counts both sides and gives each skip a sentence", () => {
  const summary = bulkSummary(
    {
      approved: ["7", "8"],
      skipped: [
        { id: "9", code: "REPORT_APPROVED" },
        { id: "10", code: "NOT_AUTHOR_CANNOT_DECIDE" },
        { id: "11", code: "SOMETHING_NEW" },
      ],
    },
    (id) => `Report ${id}`,
  );
  assert.equal(summary.headline, "Approved 2. Skipped 3.");
  assert.equal(summary.skipped.length, 3);
  assert.equal(summary.skipped[0].label, "Report 9");
  assert.equal(
    summary.skipped[0].message,
    reportErrorMessage({ code: "REPORT_APPROVED", message: "" }),
  );
  // An unknown code still reads as a sentence, never as a raw code.
  assert.ok(summary.skipped[2].message.length > 0);
  assert.ok(!summary.skipped[2].message.includes("SOMETHING_NEW"));
  for (const row of summary.skipped)
    assert.ok(!/[\u2014\u2013]/.test(row.message));
});

test("bulkSummary has a headline for nothing skipped and nothing approved", () => {
  assert.equal(
    bulkSummary({ approved: ["7"], skipped: [] }, String).headline,
    "Approved 1.",
  );
  assert.equal(
    bulkSummary(
      { approved: [], skipped: [{ id: "1", code: "NOT_FOUND" }] },
      String,
    ).headline,
    "Approved 0. Skipped 1.",
  );
});

test("every new review code has a sentence without a dash", () => {
  for (const code of [
    "NOT_REVIEWER",
    "NOT_AUTHOR_CANNOT_DECIDE",
    "NOT_APPROVED",
    "REVIEWER_MUST_START",
    "NOT_ASSIGNEE",
    "VIEW_NOT_ALLOWED",
    "NOT_FOUND",
    "INTERNAL",
    "REPORT_APPROVED",
    "NOT_SUBMITTED",
    "WORKSPACE_READ_ONLY",
  ]) {
    const text = reportErrorMessage({ code, message: "server words" });
    assert.notEqual(text, "server words", code);
    assert.ok(!/[\u2014\u2013]/.test(text), code);
  }
});
