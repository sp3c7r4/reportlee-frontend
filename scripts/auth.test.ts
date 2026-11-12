import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchMe, signIn, signOut } from "../src/lib/auth.ts";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasTokens,
  setTokens,
} from "../src/lib/tokens.ts";

/* @info - The live branch against a stubbed fetch. Tokens are made-up strings, never
   anything a server issued. */

type Seen = { url: string; method: string; auth: string | null; body: unknown };

const realFetch = globalThis.fetch;

function stub(answer: (seen: Seen) => { status: number; body: unknown }) {
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
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  clearTokens();
});

test("tokens are held in memory and cleared together", () => {
  setTokens({ accessToken: "fake-a", refreshToken: "fake-r" });
  assert.equal(getAccessToken(), "fake-a");
  assert.equal(getRefreshToken(), "fake-r");
  assert.equal(hasTokens(), true);
  clearTokens();
  assert.equal(getAccessToken(), null);
  assert.equal(getRefreshToken(), null);
  assert.equal(hasTokens(), false);
});

test("sign in sends loginType, stores the pair and maps the role", async () => {
  const calls = stub(() => ({
    status: 200,
    body: {
      success: true,
      data: {
        user: { firstName: "Ada", roles: ["member"] },
        accessToken: "fake-a",
        refreshToken: "fake-r",
      },
    },
  }));
  const result = await signIn("ada@example.com", "not-a-real-pass");
  assert.deepEqual(calls[0].body, {
    email: "ada@example.com",
    password: "not-a-real-pass",
    loginType: "password",
  });
  assert.ok(calls[0].url.endsWith("/auth/login"));
  assert.deepEqual(result, {
    ok: true,
    greeting: "Welcome back, Ada.",
    role: "staff",
  });
  assert.equal(getAccessToken(), "fake-a");
});

test("a failed sign in keeps the documented shape and the field errors", async () => {
  stub(() => ({
    status: 400,
    body: { success: false, error: { email: "Invalid email" } },
  }));
  const result = await signIn("bad", "not-a-real-pass");
  assert.deepEqual(result, {
    ok: false,
    message: "Invalid email",
    fieldErrors: { email: "Invalid email" },
  });
  assert.equal(hasTokens(), false);
});

test("an unreachable server answers with the connection message", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const result = await signIn("ada@example.com", "not-a-real-pass");
  assert.equal(result.ok, false);
});

test("/auth/me refreshes once on a 401, retries, and reads the nested user", async () => {
  setTokens({ accessToken: "fake-old", refreshToken: "fake-r1" });
  const calls = stub((seen) => {
    if (seen.url.endsWith("/auth/refresh")) {
      return {
        status: 200,
        body: {
          success: true,
          data: { accessToken: "fake-new", refreshToken: "fake-r2" },
        },
      };
    }
    if (seen.auth === "Bearer fake-old") {
      return {
        status: 401,
        body: { success: false, error: { message: "Token expired" } },
      };
    }
    return {
      status: 200,
      body: {
        success: true,
        data: {
          message: "ok",
          data: {
            id: 7,
            firstName: "Ada",
            lastName: "Obi",
            email: "ada@example.com",
            roles: ["admin"],
          },
        },
      },
    };
  });

  const result = await fetchMe();
  assert.deepEqual(result, {
    ok: true,
    data: { id: "7", email: "ada@example.com", name: "Ada Obi", role: "admin" },
  });
  assert.equal(
    calls.filter((call) => call.url.endsWith("/auth/refresh")).length,
    1,
  );
  assert.deepEqual(calls[1].body, { refreshToken: "fake-r1" });
  assert.equal(calls[2].auth, "Bearer fake-new");
  assert.equal(getRefreshToken(), "fake-r2");
});

test("parallel 401s share one refresh", async () => {
  setTokens({ accessToken: "fake-old", refreshToken: "fake-r1" });
  const calls = stub((seen) => {
    if (seen.url.endsWith("/auth/refresh")) {
      return {
        status: 200,
        body: {
          success: true,
          data: { accessToken: "fake-new", refreshToken: "fake-r2" },
        },
      };
    }
    if (seen.auth === "Bearer fake-old") {
      return {
        status: 401,
        body: { success: false, error: { message: "Token expired" } },
      };
    }
    return {
      status: 200,
      body: { success: true, data: { data: { roles: [] } } },
    };
  });
  await Promise.all([fetchMe(), fetchMe()]);
  assert.equal(
    calls.filter((call) => call.url.endsWith("/auth/refresh")).length,
    1,
  );
});

test("a dead refresh token clears the pair", async () => {
  setTokens({ accessToken: "fake-old", refreshToken: "fake-r1" });
  stub((seen) =>
    seen.url.endsWith("/auth/refresh")
      ? {
          status: 400,
          body: {
            success: false,
            error: { message: "Refresh token expired." },
          },
        }
      : {
          status: 401,
          body: { success: false, error: { message: "Token expired" } },
        },
  );
  const result = await fetchMe();
  assert.equal(result.ok, false);
  assert.equal(hasTokens(), false);
});

test("sign out posts the refresh token with the access bearer, then forgets both", async () => {
  setTokens({ accessToken: "fake-a", refreshToken: "fake-r" });
  const calls = stub(() => ({
    status: 200,
    body: { success: true, data: { message: "ok" } },
  }));
  await signOut();
  assert.ok(calls[0].url.endsWith("/auth/logout"));
  assert.equal(calls[0].auth, "Bearer fake-a");
  assert.deepEqual(calls[0].body, { refreshToken: "fake-r" });
  assert.equal(hasTokens(), false);
});

test("sign out forgets the pair even when the server fails", async () => {
  setTokens({ accessToken: "fake-a", refreshToken: "fake-r" });
  stub(() => ({
    status: 500,
    body: { success: false, error: { message: "boom" } },
  }));
  await signOut();
  assert.equal(hasTokens(), false);
});

test("sign out after an in-call refresh sends the rotated refresh token", async () => {
  setTokens({ accessToken: "fake-old-a", refreshToken: "fake-old-r" });
  const calls = stub((seen) => {
    if (seen.url.endsWith("/auth/refresh")) {
      return {
        status: 200,
        body: {
          success: true,
          data: { accessToken: "fake-new-a", refreshToken: "fake-new-r" },
        },
      };
    }
    if (seen.auth === "Bearer fake-old-a") {
      return { status: 401, body: { success: false, error: { message: "Token expired" } } };
    }
    return { status: 200, body: { success: true, data: { message: "ok" } } };
  });

  await signOut();

  const logouts = calls.filter((call) => call.url.endsWith("/auth/logout"));
  assert.equal(logouts.length, 2);
  assert.deepEqual(logouts[0]?.body, { refreshToken: "fake-old-r" });
  assert.deepEqual(logouts[1]?.body, { refreshToken: "fake-new-r" });
  assert.equal(logouts[1]?.auth, "Bearer fake-new-a");
  assert.equal(hasTokens(), false);
});