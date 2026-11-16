import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearPendingInvite,
  getPendingInvite,
  inviteReturnPath,
  isInviteToken,
  isTerminalInviteError,
  PENDING_INVITE_KEY,
  setPendingInvite,
} from "../src/lib/pending-invite.ts";

/* @info - An in-memory store stands in for sessionStorage. The token is made up. */
function memoryStore() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const TOKEN = "fake-invite-token-0123456789";

test("a token is stored under the one key and read back", () => {
  const store = memoryStore();
  setPendingInvite(store, TOKEN);
  assert.equal(store.map.get(PENDING_INVITE_KEY), TOKEN);
  assert.equal(getPendingInvite(store), TOKEN);
});

test("clearing removes it, so the return trip happens once", () => {
  const store = memoryStore();
  setPendingInvite(store, TOKEN);
  assert.equal(inviteReturnPath(store), `/invite/${TOKEN}`);
  clearPendingInvite(store);
  assert.equal(getPendingInvite(store), null);
  assert.equal(inviteReturnPath(store), null);
});

test("something that is not token shaped is neither stored nor trusted", () => {
  const store = memoryStore();
  setPendingInvite(store, "../../evil");
  assert.equal(store.map.size, 0);

  store.setItem(PENDING_INVITE_KEY, "/dashboard?x=1");
  assert.equal(getPendingInvite(store), null);
  assert.equal(inviteReturnPath(store), null);
});

test("token shape: 20 to 100 safe characters", () => {
  assert.equal(isInviteToken(TOKEN), true);
  assert.equal(isInviteToken("short"), false);
  assert.equal(isInviteToken("a".repeat(101)), false);
  assert.equal(isInviteToken(`${TOKEN}/x`), false);
  assert.equal(isInviteToken(null), false);
});

test("a storage that throws is survivable", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  setPendingInvite(broken, TOKEN);
  clearPendingInvite(broken);
  assert.equal(getPendingInvite(broken), null);
});

/* @info - The wrong-account loop: the shell keeps sending the visitor back while the
   token is stored, so a terminal answer must clear it and end the return trip. */
test("a wrong-account answer clears the token and ends the return trip", () => {
  const store = memoryStore();
  setPendingInvite(store, TOKEN);
  if (isTerminalInviteError(403, "INVITE_EMAIL_MISMATCH")) {
    clearPendingInvite(store);
  }
  assert.equal(store.map.has(PENDING_INVITE_KEY), false);
  assert.equal(inviteReturnPath(store), null);
});

test("not found, expired, revoked and already used are terminal", () => {
  assert.equal(isTerminalInviteError(403, "INVITE_EMAIL_MISMATCH"), true);
  assert.equal(isTerminalInviteError(404, undefined), true);
  assert.equal(isTerminalInviteError(409, undefined), true);
});

test("retryable failures keep the token", () => {
  assert.equal(isTerminalInviteError(403, "EMAIL_NOT_VERIFIED"), false);
  assert.equal(isTerminalInviteError(403, undefined), false);
  assert.equal(isTerminalInviteError(401, undefined), false);
  assert.equal(isTerminalInviteError(500, undefined), false);
});
