import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  CODE_EDIT_WINDOW_CLOSED,
  CODE_PERIOD_CLOSED,
} from "../src/lib/api-types.ts";
import {
  deleteReport,
  editBody,
  editReport,
  getCurrentPeriod,
  getDraft,
  getOpenPeriods,
  getReport,
  listMyDrafts,
  listMyReports,
  saveDraft,
  submitReport,
} from "../src/lib/reports-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - Paths, methods, bodies and error mapping of the report calls, against a
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
    return status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => setTokens({ accessToken: "fake-a", refreshToken: "fake-r" }));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearTokens();
});

const draft = {
  id: "7",
  periodId: "41",
  authorMembershipId: "31",
  accomplishments: "<p>Closed the audit.</p>",
  challenges: "",
  plans: "",
  kpis: [{ name: "Incidents", unit: "count", value: 0 }],
  attachments: [
    { name: "a.pdf", size: 10, type: "application/pdf", uploaded: false },
  ],
  taggedMembershipIds: ["32"],
  location: null,
  submissionStatus: "draft" as const,
  reviewStatus: "pending" as const,
  updatedAt: "2026-10-26T10:00:00.000Z",
};

test("period calls put the Workspace id in the query, encoded", async () => {
  let calls = stub(200, { data: { id: "41" } });
  await getCurrentPeriod("12");
  assert.equal(calls[0].method, "GET");
  assert.ok(calls[0].url.endsWith("/reporting-periods/current?workspaceId=12"));
  calls = stub(200, { data: [] });
  const open = await getOpenPeriods("a b");
  assert.ok(calls[0].url.endsWith("/reporting-periods/open?workspaceId=a%20b"));
  assert.equal(open.ok && open.data.length, 0);
});

test("getDraft returns the draft, and null when the server sends null", async () => {
  let calls = stub(200, { data: draft });
  const found = await getDraft("41");
  assert.ok(calls[0].url.endsWith("/reports/draft?periodId=41"));
  assert.equal(found.ok && found.data?.id, "7");
  calls = stub(200, { data: null });
  const none = await getDraft("41");
  assert.equal(none.ok, true);
  if (none.ok) assert.equal(none.data, null);
});

test("saveDraft PATCHes /reports/draft without an author and without uploaded", async () => {
  const calls = stub(200, { data: draft });
  await saveDraft({
    periodId: "41",
    accomplishments: draft.accomplishments,
    challenges: "",
    plans: "",
    kpis: draft.kpis,
    attachments: [{ name: "a.pdf", size: 10, type: "application/pdf" }],
    taggedMembershipIds: ["32"],
    location: null,
  });
  assert.equal(calls[0].method, "PATCH");
  assert.ok(calls[0].url.endsWith("/reports/draft"));
  const body = calls[0].body as Record<string, unknown>;
  assert.equal("authorMembershipId" in body, false);
  assert.deepEqual(body.attachments, [
    { name: "a.pdf", size: 10, type: "application/pdf" },
  ]);
});

test("editBody drops the period and the author", () => {
  const body = editBody(draft);
  assert.equal("periodId" in body, false);
  assert.equal("authorMembershipId" in body, false);
  assert.equal(body.accomplishments, draft.accomplishments);
  assert.equal(body.attachments[0].name, "a.pdf");
  assert.equal("uploaded" in body.attachments[0], false);
});

test("a 400 puts the server field messages in `fields`, dotted keys kept", async () => {
  stub(400, {
    error: {
      accomplishments: "Write at least 50 characters.",
      "kpis.2.value": "Enter a number.",
    },
  });
  const result = await submitReport("7");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.equal(
      result.fields?.accomplishments,
      "Write at least 50 characters.",
    );
    assert.equal(result.fields?.["kpis.2.value"], "Enter a number.");
  }
});

test("submitReport POSTs to the id's submit path and keeps the late status", async () => {
  const calls = stub(200, {
    data: { ...draft, submissionStatus: "late", reviewStatus: "pending" },
  });
  const result = await submitReport("7");
  assert.equal(calls[0].method, "POST");
  assert.ok(calls[0].url.endsWith("/reports/7/submit"));
  assert.equal(result.ok && result.data.submissionStatus, "late");
});

test("409 and 403 carry their code and no field map", async () => {
  stub(409, {
    error: { message: "This period is closed.", code: "PERIOD_CLOSED" },
  });
  const closed = await saveDraft({} as never);
  assert.equal(closed.ok, false);
  if (!closed.ok) {
    assert.equal(closed.status, 409);
    assert.equal(closed.code, CODE_PERIOD_CLOSED);
    assert.equal(closed.fields, undefined);
  }
  stub(403, { error: { message: "Locked.", code: "EDIT_WINDOW_CLOSED" } });
  const locked = await editReport("7", editBody(draft));
  assert.equal(locked.ok, false);
  if (!locked.ok) assert.equal(locked.code, CODE_EDIT_WINDOW_CLOSED);
});

test("listMyReports builds the query, encoded, and leaves out what is not set", async () => {
  let calls = stub(200, { data: [] });
  await listMyReports("12");
  assert.ok(calls[0].url.endsWith("/reports?workspaceId=12"));
  calls = stub(200, { data: [] });
  await listMyReports("12", { periodId: "4 1", limit: 50, offset: 100 });
  assert.ok(
    calls[0].url.endsWith(
      "/reports?workspaceId=12&periodId=4%201&limit=50&offset=100",
    ),
  );
});

test("listMyDrafts asks for status=draft only", async () => {
  const calls = stub(200, { data: [draft] });
  const result = await listMyDrafts("12");
  assert.ok(calls[0].url.endsWith("/reports?workspaceId=12&status=draft"));
  assert.equal(result.ok && result.data[0].submissionStatus, "draft");
});

test("getReport and editReport use the id path", async () => {
  let calls = stub(200, { data: draft });
  await getReport("7");
  assert.equal(calls[0].method, "GET");
  assert.ok(calls[0].url.endsWith("/reports/7"));
  calls = stub(200, { data: draft });
  await editReport("7", editBody(draft));
  assert.equal(calls[0].method, "PATCH");
  assert.ok(calls[0].url.endsWith("/reports/7"));
});

test("deleteReport treats a 204 as success with no data", async () => {
  const calls = stub(204, null);
  const result = await deleteReport("7");
  assert.equal(calls[0].method, "DELETE");
  assert.ok(calls[0].url.endsWith("/reports/7"));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data, undefined);
});

test("an unreachable server answers with the shared message and status 0", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const result = await getReport("7");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 0);
});
