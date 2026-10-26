import assert from "node:assert/strict";
import test from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import { SAMPLE_PERIOD, SAMPLE_REPORTS } from "../src/data/reports.ts";
import { analyticsFor } from "../src/lib/analytics.ts";
import { answerFor, assistantGate, SUGGESTIONS } from "../src/lib/assistant.ts";

/* @info - The Assistant answers from the same module analytics uses, so the two cannot
   disagree, and it never reads a draft. */

const admin = {
  membershipId: "mem_admin",
  role: "admin" as const,
  space: null,
};
const staff = {
  membershipId: "mem_staff",
  role: "staff" as const,
  space: "Platform",
};

const base = {
  viewer: admin,
  reports: SAMPLE_REPORTS,
  roster: CO_LEAGUE_ROSTER,
  period: SAMPLE_PERIOD,
};

test("the gate needs the switch and the plan", () => {
  assert.equal(
    assistantGate({ plan: "starter", aiEnabled: true }).allowed,
    false,
  );
  assert.equal(
    assistantGate({ plan: "team", aiEnabled: false }).allowed,
    false,
  );
  assert.equal(assistantGate({ plan: "team", aiEnabled: true }).allowed, true);
});

test("an on-time question reads the same figure analytics shows", () => {
  const view = analyticsFor({ ...base, viewer: admin });
  const answer = answerFor({ ...base, question: "How is our on-time rate?" });
  assert.match(answer.text, new RegExp(view.cards[0].value.replace("%", "\%")));
  assert.match(answer.sources, /Week of 19 October/);
});

test("the answer states what it counted", () => {
  const answer = answerFor({ ...base, question: "Who has not submitted?" });
  assert.match(answer.text, /Checked \d+ Reports/);
});

test("a draft is never read, and the answer says so", () => {
  const draft = {
    ...SAMPLE_REPORTS[0],
    id: "d1",
    submissionStatus: "draft" as const,
    accomplishments: "<p>secret</p>",
  };
  const answer = answerFor({
    ...base,
    reports: [...SAMPLE_REPORTS, draft],
    question: "What is in the draft?",
  });
  assert.equal(answer.text.toLowerCase().includes("secret"), false);
  assert.match(answer.text, /draft/i);
});

test("an off-topic question is declined instead of invented", () => {
  const answer = answerFor({ ...base, question: "What is the weather?" });
  assert.match(answer.text, /only answer/i);
});

test("a staff question is scoped to their own record", () => {
  const answer = answerFor({
    ...base,
    viewer: staff,
    question: "How is our on-time rate?",
  });
  assert.match(answer.text, /your/i);
});

test("suggestions are short and answerable", () => {
  assert.ok(SUGGESTIONS.length >= 3);
  assert.equal(
    SUGGESTIONS.every((line) => line.length < 60),
    true,
  );
});
