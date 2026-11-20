import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  fetchUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  notificationFrom,
} from "../src/lib/notifications-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - The notification calls and the row mapper, against a stubbed fetch. Text is
   made up. */
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

const row = {
  id: 3,
  type: "decision",
  title: "Your report was rejected",
  message: "A reviewer sent it back.",
  metadata: {},
  read: false,
  createdAt: "2026-11-18T10:00:00.000Z",
  workspaceId: "8",
  href: "/dashboard/reports/7",
};

test("notificationFrom maps the server row to the screen's shape", () => {
  assert.deepEqual(notificationFrom(row), {
    id: "3",
    kind: "decision",
    title: "Your report was rejected",
    body: "A reviewer sent it back.",
    at: "2026-11-18T10:00:00.000Z",
    read: false,
    href: "/dashboard/reports/7",
  });
});

test("notificationFrom maps every server type to a kind", () => {
  const kind = (type: string) => notificationFrom({ ...row, type }).kind;
  assert.equal(kind("comment"), "comment");
  assert.equal(kind("task"), "task");
  assert.equal(kind("submission"), "comment");
  assert.equal(kind("system"), "security");
  assert.equal(kind("account"), "security");
  assert.equal(kind("something-new"), "security");
});

test("notificationFrom only follows links inside the dashboard", () => {
  const href = (value: string | null) =>
    notificationFrom({ ...row, href: value }).href;
  assert.equal(href(null), "/dashboard");
  assert.equal(href("https://evil.example.com/x"), "/dashboard");
  assert.equal(href("//evil.example.com"), "/dashboard");
  assert.equal(href("/dashboard"), "/dashboard");
  assert.equal(href("/dashboard/tasks"), "/dashboard/tasks");
  assert.equal(href("javascript:alert(1)"), "/dashboard");
});

test("listNotifications scopes by Workspace and reads the page wrapper", async () => {
  const calls = stub(200, {
    data: { data: [row], total: 1, page: 1, limit: 50 },
  });
  const result = await listNotifications("8");
  assert.equal(calls[0].method, "GET");
  assert.match(calls[0].url, /\/notifications\?workspaceId=8&limit=50$/);
  assert.ok(result.ok);
  assert.equal(result.data[0].id, "3");
});

test("listNotifications also accepts a bare array", async () => {
  stub(200, { data: [row] });
  const result = await listNotifications("8");
  assert.ok(result.ok);
  assert.equal(result.data.length, 1);
});

test("fetchUnreadCount returns the number for one Workspace", async () => {
  const calls = stub(200, { data: { count: 4 } });
  const result = await fetchUnreadCount("8");
  assert.match(calls[0].url, /\/notifications\/unread-count\?workspaceId=8$/);
  assert.ok(result.ok);
  assert.equal(result.data, 4);
});

test("a failed list keeps the status so the screen can show an error", async () => {
  stub(500, { error: { message: "Something went wrong. Try again." } });
  const result = await listNotifications("8");
  assert.ok(!result.ok);
  assert.equal(result.status, 500);
});

test("markRead patches one row and reports whether it changed", async () => {
  const calls = stub(200, { data: { updated: true } });
  const result = await markRead("3");
  assert.equal(calls[0].method, "PATCH");
  assert.match(calls[0].url, /\/notifications\/3\/read$/);
  assert.ok(result.ok);
  assert.equal(result.data, true);
});

test("markAllRead posts the Workspace id", async () => {
  const calls = stub(200, {
    data: { message: "All notifications marked as read" },
  });
  const result = await markAllRead("8");
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /\/notifications\/read-all$/);
  assert.deepEqual(calls[0].body, { workspaceId: "8" });
  assert.ok(result.ok);
});
