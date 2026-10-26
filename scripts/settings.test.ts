import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_NOW } from "../src/data/reports.ts";
import {
  activeBanner,
  aiSwitch,
  scheduleProblem,
  scheduleSummary,
  BANNER_ORDER,
} from "../src/lib/settings.ts";

/* @info - Workspace settings: one banner at a time, a schedule that names its timezone,
   and an AI switch that applies without a Save. */

test("a schedule needs a cadence, a time and a timezone", () => {
  assert.match(
    scheduleProblem({
      cadence: "weekly",
      weekday: "",
      time: "09:00",
      timeZone: "Africa/Lagos",
      dayOfMonth: null,
      lastDay: false,
    }) ?? "",
    /day/i,
  );
  assert.match(
    scheduleProblem({
      cadence: "weekly",
      weekday: "Monday",
      time: "",
      timeZone: "Africa/Lagos",
      dayOfMonth: null,
      lastDay: false,
    }) ?? "",
    /time/i,
  );
  assert.match(
    scheduleProblem({
      cadence: "weekly",
      weekday: "Monday",
      time: "09:00",
      timeZone: "",
      dayOfMonth: null,
      lastDay: false,
    }) ?? "",
    /zone/i,
  );
  assert.equal(
    scheduleProblem({
      cadence: "weekly",
      weekday: "Monday",
      time: "09:00",
      timeZone: "Africa/Lagos",
      dayOfMonth: null,
      lastDay: false,
    }),
    null,
  );
});

test("a monthly schedule needs a day or the last day", () => {
  assert.match(
    scheduleProblem({
      cadence: "monthly",
      weekday: "Monday",
      time: "09:00",
      timeZone: "Africa/Lagos",
      dayOfMonth: null,
      lastDay: false,
    }) ?? "",
    /day of the month|last day/i,
  );
  assert.equal(
    scheduleProblem({
      cadence: "monthly",
      weekday: "Monday",
      time: "09:00",
      timeZone: "Africa/Lagos",
      dayOfMonth: 15,
      lastDay: false,
    }),
    null,
  );
});

test("a schedule change is stated as a date, not as a promise", () => {
  const summary = scheduleSummary(
    {
      cadence: "weekly",
      weekday: "Monday",
      time: "09:00",
      timeZone: "Africa/Lagos",
      dayOfMonth: null,
      lastDay: false,
    },
    "Mon 2 Nov 2026",
  );
  assert.match(summary, /Monday/);
  assert.match(summary, /09:00/);
  assert.match(summary, /Africa\/Lagos/);
  assert.match(summary, /2 Nov/);
});

test("only one banner shows, and the most urgent wins", () => {
  assert.equal(BANNER_ORDER[0], "readOnly");
  const all = {
    readOnly: true,
    pastDue: true,
    grace: true,
    trialDays: 5,
  };
  assert.equal(activeBanner(all, SAMPLE_NOW)?.kind, "readOnly");
  assert.equal(
    activeBanner({ ...all, readOnly: false }, SAMPLE_NOW)?.kind,
    "pastDue",
  );
  assert.equal(
    activeBanner({ ...all, readOnly: false, pastDue: false }, SAMPLE_NOW)?.kind,
    "grace",
  );
  assert.equal(
    activeBanner(
      { readOnly: false, pastDue: false, grace: false, trialDays: 5 },
      SAMPLE_NOW,
    )?.kind,
    "trial",
  );
  assert.equal(
    activeBanner(
      { readOnly: false, pastDue: false, grace: false, trialDays: null },
      SAMPLE_NOW,
    ),
    null,
  );
});

test("a banner never computes money", () => {
  const banner = activeBanner(
    { readOnly: false, pastDue: true, grace: false, trialDays: null },
    SAMPLE_NOW,
  );
  assert.equal(banner?.kind, "pastDue");
  assert.equal(/[$₦£€\d]+\s*(per|\/)\s*month/i.test(banner?.body ?? ""), false);
});

test("the AI switch applies at once and is gated by the plan and the switch", () => {
  assert.equal(aiSwitch({ plan: "starter", aiEnabled: true }).allowed, false);
  assert.match(
    aiSwitch({ plan: "starter", aiEnabled: true }).reason ?? "",
    /Team/,
  );
  assert.equal(aiSwitch({ plan: "team", aiEnabled: false }).allowed, false);
  assert.match(
    aiSwitch({ plan: "team", aiEnabled: false }).reason ?? "",
    /switched off/i,
  );
  assert.equal(aiSwitch({ plan: "team", aiEnabled: true }).allowed, true);
  assert.equal(aiSwitch({ plan: "enterprise", aiEnabled: true }).allowed, true);
});
