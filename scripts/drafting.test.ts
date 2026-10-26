import assert from "node:assert/strict";
import test from "node:test";
import { gate, mergeDraft, sanitizeSuggestion } from "../src/lib/drafting.ts";

/* @info - Drafting never submits, never overwrites typed text without a yes, and treats
   model output as untrusted text. */

test("a Starter Workspace cannot draft, and is told why", () => {
  const blocked = gate({ plan: "starter", aiEnabled: true });
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason ?? "", /Team/);
});

test("the switch off also blocks drafting", () => {
  const blocked = gate({ plan: "team", aiEnabled: false });
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason ?? "", /switched off/i);
});

test("Team with the switch on may draft", () => {
  assert.equal(gate({ plan: "team", aiEnabled: true }).allowed, true);
});

test("a suggestion replaces an empty section without asking", () => {
  const merged = mergeDraft(
    { accomplishments: "", challenges: "", plans: "" },
    { accomplishments: "Ran the pilot.", challenges: "", plans: "" },
  );
  assert.equal(merged.needsConfirm, false);
  assert.equal(merged.sections.accomplishments, "Ran the pilot.");
});

test("a suggestion never overwrites typed text without a yes", () => {
  const merged = mergeDraft(
    { accomplishments: "I typed this.", challenges: "", plans: "" },
    { accomplishments: "Model text.", challenges: "", plans: "" },
  );
  assert.equal(merged.needsConfirm, true);
  assert.equal(merged.sections.accomplishments, "I typed this.");
});

test("model output is text, never markup", () => {
  assert.equal(sanitizeSuggestion("<p>Hello</p><script>x</script>"), "Hello x");
});
