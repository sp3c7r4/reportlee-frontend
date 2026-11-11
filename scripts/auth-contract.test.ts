import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractError,
  isAccessExpired,
  toFrontendRole,
  unwrapEnvelope,
} from "../src/lib/auth-contract.ts";

/* @info - Shapes copied from the backend's send-response, error middleware and Zod
   service. A wrong read here shows the user a generic message instead of the field
   that failed, and no screen would look broken. */

test("a thrown app error answers with its message and no field errors", () => {
  const payload = {
    success: false,
    status: 401,
    error: { message: "Invalid email or password" },
  };
  assert.deepEqual(extractError(payload, "fallback"), {
    message: "Invalid email or password",
    fieldErrors: {},
  });
});

test("a validation error maps each path to its field", () => {
  const payload = {
    success: false,
    status: 400,
    error: { loginType: "Invalid input", email: "Invalid email" },
  };
  const result = extractError(payload, "fallback");
  assert.deepEqual(result.fieldErrors, {
    loginType: "Invalid input",
    email: "Invalid email",
  });
  assert.equal(result.message, "Invalid input");
});

test("the empty path of the password refine lands on password", () => {
  const result = extractError(
    { success: false, error: { "": "Password is required" } },
    "fallback",
  );
  assert.deepEqual(result.fieldErrors, { password: "Password is required" });
});

test("an unreadable body falls back", () => {
  assert.deepEqual(extractError(null, "fallback"), {
    message: "fallback",
    fieldErrors: {},
  });
  assert.equal(
    extractError({ success: false }, "fallback").message,
    "fallback",
  );
});

test("the envelope is unwrapped, including the nested /auth/me user", () => {
  const me = {
    success: true,
    data: {
      message: "ok",
      data: { email: "ada@example.com", roles: ["member"] },
    },
  };
  const data = unwrapEnvelope<{ data: { email: string } }>(me);
  assert.equal(data?.data.email, "ada@example.com");
  assert.equal(unwrapEnvelope(null), undefined);
});

test("backend roles map to frontend roles, admin winning", () => {
  assert.equal(toFrontendRole(["admin"]), "admin");
  assert.equal(toFrontendRole(["member"]), "staff");
  assert.equal(toFrontendRole(["member", "admin"]), "admin");
  assert.equal(toFrontendRole([]), "staff");
  assert.equal(toFrontendRole(undefined), "staff");
});

test("only a 401 reads as an expired access token", () => {
  assert.equal(isAccessExpired(401), true);
  assert.equal(isAccessExpired(400), false);
  assert.equal(isAccessExpired(403), false);
});
