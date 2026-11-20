import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { listTasks, updateTaskStatus } from "../src/lib/tasks-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - The task calls against a stubbed fetch. Ids and text are made up. */
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

const task = {
  id: "9",
  reportId: "7",
  title: "Add the figures",
  assigneeMembershipId: "15",
  assignedByMembershipId: "12",
  dueAt: "2026-11-25",
  status: "todo",
  priority: "high",
  completionNote: null,
  completionFile: null,
  completedAt: null,
  createdAt: "2026-11-18T10:00:00.000Z",
};

test("listTasks puts the Workspace and the view in the query", async () => {
  const calls = stub(200, { data: [task] });
  const result = await listTasks("8", "mine");
  assert.equal(calls[0].method, "GET");
  assert.match(calls[0].url, /\/tasks\?workspaceId=8&view=mine$/);
  assert.ok(result.ok);
  assert.equal(result.data[0].title, "Add the figures");
});

test("listTasks keeps the view-not-allowed code", async () => {
  stub(403, { error: { message: "No.", code: "VIEW_NOT_ALLOWED" } });
  const result = await listTasks("8", "all");
  assert.ok(!result.ok);
  assert.equal(result.status, 403);
  assert.equal(result.code, "VIEW_NOT_ALLOWED");
});

test("updateTaskStatus patches the status and sends a note only with done", async () => {
  let calls = stub(200, { data: { ...task, status: "doing" } });
  await updateTaskStatus("9", { status: "doing", note: "ignored" });
  assert.equal(calls[0].method, "PATCH");
  assert.match(calls[0].url, /\/tasks\/9$/);
  assert.deepEqual(calls[0].body, { status: "doing" });

  calls = stub(200, { data: { ...task, status: "done" } });
  await updateTaskStatus("9", { status: "done", note: " Figures added. " });
  assert.deepEqual(calls[0].body, {
    status: "done",
    completionNote: "Figures added.",
  });

  calls = stub(200, { data: { ...task, status: "done" } });
  await updateTaskStatus("9", { status: "done", note: "   " });
  assert.deepEqual(calls[0].body, { status: "done" });
});

test("updateTaskStatus keeps the assignee rule code", async () => {
  stub(403, { error: { message: "No.", code: "NOT_ASSIGNEE" } });
  const result = await updateTaskStatus("9", { status: "done" });
  assert.ok(!result.ok);
  assert.equal(result.code, "NOT_ASSIGNEE");
});
