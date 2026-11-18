import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CODE_ADMIN_CANNOT_AUTHOR,
  CODE_ALREADY_SUBMITTED,
  CODE_EDIT_WINDOW_CLOSED,
  CODE_NO_SPACE,
  CODE_PERIOD_CLOSED,
  CODE_REPORT_APPROVED,
  CODE_REPORT_SEEN,
  CODE_WORKSPACE_READ_ONLY,
} from "../src/lib/api-types.ts";
import {
  groupFieldErrors,
  reportErrorMessage,
  submitBlock,
} from "../src/lib/report-errors.ts";

/* @info - Messages are keyed on the server's `code`, never on its text. */
test("a known code gets the product's sentence, not the server's", () => {
  const text = reportErrorMessage({
    code: CODE_EDIT_WINDOW_CLOSED,
    message: "server words",
  });
  assert.match(text, /edit window/i);
  assert.notEqual(text, "server words");
});

test("an unknown or missing code falls back to the server message", () => {
  assert.equal(
    reportErrorMessage({ code: "SOMETHING_NEW", message: "Try later." }),
    "Try later.",
  );
  assert.equal(reportErrorMessage({ message: "Plain." }), "Plain.");
});

test("every report code has its own sentence and none uses a dash", () => {
  const codes = [
    CODE_ADMIN_CANNOT_AUTHOR,
    CODE_ALREADY_SUBMITTED,
    CODE_EDIT_WINDOW_CLOSED,
    CODE_NO_SPACE,
    CODE_PERIOD_CLOSED,
    CODE_REPORT_APPROVED,
    CODE_REPORT_SEEN,
    CODE_WORKSPACE_READ_ONLY,
  ];
  const seen = new Set<string>();
  for (const code of codes) {
    const text = reportErrorMessage({ code, message: "fallback" });
    assert.notEqual(text, "fallback", code);
    assert.equal(/[\u2014\u2013]/.test(text), false, code);
    seen.add(text);
  }
  assert.equal(seen.size, codes.length);
});

test("field keys group by their first dotted segment", () => {
  const grouped = groupFieldErrors({
    accomplishments: "Write at least 50 characters.",
    "kpis.2.value": "Enter a number.",
    "kpis.0.name": "Name the row.",
    kpis: "Too many rows.",
    "taggedMembershipIds.1": "Not a colleague.",
    "attachments.0.size": "Too large.",
    "location.latitude": "Out of range.",
  });
  assert.equal(
    grouped.sections.accomplishments,
    "Write at least 50 characters.",
  );
  assert.equal(grouped.kpiRows[2], "Enter a number.");
  assert.equal(grouped.kpiRows[0], "Name the row.");
  assert.equal(grouped.kpis, "Too many rows.");
  assert.equal(grouped.sections.colleagues, "Not a colleague.");
  assert.equal(grouped.sections.attachments, "Too large.");
  assert.equal(grouped.sections.location, "Out of range.");
  assert.deepEqual(grouped.other, []);
});

test("a key the form has no field for is kept as a general message", () => {
  const grouped = groupFieldErrors({
    authorMembershipId: "This field is not accepted.",
  });
  assert.deepEqual(grouped.other, ["This field is not accepted."]);
  assert.equal(groupFieldErrors(undefined).other.length, 0);
});

test("submitBlock: an Admin never gets the editor", () => {
  const block = submitBlock({
    role: "admin",
    readOnly: false,
    hasSpace: false,
  });
  assert.equal(block?.kind, "admin");
});

test("submitBlock: read-only beats a missing Space, a Space is needed otherwise", () => {
  assert.equal(
    submitBlock({ role: "staff", readOnly: true, hasSpace: false })?.kind,
    "readOnly",
  );
  assert.equal(
    submitBlock({ role: "head", readOnly: false, hasSpace: false })?.kind,
    "noSpace",
  );
  assert.equal(
    submitBlock({ role: "staff", readOnly: false, hasSpace: true }),
    null,
  );
});
