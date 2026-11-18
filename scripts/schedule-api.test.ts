import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { getSchedule, putSchedule } from "../src/lib/schedule-api.ts";
import type { Schedule } from "../src/lib/settings.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - Schedule calls against a stubbed fetch. */
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

const weekly: Schedule = {
  cadence: "weekly",
  weekday: "Monday",
  time: "17:00",
  timeZone: "Africa/Lagos",
  dayOfMonth: null,
  lastDay: false,
};

test("getSchedule reads the Workspace schedule path", async () => {
  const calls = stub(200, {
    data: { ...weekly, effectiveFrom: null, pending: null },
  });
  const result = await getSchedule("12");
  assert.equal(calls[0].method, "GET");
  assert.ok(calls[0].url.endsWith("/workspaces/12/schedule"));
  assert.equal(result.ok && result.data.pending, null);
});

test("putSchedule PUTs exactly the six schedule fields", async () => {
  const calls = stub(200, {
    data: {
      ...weekly,
      effectiveFrom: null,
      pending: { ...weekly, effectiveFrom: "2026-11-01T23:00:00.000Z" },
      appliesFrom: "2026-11-01T23:00:00.000Z",
    },
  });
  const result = await putSchedule("12", weekly);
  assert.equal(calls[0].method, "PUT");
  assert.ok(calls[0].url.endsWith("/workspaces/12/schedule"));
  assert.deepEqual(calls[0].body, weekly);
  assert.equal(
    result.ok && result.data.appliesFrom,
    "2026-11-01T23:00:00.000Z",
  );
});

test("a Staff PUT is a 403 message, a bad body is a field map", async () => {
  stub(403, { error: { message: "You do not have permission to do this." } });
  const denied = await putSchedule("12", weekly);
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.status, 403);
    assert.equal(denied.fields, undefined);
  }
  stub(400, { error: { time: "Enter a time as HH:MM." } });
  const bad = await putSchedule("12", { ...weekly, time: "25:00" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.fields?.time, "Enter a time as HH:MM.");
});
