import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { apiCall } from "../src/lib/api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - The shared call against a stubbed fetch. Tokens are made-up strings. */
type Seen = { url: string; method: string; auth: string | null; body: unknown };

const realFetch = globalThis.fetch;

function stub(answer: (seen: Seen) => { status: number; body?: unknown }) {
  const calls: Seen[] = [];
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const seen: Seen = {
      url: String(input),
      method: init.method ?? "GET",
      auth: headers.get("Authorization"),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(seen);
    const { status, body } = answer(seen);
    return new Response(
      body === undefined ? "not json" : JSON.stringify(body),
      {
        status,
      },
    );
  }) as typeof fetch;
  return calls;
}

beforeEach(() => setTokens({ accessToken: "fake-a", refreshToken: "fake-r" }));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearTokens();
});

test("a success unwraps the envelope and keeps string ids", async () => {
  const calls = stub(() => ({
    status: 200,
    body: { success: true, data: { id: "12", lastWorkspaceId: null } },
  }));
  const result = await apiCall<{ id: string }>("GET", "/x", undefined, "no");
  assert.deepEqual(result, {
    ok: true,
    data: { id: "12", lastWorkspaceId: null },
    status: 200,
  });
  assert.equal(calls[0].auth, "Bearer fake-a");
  assert.equal(calls[0].method, "GET");
});

test("a body is sent as JSON with the method asked for", async () => {
  const calls = stub(() => ({ status: 200, body: { data: {} } }));
  await apiCall("PATCH", "/x", { name: "Ops" }, "no");
  assert.equal(calls[0].method, "PATCH");
  assert.deepEqual(calls[0].body, { name: "Ops" });
});

test("a 400 field map becomes fields, with the first one as the message", async () => {
  stub(() => ({
    status: 400,
    body: { success: false, error: { slug: "Use 3 to 32 letters." } },
  }));
  const result = await apiCall("POST", "/x", {}, "fallback");
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    message: "Use 3 to 32 letters.",
    fields: { slug: "Use 3 to 32 letters." },
  });
});

test("a 400 with only a message has no fields", async () => {
  stub(() => ({
    status: 400,
    body: {
      success: false,
      error: { message: "An Admin belongs to no Space." },
    },
  }));
  const result = await apiCall("PATCH", "/x", {}, "fallback");
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    message: "An Admin belongs to no Space.",
  });
});

test("a 403 carries its code when the server sends one, and not otherwise", async () => {
  stub(() => ({
    status: 403,
    body: { error: { message: "Verify.", code: "EMAIL_NOT_VERIFIED" } },
  }));
  const withCode = await apiCall("POST", "/x", {}, "fallback");
  assert.equal(withCode.ok, false);
  if (!withCode.ok) assert.equal(withCode.code, "EMAIL_NOT_VERIFIED");

  stub(() => ({ status: 403, body: { error: { message: "No." } } }));
  const without = await apiCall("POST", "/x", {}, "fallback");
  assert.equal(without.ok, false);
  if (!without.ok) {
    assert.equal(without.code, undefined);
    assert.equal("code" in without, false);
  }
});

test("404, 409 and 422 give the server message and no fields", async () => {
  for (const status of [404, 409, 422]) {
    stub(() => ({ status, body: { error: { message: `m${status}` } } }));
    const result = await apiCall("POST", "/x", {}, "fallback");
    assert.deepEqual(result, { ok: false, status, message: `m${status}` });
  }
});

test("a reply that is not JSON falls back to the screen's own message", async () => {
  stub(() => ({ status: 500 }));
  const result = await apiCall("GET", "/x", undefined, "Try again later.");
  assert.deepEqual(result, {
    ok: false,
    status: 500,
    message: "Try again later.",
  });
});

test("a network error is status 0 with the reachability message", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("offline");
  }) as typeof fetch;
  const result = await apiCall("GET", "/x", undefined, "fallback");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 0);
    assert.match(result.message, /could not reach the server/i);
  }
});

test("a 401 refreshes once and retries with the new token", async () => {
  let attempt = 0;
  const calls = stub((seen) => {
    if (seen.url.endsWith("/auth/refresh")) {
      return {
        status: 200,
        body: { data: { accessToken: "fake-a2", refreshToken: "fake-r2" } },
      };
    }
    attempt += 1;
    return attempt === 1
      ? { status: 401, body: { error: { message: "expired" } } }
      : { status: 200, body: { data: { ok: 1 } } };
  });
  const result = await apiCall("GET", "/x", undefined, "fallback");
  assert.equal(result.ok, true);
  const last = calls[calls.length - 1];
  assert.equal(last.auth, "Bearer fake-a2");
});
