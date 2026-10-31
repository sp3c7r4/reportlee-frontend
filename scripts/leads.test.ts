import assert from "node:assert/strict";
import { test } from "node:test";
import type { CapturedLead, LeadDraft } from "../src/data/leads.ts";
import {
  filterLeads,
  firstError,
  leadsToCsv,
  leadToCsvRow,
  validateLead,
} from "../src/lib/leads.ts";

/**
 * Tests written from the acceptance checks AC1..AC9 in design.md, not from the
 * implementation. They cover the validation rules (AC2), the first-error order (AC2),
 * phone kept verbatim (AC4), the search and the combining filters (AC5), and the CSV
 * quoting that keeps the column count (AC6).
 */

/** A draft that would pass, so a single bad field can be isolated per test. */
function validDraft(overrides: Partial<LeadDraft> = {}): LeadDraft {
  return {
    fullName: "Chidi Okeke",
    email: "chidi@example.com",
    phone: "+234 801 234 5678",
    company: "Lagos Analytics",
    jobTitle: "Head of Data",
    notes: "Wants a demo.",
    consent: { given: true, at: "2026-10-31T10:15:00.000Z" },
    ...overrides,
  };
}

test("AC2: a valid draft has no errors", () => {
  assert.deepEqual(validateLead(validDraft()), []);
});

test("AC2: a missing name blocks submit and names the fullName field", () => {
  const errors = validateLead(validDraft({ fullName: "   " }));
  assert.ok(errors.some((error) => error.field === "fullName"));
});

test("AC2: neither email nor phone blocks submit with one combined contact error", () => {
  const errors = validateLead(validDraft({ email: null, phone: null }));
  const contactErrors = errors.filter((error) => error.field === "contact");
  assert.equal(contactErrors.length, 1);
});

test("AC2: a malformed email is refused and names the email field", () => {
  const errors = validateLead(validDraft({ email: "jo@", phone: null }));
  assert.ok(errors.some((error) => error.field === "email"));
});

test("AC2: a valid phone alone (no email) passes", () => {
  assert.deepEqual(validateLead(validDraft({ email: null })), []);
});

test("AC2: a valid email alone (no phone) passes", () => {
  assert.deepEqual(validateLead(validDraft({ phone: null })), []);
});

test("AC2: consent unticked blocks submit and names the consent field", () => {
  const errors = validateLead(
    validDraft({ consent: { given: false, at: "" } }),
  );
  assert.ok(errors.some((error) => error.field === "consent"));
});

test("AC2: firstError returns the first problem in reading order (name before email)", () => {
  const errors = validateLead(
    validDraft({ fullName: "", email: "jo@", phone: null }),
  );
  assert.equal(firstError(errors)?.field, "fullName");
});

test("AC2: firstError returns null when there are no errors", () => {
  assert.equal(firstError([]), null);
});

test("AC2: firstError orders contact above consent", () => {
  const errors = validateLead(
    validDraft({ email: null, phone: null, consent: { given: false, at: "" } }),
  );
  assert.equal(firstError(errors)?.field, "contact");
});

function sampleLead(overrides: Partial<CapturedLead> = {}): CapturedLead {
  return {
    id: "lead_x",
    workspaceId: "ws_arthurite",
    space: "Platform",
    eventName: "Lagos Tech Expo 2026",
    fullName: "Chidi Okeke",
    email: "chidi@example.com",
    phone: "+234 801 234 5678",
    company: "Lagos Analytics",
    jobTitle: "Head of Data",
    notes: "Wants a demo.",
    consent: { given: true, at: "2026-10-31T10:15:00.000Z" },
    capturedAt: "2026-10-31T10:15:00.000Z",
    ...overrides,
  };
}

test("AC4: phone is stored exactly as entered, with no reformatting", () => {
  const draft = validDraft({ phone: "+234 (0) 801 234 5678" });
  assert.deepEqual(validateLead(draft), []);
  // The validator never rewrites the value, so the caller keeps it verbatim.
  assert.equal(draft.phone, "+234 (0) 801 234 5678");
});

test("AC6: leadsToCsv has a header row plus one row per lead", () => {
  const csv = leadsToCsv([sampleLead(), sampleLead({ id: "lead_y" })]);
  const lines = csv.split("\r\n");
  // header + 2 rows
  assert.equal(lines.length, 3);
});

test("AC6: a field with a comma is quoted", () => {
  const row = leadToCsvRow(sampleLead({ notes: "Wants a demo, in November" }));
  assert.ok(row.includes('"Wants a demo, in November"'));
});

test("AC6: a field with a quote escapes the quote by doubling it", () => {
  const row = leadToCsvRow(sampleLead({ notes: 'Said "very clear"' }));
  assert.ok(row.includes('"Said ""very clear"""'));
});

test("AC6: a field with a newline is quoted so the row keeps its columns", () => {
  const row = leadToCsvRow(sampleLead({ notes: "Line one\nLine two" }));
  assert.ok(row.includes('"Line one\nLine two"'));
});

test("AC6: consent appears as a column in the CSV header", () => {
  const header = leadsToCsv([sampleLead()]).split("\r\n")[0].toLowerCase();
  assert.ok(header.includes("consent"));
});

const LEADS: CapturedLead[] = [
  sampleLead({
    id: "a",
    fullName: "Chidi Okeke",
    email: "chidi@example.com",
    company: "Lagos Analytics",
    space: "Platform",
    eventName: "Lagos Tech Expo 2026",
  }),
  sampleLead({
    id: "b",
    fullName: "Ada Nwosu",
    email: "ada@example.com",
    company: "Brightpath Consulting",
    space: "Platform",
    eventName: "Lagos Tech Expo 2026",
  }),
  sampleLead({
    id: "c",
    fullName: "Tunde Balogun",
    email: "tunde@example.com",
    company: "Northwind Media",
    jobTitle: "Marketing Manager",
    space: "Growth",
    eventName: "Abuja Founders Meetup",
  }),
];

test("AC5: search matches on company name", () => {
  assert.deepEqual(
    filterLeads(LEADS, { search: "brightpath" }).map((lead) => lead.id),
    ["b"],
  );
});

test("AC5: search matches on name, email and job title too", () => {
  assert.deepEqual(
    filterLeads(LEADS, { search: "tunde" }).map((lead) => lead.id),
    ["c"],
  );
  assert.deepEqual(
    filterLeads(LEADS, { search: "marketing" }).map((lead) => lead.id),
    ["c"],
  );
  assert.deepEqual(
    filterLeads(LEADS, { search: "chidi@example" }).map((lead) => lead.id),
    ["a"],
  );
});

test("AC5: an event filter and a Space filter combine (narrow together)", () => {
  // Only lead "a" and "b" are in Lagos Tech Expo 2026 AND Platform.
  assert.deepEqual(
    filterLeads(LEADS, {
      event: "Lagos Tech Expo 2026",
      space: "Platform",
    }).map((lead) => lead.id),
    ["a", "b"],
  );
  // Adding a search narrows further to just "b".
  assert.deepEqual(
    filterLeads(LEADS, {
      event: "Lagos Tech Expo 2026",
      space: "Platform",
      search: "brightpath",
    }).map((lead) => lead.id),
    ["b"],
  );
});

test("AC5: an empty filter returns every lead", () => {
  assert.equal(filterLeads(LEADS, {}).length, LEADS.length);
});
