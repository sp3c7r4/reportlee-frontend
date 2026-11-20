import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { postComment } from "../src/lib/discussion-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - The comment call against a stubbed fetch. Text and ids are made up. */
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

const created = {
  id: "41",
  reportId: "7",
  authorMembershipId: "15",
  body: "Please add the figures.",
  at: "2026-11-18T10:00:00.000Z",
  kind: "comment",
  taskId: "9",
};

test("postComment sends the trimmed body alone for a plain comment", async () => {
  const calls = stub(201, { data: { ...created, taskId: null } });
  const result = await postComment("7", {
    body: "  Please add the figures.  ",
  });
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /\/reports\/7\/comments$/);
  assert.deepEqual(calls[0].body, { body: "Please add the figures." });
  assert.ok(result.ok);
  assert.equal(result.data.taskId, undefined);
});

test("postComment carries the follow-up task and returns its id", async () => {
  const calls = stub(201, { data: created });
  const result = await postComment("7", {
    body: "Add them.",
    followUp: {
      title: " Add the figures ",
      assigneeMembershipId: "31",
      dueAt: "2026-11-25",
      priority: "high",
    },
  });
  assert.deepEqual(calls[0].body, {
    body: "Add them.",
    followUp: {
      title: "Add the figures",
      assigneeMembershipId: "31",
      dueAt: "2026-11-25",
      priority: "high",
    },
  });
  assert.ok(result.ok);
  assert.equal(result.data.taskId, "9");
});

test("postComment hands back dotted field errors and the reviewer rule", async () => {
  stub(400, { error: { "followUp.dueAt": "Use the form YYYY-MM-DD." } });
  const bad = await postComment("7", { body: "x" });
  assert.ok(!bad.ok);
  assert.equal(bad.fields?.["followUp.dueAt"], "Use the form YYYY-MM-DD.");

  stub(403, { error: { message: "No.", code: "REVIEWER_MUST_START" } });
  const early = await postComment("7", { body: "x" });
  assert.ok(!early.ok);
  assert.equal(early.code, "REVIEWER_MUST_START");
});
