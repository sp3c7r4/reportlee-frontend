import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { listMembers, updateMember } from "../src/lib/members.ts";
import { createSpace, listSpaces, updateSpace } from "../src/lib/spaces-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";
import {
  checkSlug,
  createWorkspace,
  getMemberships,
  setLastWorkspace,
  updateWorkspace,
} from "../src/lib/workspaces.ts";

/* @info - Paths, methods and bodies of the Workspace, Space and member calls, against
   a stubbed fetch. Names and emails are made up. */
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

const path = (url: string) => url.slice(url.indexOf("/", 8));

beforeEach(() => setTokens({ accessToken: "fake-a", refreshToken: "fake-r" }));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearTokens();
});

test("getMemberships reads /me/memberships and keeps string ids", async () => {
  const calls = stub(200, {
    data: {
      user: { id: "5", name: "Ada Obi", email: "ada@example.com" },
      memberships: [
        {
          id: "31",
          userId: "5",
          workspaceId: "12",
          role: "admin",
          space: null,
          spaceId: null,
        },
      ],
      workspaces: [],
      lastWorkspaceId: "12",
    },
  });
  const result = await getMemberships();
  assert.equal(calls[0].method, "GET");
  assert.ok(path(calls[0].url).endsWith("/me/memberships"));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.lastWorkspaceId, "12");
    assert.equal(result.data.memberships[0].id, "31");
  }
});

test("setLastWorkspace PUTs the id as a string", async () => {
  const calls = stub(200, { data: { lastWorkspaceId: "12" } });
  await setLastWorkspace("12");
  assert.equal(calls[0].method, "PUT");
  assert.ok(calls[0].url.endsWith("/me/last-workspace"));
  assert.deepEqual(calls[0].body, { workspaceId: "12" });
});

test("a foreign Workspace on switch is a 404 with the server message", async () => {
  stub(404, { error: { message: "Workspace not found." } });
  const result = await setLastWorkspace("99");
  assert.deepEqual(result, {
    ok: false,
    status: 404,
    message: "Workspace not found.",
  });
});

test("createWorkspace sends name and slug, and maps field errors on a 400", async () => {
  const calls = stub(400, {
    error: { slug: "Use 3 to 32 lowercase letters, digits or hyphens." },
  });
  const result = await createWorkspace({ name: "Acme Ops", slug: "a" });
  assert.deepEqual(calls[0].body, { name: "Acme Ops", slug: "a" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.equal(
      result.fields?.slug,
      "Use 3 to 32 lowercase letters, digits or hyphens.",
    );
  }
});

test("createWorkspace: 409 is a message, an unverified 403 carries its code", async () => {
  stub(409, { error: { message: "That address is already taken." } });
  const taken = await createWorkspace({ name: "Acme", slug: "acme" });
  assert.equal(taken.ok, false);
  if (!taken.ok) {
    assert.equal(taken.status, 409);
    assert.equal(taken.fields, undefined);
  }

  stub(403, { error: { message: "Verify.", code: "EMAIL_NOT_VERIFIED" } });
  const unverified = await createWorkspace({ name: "Acme", slug: "acme" });
  assert.equal(unverified.ok, false);
  if (!unverified.ok) assert.equal(unverified.code, "EMAIL_NOT_VERIFIED");
});

test("checkSlug puts the slug in the query, encoded", async () => {
  const calls = stub(200, { data: { available: false, reason: "taken" } });
  const result = await checkSlug("a b&c");
  assert.ok(calls[0].url.endsWith("/workspaces/slug-available?slug=a%20b%26c"));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, { available: false, reason: "taken" });
  }
});

test("updateWorkspace PATCHes only the keys given", async () => {
  const calls = stub(200, { data: { id: "12" } });
  await updateWorkspace("12", { name: "New name" });
  assert.equal(calls[0].method, "PATCH");
  assert.ok(calls[0].url.endsWith("/workspaces/12"));
  assert.deepEqual(calls[0].body, { name: "New name" });
});

test("Space calls use the Workspace path and string ids", async () => {
  let calls = stub(200, { data: [] });
  await listSpaces("12");
  assert.ok(calls[0].url.endsWith("/workspaces/12/spaces"));

  calls = stub(201, { data: { id: "9" } });
  await createSpace("12", "Platform");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].body, { name: "Platform" });

  calls = stub(200, { data: { id: "9" } });
  await updateSpace("12", "9", { headMembershipId: null, archived: false });
  assert.equal(calls[0].method, "PATCH");
  assert.ok(calls[0].url.endsWith("/workspaces/12/spaces/9"));
  assert.deepEqual(calls[0].body, { headMembershipId: null, archived: false });
});

test("archiving a Space with members shows the 409 message", async () => {
  stub(409, {
    error: { message: "Move its members out before archiving this Space." },
  });
  const result = await updateSpace("12", "9", { archived: true });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.equal(
      result.message,
      "Move its members out before archiving this Space.",
    );
  }
});

test("member calls use the roster path, and a 422 is a plain message", async () => {
  let calls = stub(200, { data: [] });
  await listMembers("12");
  assert.ok(calls[0].url.endsWith("/workspaces/12/members"));

  calls = stub(422, {
    error: {
      message: "This Workspace is at its member limit (10 of 10 seats used).",
    },
  });
  const result = await updateMember("12", "31", { active: true });
  assert.equal(calls[0].method, "PATCH");
  assert.ok(calls[0].url.endsWith("/workspaces/12/members/31"));
  assert.deepEqual(calls[0].body, { active: true });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 422);
    assert.equal(result.fields, undefined);
  }
});
