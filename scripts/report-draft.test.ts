import assert from "node:assert/strict";
import test from "node:test";
import type { ReportDraft } from "../src/data/reports.ts";
import {
  ACCOMPLISHMENTS_MIN,
  COLLEAGUE_CAP,
  htmlToLines,
  htmlToText,
  normaliseKpiRows,
  normaliseKpiValue,
  removeColleague,
  SECTION_MAX,
  selectColleague,
  submissionStatusFor,
  submitBlockers,
} from "../src/lib/report-draft.ts";

/* @info - These assertions come from the report-submit spec, not from the module. A
   blank KPI is "not provided", never zero; a typo is refused, never coerced; tags are
   Membership ids with a cap; the deadline decides late. */

const draft = (over: Partial<ReportDraft> = {}): ReportDraft =>
  ({
    id: "draft_1",
    periodId: "per_1",
    authorMembershipId: "mem_staff",
    accomplishments: "x".repeat(ACCOMPLISHMENTS_MIN),
    challenges: "A challenge",
    plans: "A plan",
    kpis: [{ name: "Reports reviewed", unit: "count", value: null }],
    attachments: [],
    taggedMembershipIds: [],
    location: null,
    submissionStatus: "draft",
    reviewStatus: "pending",
    updatedAt: "2026-10-26T10:00:00.000Z",
    ...over,
  }) as ReportDraft;

test("accomplishments under 50 characters blocks submit and names its field", () => {
  const short = submitBlockers(draft({ accomplishments: "x".repeat(49) }));
  assert.equal(short.length, 1);
  assert.equal(short[0].field, "accomplishments");
  assert.match(short[0].message, /50/);

  assert.deepEqual(submitBlockers(draft()), []);
});

test("a section may not exceed 5,000 characters", () => {
  const long = submitBlockers(draft({ plans: "x".repeat(SECTION_MAX + 1) }));
  assert.equal(long.length, 1);
  assert.equal(long[0].field, "plans");
  assert.match(long[0].message, /5,?000/);
});

test("the minimum applies to accomplishments, not to the other sections", () => {
  const problems = submitBlockers(
    draft({ challenges: "ok", plans: "ok", accomplishments: "x".repeat(50) }),
  );
  assert.deepEqual(problems, []);
});

test("a blank KPI is null, zero is a value, letters are refused", () => {
  assert.deepEqual(normaliseKpiValue(""), { ok: true, value: null });
  assert.deepEqual(normaliseKpiValue("   "), { ok: true, value: null });
  assert.deepEqual(normaliseKpiValue("0"), { ok: true, value: 0 });
  assert.deepEqual(normaliseKpiValue("12.5"), { ok: true, value: 12.5 });

  const letters = normaliseKpiValue("twelve");
  assert.equal(letters.ok, false);
  assert.match(letters.ok === false ? letters.message : "", /number/i);
});

test("an added KPI row needs a name and a numeric value", () => {
  const rows = normaliseKpiRows([
    { name: "", unit: "count", raw: "3" },
    { name: "Visits", unit: "count", raw: "many" },
    { name: "Blank", unit: "count", raw: "" },
  ]);

  assert.equal(rows.ok, false);
  if (rows.ok) return;
  assert.deepEqual(
    rows.problems.map((p) => [p.index, p.field]),
    [
      [0, "name"],
      [1, "value"],
    ],
  );

  const good = normaliseKpiRows([{ name: "Visits", unit: "count", raw: "" }]);
  assert.equal(good.ok, true);
  if (!good.ok) return;
  assert.equal(good.kpis[0].value, null);
});

test("a blank KPI never blocks submit", () => {
  const problems = submitBlockers(
    draft({ kpis: [{ name: "Visits", unit: "count", value: null }] }),
  );
  assert.deepEqual(problems, []);
});

test("colleagues are Membership ids, de-duplicated and capped", () => {
  let ids: string[] = [];
  ids = selectColleague(ids, "mem_a").ids;
  // Picking the same colleague again stores one id, not two.
  const twice = selectColleague(ids, "mem_a");
  assert.deepEqual(twice.ids, ["mem_a"]);

  for (const id of ["mem_b", "mem_c", "mem_d", "mem_e"]) {
    ids = selectColleague(ids, id).ids;
  }
  assert.equal(ids.length, COLLEAGUE_CAP);

  const over = selectColleague(ids, "mem_f");
  assert.equal(over.ids.length, COLLEAGUE_CAP);
  assert.match(over.message ?? "", /5/);

  assert.deepEqual(removeColleague(ids, "mem_b"), [
    "mem_a",
    "mem_c",
    "mem_d",
    "mem_e",
  ]);
});

test("the deadline decides late, not the person", () => {
  const period = {
    id: "per_1",
    label: "This week",
    startsAt: "2026-10-19T00:00:00.000Z",
    endsAt: "2026-10-25T23:59:59.000Z",
    dueAt: "2026-10-26T17:00:00.000Z",
  } as const;

  assert.equal(
    submissionStatusFor(period, "2026-10-26T16:59:00.000Z"),
    "submitted",
  );
  assert.equal(submissionStatusFor(period, "2026-10-26T17:00:01.000Z"), "late");
});

/* @info - The sections are rich text now, so a stored draft is HTML. A rule written
   against the markup would count tags and let a report of 40 real characters through. */
test("length is measured on the text, not the markup", () => {
  assert.equal(
    htmlToText("<p>Hello <strong>there</strong></p>"),
    "Hello there",
  );
  assert.equal(htmlToText("<p></p>"), "");
  assert.equal(htmlToText("<ul><li>One</li><li>Two</li></ul>"), "One Two");
  assert.equal(htmlToText("<p>a&nbsp;b &amp; c</p>"), "a b & c");

  // 39 + the space a paragraph break contributes + 9 = 49 characters of text.
  const markupHeavy = `<p>${"x".repeat(39)}</p><p><strong>${"y".repeat(9)}</strong></p>`;
  assert.equal(htmlToText(markupHeavy).length, 49);
  assert.equal(
    submitBlockers(draft({ accomplishments: markupHeavy })).length,
    1,
    "49 real characters must still be refused",
  );

  const enough = `<p>${"x".repeat(40)}</p><p><strong>${"y".repeat(9)}</strong></p>`;
  assert.equal(submitBlockers(draft({ accomplishments: enough })).length, 0);
});

test("an empty rich text document blocks submit like an empty field", () => {
  const problems = submitBlockers(draft({ accomplishments: "<p></p>" }));
  assert.equal(problems.length, 1);
  assert.equal(problems[0].field, "accomplishments");
});

/* @info - The Report page shows text, never markup: a stored draft must not be able to
   put an element on the page, and a list must still read as lines. */
test("display text keeps the line breaks and drops the markup", () => {
  assert.equal(htmlToLines("<p>One</p><p>Two</p>"), "One\nTwo");
  assert.equal(
    htmlToLines("<ul><li>Alpha</li><li>Beta</li></ul>"),
    "Alpha\nBeta",
  );
  assert.equal(htmlToLines("a<br>b"), "a\nb");
  assert.equal(
    htmlToLines("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"),
    "<script>alert(1)</script>",
  );
  assert.equal(htmlToLines("<p>  spaced   out  </p>"), "spaced out");
});
