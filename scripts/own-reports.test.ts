import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { CO_LEAGUE_ROSTER } from "../src/data/members.ts";
import {
  type Report,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
} from "../src/data/reports.ts";
import { SAMPLE_TASKS } from "../src/data/tasks.ts";
import { homeFor } from "../src/lib/home.ts";
import { loadOwnReports, ownRecordFor } from "../src/lib/reports-api.ts";
import { clearTokens, setTokens } from "../src/lib/tokens.ts";

/* @info - The owner's bug: a staff member submits a Report, and Home still says
   "Submit your Report" while My record counts it as missing, because both read the
   sample data. These run the server's answer (stubbed fetch) through the same
   functions the two screens use. Ids, dates and text are made up. */

const realFetch = globalThis.fetch;
beforeEach(() => setTokens({ accessToken: "fake-a", refreshToken: "fake-r" }));
afterEach(() => {
  globalThis.fetch = realFetch;
  clearTokens();
});

const period = {
  id: "4",
  label: "Week of 16 November",
  startsAt: "2026-11-16T00:00:00.000Z",
  endsAt: "2026-11-22T23:59:59.000Z",
  dueAt: "2026-11-23T17:00:00.000Z",
};
const now = "2026-11-18T21:00:00.000Z";

const submitted = {
  id: "6",
  periodId: "4",
  authorMembershipId: "17",
  accomplishments: "<p>Closed the audit.</p>",
  challenges: "",
  plans: "",
  kpis: [],
  attachments: [],
  taggedMembershipIds: [],
  location: null,
  submissionStatus: "submitted",
  reviewStatus: "approved",
  updatedAt: "2026-11-18T20:12:40.498Z",
  submittedAt: "2026-11-18T20:12:40.498Z",
  firstSeenAt: null,
  windowStartedAt: null,
  editWindowMinutes: 30,
  revisions: [],
  events: [
    {
      kind: "submitted",
      at: "2026-11-18T20:12:40.498Z",
      actorMembershipId: "17",
    },
    {
      kind: "approved",
      at: "2026-11-18T20:42:40.498Z",
      actorMembershipId: "16",
    },
  ],
  comments: [],
} as unknown as Report;

/** Answers each path the way the API does for a staff member with one submitted Report. */
function stubApi(drafts: unknown[] = []) {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string) => {
    const url = String(input);
    urls.push(url);
    const data = url.includes("/reporting-periods/current")
      ? period
      : url.includes("status=draft")
        ? drafts
        : [submitted];
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  }) as typeof fetch;
  return urls;
}

const staff = { membershipId: "17", role: "staff" as const, space: "Ops" };

test("loadOwnReports reads the current period, the caller's Reports and drafts for the Workspace", async () => {
  const urls = stubApi();
  const result = await loadOwnReports("9", { drafts: true });
  assert.equal(result.ok, true);
  assert.ok(
    urls.some((u) => u.endsWith("/reporting-periods/current?workspaceId=9")),
  );
  assert.ok(
    urls.some(
      (u) => /\/reports\?workspaceId=9(&|$)/.test(u) && !u.includes("status="),
    ),
  );
  assert.ok(
    urls.some((u) => u.endsWith("/reports?workspaceId=9&status=draft")),
  );
  if (!result.ok) return;
  assert.equal(result.data.period.id, "4");
  assert.deepEqual(
    result.data.reports.map((r) => r.id),
    ["6"],
  );
  assert.equal(result.data.hasDraft, false);
});

test("loadOwnReports skips the drafts call when asked, and passes a failure through", async () => {
  const urls = stubApi();
  await loadOwnReports("9", { drafts: false });
  assert.equal(
    urls.some((u) => u.includes("status=draft")),
    false,
  );

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ success: false, error: { message: "Not found." } }),
      {
        status: 404,
      },
    )) as unknown as typeof fetch;
  const failed = await loadOwnReports("9", { drafts: true });
  assert.equal(failed.ok, false);
});

test("a draft counts only when it belongs to the current period", async () => {
  stubApi([
    { ...submitted, id: "8", periodId: "3", submissionStatus: "draft" },
  ]);
  const old = await loadOwnReports("9", { drafts: true });
  assert.equal(old.ok && old.data.hasDraft, false);
  stubApi([
    { ...submitted, id: "8", periodId: "4", submissionStatus: "draft" },
  ]);
  const open = await loadOwnReports("9", { drafts: true });
  assert.equal(open.ok && open.data.hasDraft, true);
});

test("Home: a staff member whose Report is in is not asked to submit, and sees the real period", async () => {
  stubApi();
  const result = await loadOwnReports("9", { drafts: true });
  assert.ok(result.ok);
  const home = homeFor({
    viewer: staff,
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    tasks: SAMPLE_TASKS,
    period: SAMPLE_PERIOD,
    now: SAMPLE_NOW,
    mine: { ...result.data, now },
  });
  assert.equal(home.period.label, "Week of 16 November");
  assert.equal(home.period.dueAt, period.dueAt);
  assert.equal(home.period.isOpen, true);
  const kinds = home.attention.map((item) => item.kind);
  assert.equal(kinds.includes("submit"), false);
  assert.equal(kinds.includes("draft"), false);
  assert.deepEqual(
    home.decisions.map((row) => [row.id, row.label, row.href]),
    [["6", "Approved", "/dashboard/reports/6"]],
  );
});

test("Home: a staff member with nothing in this period is asked to submit, for the real period", () => {
  const home = homeFor({
    viewer: staff,
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    tasks: [],
    period: SAMPLE_PERIOD,
    now: SAMPLE_NOW,
    mine: {
      period,
      reports: [{ ...submitted, periodId: "3" }],
      hasDraft: false,
      now,
    },
  });
  assert.equal(home.attention[0].kind, "submit");
  assert.equal(home.attention[0].detail, "Week of 16 November is open");
});

test("Home: a server draft for this period points at the draft", () => {
  const home = homeFor({
    viewer: staff,
    reports: SAMPLE_REPORTS,
    roster: CO_LEAGUE_ROSTER,
    tasks: [],
    period: SAMPLE_PERIOD,
    now: SAMPLE_NOW,
    mine: { period, reports: [], hasDraft: true, now },
  });
  assert.equal(home.attention[0].kind, "draft");
  assert.doesNotMatch(home.attention[0].detail, /this device/);
});

test("My record: the submitted Report counts as on time, not missing", async () => {
  stubApi();
  const result = await loadOwnReports("9", { drafts: false });
  assert.ok(result.ok);
  const view = ownRecordFor({ viewer: staff, ...result.data });
  assert.equal(view.scope, "me");
  const card = (key: string) => view.cards.find((c) => c.key === key);
  assert.equal(card("onTime")?.value, "100%");
  assert.equal(card("onTime")?.detail, "1 of 1 expected Reports arrived");
  assert.equal(card("missing")?.value, "0");
  assert.equal(card("late")?.value, "0");
  assert.equal(card("decision")?.value, "30 min");
  assert.deepEqual(view.groups, []);
});

test("My record: a late Report counts as late, and nothing in the period counts as missing", () => {
  const late = ownRecordFor({
    viewer: staff,
    period,
    reports: [{ ...submitted, submissionStatus: "late" }],
  });
  assert.equal(late.cards.find((c) => c.key === "late")?.value, "1");
  const none = ownRecordFor({
    viewer: staff,
    period,
    reports: [{ ...submitted, periodId: "3" }],
  });
  assert.equal(none.cards.find((c) => c.key === "missing")?.value, "1");
});
