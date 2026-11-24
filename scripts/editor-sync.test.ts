import assert from "node:assert/strict";
import test from "node:test";
import { editorSync } from "../src/lib/editor-sync.ts";

/* @info - Bug: typing into a report section lost every space. The editor's own HTML came
   back as `value` and was set again, and ProseMirror drops a paragraph's trailing space
   on parse. These tests replay the order the component runs: emit, then the value
   comes back from the parent. */

test("the editor's own keystroke coming back as value does not replace the content", () => {
  const sync = editorSync("");
  sync.emitted("<p>Browser </p>");
  assert.equal(sync.shouldReplace("<p>Browser </p>"), false);
});

test("typing a sentence word by word never asks for a replace", () => {
  const sync = editorSync("");
  const replaced: string[] = [];
  for (const html of [
    "<p>B</p>",
    "<p>Browser</p>",
    "<p>Browser </p>",
    "<p>Browser c</p>",
    "<p>Browser check </p>",
  ]) {
    sync.emitted(html);
    if (sync.shouldReplace(html)) replaced.push(html);
  }
  assert.deepEqual(replaced, []);
});

test("a draft loaded from the server still replaces the content once", () => {
  const sync = editorSync("");
  assert.equal(sync.shouldReplace("<p>Saved draft text</p>"), true);
  assert.equal(sync.shouldReplace("<p>Saved draft text</p>"), false);
});

test("an outside value after typing replaces it, then typing goes on undisturbed", () => {
  const sync = editorSync("<p>Old</p>");
  sync.emitted("<p>Old </p>");
  assert.equal(sync.shouldReplace("<p>Old </p>"), false);
  assert.equal(sync.shouldReplace("<p>Suggested text</p>"), true);
  sync.emitted("<p>Suggested text </p>");
  assert.equal(sync.shouldReplace("<p>Suggested text </p>"), false);
});
