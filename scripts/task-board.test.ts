import assert from "node:assert/strict";
import test from "node:test";
import { emptyBoard, startsDrag } from "../src/lib/tasks.ts";

/* @info - Browser bugs on the task board (review-browser-fixes):
   - a press on "Move to ..." or "Show report" started a drag, so the click never fired;
   - an Admin's empty board said nothing about how a task is made, or where their own
     tasks as Staff are. */

test("a mouse press on a card's button or link does not start a drag", () => {
  assert.equal(
    startsDrag({ canMove: true, pointerType: "mouse", onControl: true }),
    false,
  );
  assert.equal(
    startsDrag({ canMove: true, pointerType: "pen", onControl: true }),
    false,
  );
});

test("a mouse press on the card body still starts a drag for the assignee", () => {
  assert.equal(
    startsDrag({ canMove: true, pointerType: "mouse", onControl: false }),
    true,
  );
});

test("touch and a card the viewer cannot move never start a drag", () => {
  assert.equal(
    startsDrag({ canMove: true, pointerType: "touch", onControl: false }),
    false,
  );
  assert.equal(
    startsDrag({ canMove: false, pointerType: "mouse", onControl: false }),
    false,
  );
});

test("an Admin's empty Assigned by me board says how to assign and links to Review", () => {
  const empty = emptyBoard({
    view: "by",
    overdueOnly: false,
    role: "admin",
    assignableIn: [],
  });
  assert.equal(empty.message, "You have not assigned any tasks.");
  assert.ok(empty.hint, "an assigner needs to be told how");
  assert.match(empty.hint.text, /open a report/i);
  assert.match(empty.hint.text, /follow-up/i);
  assert.equal(empty.hint.href, "/dashboard/review");
});

test("a Head's empty Assigned by me board gets the same hint", () => {
  const empty = emptyBoard({
    view: "by",
    overdueOnly: false,
    role: "head",
    assignableIn: [],
  });
  assert.equal(empty.hint?.href, "/dashboard/review");
});

test("Staff on an empty Assigned to me board get no assign hint", () => {
  const empty = emptyBoard({
    view: "mine",
    overdueOnly: false,
    role: "staff",
    assignableIn: [],
  });
  assert.equal(empty.message, "Nothing is assigned to you.");
  assert.equal(empty.hint, null);
  assert.equal(empty.elsewhere, null);
});

test("an Admin who is Staff in another Workspace is told where their tasks are", () => {
  const empty = emptyBoard({
    view: "by",
    overdueOnly: false,
    role: "admin",
    assignableIn: ["Live Check"],
  });
  assert.ok(empty.elsewhere, "the board must say where their own tasks are");
  assert.match(empty.elsewhere, /Admin/);
  assert.match(empty.elsewhere, /Live Check/);
});

test("an Admin with no other Workspace gets no elsewhere line", () => {
  const empty = emptyBoard({
    view: "all",
    overdueOnly: false,
    role: "admin",
    assignableIn: [],
  });
  assert.equal(empty.elsewhere, null);
});

test("the overdue filter keeps its own message and no hint", () => {
  const empty = emptyBoard({
    view: "by",
    overdueOnly: true,
    role: "admin",
    assignableIn: ["Live Check"],
  });
  assert.equal(empty.message, "Nothing is overdue.");
  assert.equal(empty.hint, null);
});

test("no board copy contains an em or en dash", () => {
  const all = [
    emptyBoard({
      view: "by",
      overdueOnly: false,
      role: "admin",
      assignableIn: ["Live Check"],
    }),
    emptyBoard({
      view: "all",
      overdueOnly: false,
      role: "admin",
      assignableIn: ["A", "B"],
    }),
    emptyBoard({
      view: "mine",
      overdueOnly: false,
      role: "staff",
      assignableIn: [],
    }),
  ];
  for (const empty of all) {
    const text = [
      empty.message,
      empty.hint?.text,
      empty.hint?.label,
      empty.elsewhere,
    ].join(" ");
    assert.doesNotMatch(text, /[\u2013\u2014]/);
  }
});
