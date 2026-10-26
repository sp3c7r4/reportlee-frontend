import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FLOWS,
  flowConfig,
  isCompleteCode,
  normaliseDigit,
  parsePastedCode,
  resendSecondsLeft,
} from "../src/lib/otp.ts";

/* @info - A verified code must land on a route that exists. The flow table is the only
   place a destination is decided, which makes it the one thing worth asserting here. */
test("every flow lands on a route that exists", () => {
  const destinations = Object.values(FLOWS).map((flow) => flow.destination);
  assert.deepEqual(destinations.sort(), [
    "/dashboard",
    "/onboarding",
    "/reset-password",
  ]);
});

test("an unknown flow parameter is rejected rather than echoed", () => {
  assert.equal(flowConfig("../../evil.example"), null);
  assert.equal(flowConfig(""), null);
  assert.equal(flowConfig("login")?.id, "login");
});

test("only a single digit goes in a box", () => {
  assert.equal(normaliseDigit("7"), "7");
  assert.equal(normaliseDigit("77"), null);
  assert.equal(normaliseDigit("a"), null);
});

test("a pasted code is read out of whatever came with it", () => {
  assert.equal(parsePastedCode("  123 456 "), "123456");
  assert.equal(parsePastedCode("12345"), null);
  assert.equal(isCompleteCode("123456"), true);
  assert.equal(isCompleteCode("12345"), false);
});

test("the resend cooldown never goes negative", () => {
  const requestedAt = 1_000_000;
  assert.equal(resendSecondsLeft(requestedAt, requestedAt), 60);
  assert.equal(resendSecondsLeft(requestedAt, requestedAt + 30_000), 30);
  assert.equal(resendSecondsLeft(requestedAt, requestedAt + 600_000), 0);
});
