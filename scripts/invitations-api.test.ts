import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  acceptInvitation,
  createInvitations,
  listInvitations,
  previewInvitation,
  revokeInvitation,
} from "../src/lib/invitations.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - Invitation calls against a stubbed fetch. The token below is a made-up
   string, not one a server issued. */
type Seen = { url: string; method: string; body: unknown };

const realFetch = globalThis.fetch;
const TOKEN = "fake-invite-token-0123456789";

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

test("createInvitations sends the rows and returns the links once", async () => {
  const calls = stub(201, {
    data: [
      {
        id: "4",
        email: "new.person@example.com",
        role: "staff",
        space: "Platform",
        spaceId: "9",
        sentAt: "2026-11-16T09:00:00.000Z",
        invitedByMembershipId: "31",
        expired: false,
        inviteUrl: "http://localhost:3000/invite/fake",
      },
    ],
  });
  const result = await createInvitations("12", [
    { email: "new.person@example.com", role: "staff", spaceId: "9" },
  ]);
  assert.equal(calls[0].method, "POST");
  assert.ok(calls[0].url.endsWith("/workspaces/12/invitations"));
  assert.deepEqual(calls[0].body, {
    invitations: [
      { email: "new.person@example.com", role: "staff", spaceId: "9" },
    ],
  });
  assert.equal(result.ok, true);
  if (result.ok)
    assert.equal(result.data[0].inviteUrl.includes("/invite/"), true);
});

test("a 400 maps invitations.N.email to the row", async () => {
  stub(400, { error: { "invitations.1.email": "Enter a valid email." } });
  const result = await createInvitations("12", [
    { email: "a@example.com", role: "staff", spaceId: "9" },
    { email: "bad", role: "staff", spaceId: "9" },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.fields?.["invitations.1.email"],
      "Enter a valid email.",
    );
  }
});

test("409 and 422 on create are messages, not field errors", async () => {
  stub(409, {
    error: {
      message:
        "That person is already in this Workspace or has a pending invitation.",
    },
  });
  const duplicate = await createInvitations("12", []);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.fields, undefined);
  }

  stub(422, { error: { message: "This Workspace is at its member limit." } });
  const full = await createInvitations("12", []);
  assert.equal(full.ok, false);
  if (!full.ok) assert.equal(full.status, 422);
});

test("a 403 for a Head inviting an Admin has no code", async () => {
  stub(403, { error: { message: "You do not have permission to do this." } });
  const result = await createInvitations("12", [
    { email: "a@example.com", role: "admin" },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.code, undefined);
  }
});

test("listInvitations and revokeInvitation use the Workspace path", async () => {
  let calls = stub(200, { data: [] });
  await listInvitations("12");
  assert.equal(calls[0].method, "GET");
  assert.ok(calls[0].url.endsWith("/workspaces/12/invitations"));

  calls = stub(200, { data: { id: "4", status: "revoked" } });
  await revokeInvitation("12", "4");
  assert.equal(calls[0].method, "DELETE");
  assert.ok(calls[0].url.endsWith("/workspaces/12/invitations/4"));
});

test("revoking a missing invitation is a 404", async () => {
  stub(404, { error: { message: "Invitation not found." } });
  const result = await revokeInvitation("12", "4");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("preview and accept send the token in the body, never in the URL", async () => {
  let calls = stub(200, {
    data: {
      workspaceName: "Acme Ops",
      role: "staff",
      spaceName: "Platform",
      email: "n***@example.com",
    },
  });
  const preview = await previewInvitation(TOKEN);
  assert.equal(calls[0].method, "POST");
  assert.ok(calls[0].url.endsWith("/invitations/preview"));
  assert.equal(calls[0].url.includes(TOKEN), false);
  assert.deepEqual(calls[0].body, { token: TOKEN });
  assert.equal(preview.ok, true);

  calls = stub(200, {
    data: { membership: { id: "31" }, workspace: { id: "12" } },
  });
  await acceptInvitation(TOKEN);
  assert.ok(calls[0].url.endsWith("/invitations/accept"));
  assert.equal(calls[0].url.includes(TOKEN), false);
  assert.deepEqual(calls[0].body, { token: TOKEN });
});

test("preview 404 and both 403 codes come through for the page to branch on", async () => {
  stub(404, {
    error: { message: "This invitation is not valid. Ask for a new one." },
  });
  const invalid = await previewInvitation(TOKEN);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.status, 404);

  stub(403, {
    error: {
      message: "This invitation was sent to n***@example.com.",
      code: "INVITE_EMAIL_MISMATCH",
    },
  });
  const mismatch = await previewInvitation(TOKEN);
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.code, "INVITE_EMAIL_MISMATCH");

  stub(403, { error: { message: "Verify.", code: "EMAIL_NOT_VERIFIED" } });
  const unverified = await acceptInvitation(TOKEN);
  assert.equal(unverified.ok, false);
  if (!unverified.ok) assert.equal(unverified.code, "EMAIL_NOT_VERIFIED");
});

test("accept 409 is a message the page shows", async () => {
  stub(409, { error: { message: "You already belong to this Workspace." } });
  const result = await acceptInvitation(TOKEN);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.equal(result.message, "You already belong to this Workspace.");
  }
});
