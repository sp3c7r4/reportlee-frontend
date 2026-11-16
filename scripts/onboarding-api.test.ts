import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inviteFailure,
  slugLocalProblem,
  slugStatusFrom,
  spaceFailureMessage,
  workspaceFailure,
} from "../src/lib/onboarding.ts";

/* @info - Where each server answer is shown in the first-run flow. Messages are the
   backend's wording, copied from its error table. */

test("the slug format and the reserved list are checked before the server is asked", () => {
  assert.equal(slugLocalProblem("acme-ops"), null);
  assert.match(slugLocalProblem("ab") ?? "", /3 to 32/);
  assert.match(slugLocalProblem("-ab") ?? "", /3 to 32/);
  assert.match(slugLocalProblem("ab-") ?? "", /3 to 32/);
  assert.match(slugLocalProblem("a--b") ?? "", /3 to 32/);
  assert.match(slugLocalProblem("a".repeat(33)) ?? "", /3 to 32/);
  assert.equal(slugLocalProblem("admin"), "Reserved.");
});

test("a slug answer becomes the status the field shows", () => {
  const ok = (data: unknown) => ({ ok: true as const, status: 200, data });
  assert.deepEqual(slugStatusFrom(ok({ available: true }) as never), {
    state: "available",
  });
  assert.deepEqual(
    slugStatusFrom(ok({ available: false, reason: "taken" }) as never),
    { state: "unavailable", message: "That address is already taken." },
  );
  assert.deepEqual(
    slugStatusFrom(ok({ available: false, reason: "reserved" }) as never),
    { state: "unavailable", message: "Reserved." },
  );
  assert.equal(
    slugStatusFrom(ok({ available: false, reason: "invalid" }) as never).state,
    "unavailable",
  );
});

test("a failed slug check is not a verdict", () => {
  assert.deepEqual(slugStatusFrom({ ok: false, status: 500, message: "x" }), {
    state: "idle",
  });
});

test("create Workspace: 400 fields sit beside name, slug and time zone", () => {
  assert.deepEqual(
    workspaceFailure({
      status: 400,
      message: "Name is too short.",
      fields: {
        name: "Name is too short.",
        slug: "Use 3 to 32 lowercase letters, digits or hyphens.",
        timeZone: "Unknown time zone.",
      },
    }),
    {
      name: "Name is too short.",
      slug: "Use 3 to 32 lowercase letters, digits or hyphens.",
      timeZone: "Unknown time zone.",
    },
  );
});

test("create Workspace: 409 sits beside the slug", () => {
  assert.deepEqual(
    workspaceFailure({
      status: 409,
      message: "That address is already taken.",
    }),
    { slug: "That address is already taken." },
  );
});

test("create Workspace: an unverified 403 is read from the code, not the text", () => {
  const unverified = workspaceFailure({
    status: 403,
    message: "any wording at all",
    code: "EMAIL_NOT_VERIFIED",
  });
  assert.equal(unverified.verifyEmail, true);
  assert.equal(unverified.form, "Verify your email to continue.");

  const plain = workspaceFailure({
    status: 403,
    message: "Email not verified. Please verify your email to continue.",
  });
  assert.equal(plain.verifyEmail, undefined);
  assert.equal(
    plain.form,
    "Email not verified. Please verify your email to continue.",
  );
});

test("create Workspace: anything else is a message above the buttons", () => {
  assert.deepEqual(
    workspaceFailure({ status: 500, message: "Something went wrong." }),
    { form: "Something went wrong." },
  );
});

test("invitations: invitations.N.email maps to the row it was sent from", () => {
  // Rows 0 and 2 were filled in, so the second sent invitation is row 2.
  const result = inviteFailure(
    {
      status: 400,
      message: "Enter a valid email.",
      fields: { "invitations.1.email": "Enter a valid email." },
    },
    [0, 2],
  );
  assert.deepEqual(result, { rows: { 2: "Enter a valid email." } });
});

test("invitations: a 409 for one row sits on that row, for several it is a message", () => {
  assert.deepEqual(
    inviteFailure({ status: 409, message: "Already here." }, [3]),
    { rows: { 3: "Already here." } },
  );
  assert.deepEqual(
    inviteFailure({ status: 409, message: "Already here." }, [0, 1]),
    { rows: {}, form: "Already here." },
  );
});

test("invitations: a 422 seat message is shown above the buttons", () => {
  assert.deepEqual(
    inviteFailure(
      { status: 422, message: "This Workspace is at its member limit." },
      [0],
    ),
    { rows: {}, form: "This Workspace is at its member limit." },
  );
});

test("a Space failure shows beside its row, preferring the field message", () => {
  assert.equal(
    spaceFailureMessage({ message: "x", fields: { name: "Name too long." } }),
    "Name too long.",
  );
  assert.equal(
    spaceFailureMessage({ message: "Platform is already a Space." }),
    "Platform is already a Space.",
  );
});
