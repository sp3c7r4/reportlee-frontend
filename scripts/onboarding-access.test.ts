import assert from "node:assert/strict";
import { test } from "node:test";
import { canEnterOnboarding } from "../src/lib/onboarding.ts";

/* @info - Workspace setup is an admin act. This is a convenience redirect, the server
   guards every write. */
test("only an admin may enter onboarding", () => {
  assert.equal(canEnterOnboarding("admin"), true);
  assert.equal(canEnterOnboarding("staff"), false);
  assert.equal(canEnterOnboarding("head"), false);
  assert.equal(canEnterOnboarding(undefined), false);
});
