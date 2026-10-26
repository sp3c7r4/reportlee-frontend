import assert from "node:assert/strict";
import { test } from "node:test";
import { labelForPath, navFor, type Role } from "../src/lib/nav.ts";

/* @info - The sidebar and the phone tabs are different lists, and the doc says so in
   a table. Reading the values back from the module would pass whatever it returned,
   so every expectation below is written out. */

const ROLES: Role[] = ["staff", "head", "admin"];

test("the admin sidebar never offers My reports", () => {
  const labels = navFor("admin")
    .groups.flatMap((group) => group.items.map((item) => item.label))
    .filter((label) => label === "My reports");
  assert.deepEqual(labels, []);
});

test("every role gets Tasks", () => {
  for (const role of ROLES) {
    const labels = navFor(role).groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    assert.ok(labels.includes("Tasks"), `${role} has no Tasks`);
  }
});

test("each role's sidebar is exactly its own list, in order", () => {
  assert.deepEqual(
    navFor("staff").groups.map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ]),
    [
      ["Work", ["Home", "My reports", "Tasks"]],
      ["Insight", ["My record"]],
    ],
  );
  assert.deepEqual(
    navFor("head").groups.map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ]),
    [
      ["Work", ["Home", "My reports", "Tasks"]],
      ["Review", ["Review"]],
      ["People", ["My Space"]],
      ["Insight", ["Space analytics"]],
    ],
  );
  assert.deepEqual(
    navFor("admin").groups.map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ]),
    [
      ["Work", ["Overview", "Tasks"]],
      ["Review", ["Review"]],
      ["People", ["Spaces", "Members"]],
      ["Insight", ["Analytics", "Assistant"]],
      ["Manage", ["Settings"]],
    ],
  );
});

test("group labels come only from the five the design allows", () => {
  const allowed = ["Work", "Review", "People", "Insight", "Manage"];
  for (const role of ROLES) {
    for (const group of navFor(role).groups) {
      assert.ok(
        allowed.includes(group.label),
        `${role} invented the group ${group.label}`,
      );
    }
  }
});

test("phone tabs are their own list of five, not a smaller sidebar", () => {
  assert.deepEqual(
    navFor("staff").tabs.map((tab) => tab.label),
    ["Home", "Reports", "Tasks", "Search", "Menu"],
  );
  assert.deepEqual(
    navFor("head").tabs.map((tab) => tab.label),
    ["Home", "Review", "Reports", "Search", "Menu"],
  );
  assert.deepEqual(
    navFor("admin").tabs.map((tab) => tab.label),
    ["Home", "Review", "Spaces", "Assistant", "Menu"],
  );

  for (const role of ROLES) {
    const nav = navFor(role);
    const navLabels = nav.groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    assert.equal(nav.tabs.length, 5);
    assert.notDeepEqual(
      nav.tabs.map((tab) => tab.label),
      navLabels,
      `${role} tabs look like the sidebar`,
    );
  }
});

test("submit report is an action, so it is never a nav item or a tab", () => {
  for (const role of ROLES) {
    const nav = navFor(role);
    const labels = [
      ...nav.groups.flatMap((group) => group.items.map((item) => item.label)),
      ...nav.tabs.map((tab) => tab.label),
    ];
    assert.equal(labels.includes("Submit report"), false);
  }
});

/* @info - The tab bar greys a tab on the same flag the rail greys a row, so the flag
   has to be on the tab too. Without it the phone offered Assistant on a plan with AI
   off, and the tap went nowhere useful. */
test("the Menu tab opens the drawer and Assistant keeps the AI gate", () => {
  for (const role of ROLES) {
    const tabs = navFor(role).tabs;
    const menu = tabs.filter((tab) => tab.opens === "drawer");
    assert.equal(menu.length, 1, `${role} has ${menu.length} drawer tabs`);
    assert.equal(menu[0].label, "Menu");
    assert.equal(menu[0].href, undefined, "the Menu tab navigates nowhere");
  }

  assert.equal(
    navFor("admin").tabs.find((tab) => tab.label === "Assistant")?.disabledBy,
    "ai",
  );
});

/* @info - The form is not a nav destination, but the breadcrumb still has to name it
   instead of repeating "Dashboard / Dashboard". */
test("the submit form has a breadcrumb label of its own", () => {
  assert.equal(
    labelForPath("staff", "/dashboard/reports/new"),
    "Submit report",
  );
  assert.equal(
    labelForPath("admin", "/dashboard/reports/new"),
    "Submit report",
  );
  assert.equal(labelForPath("staff", "/dashboard/nowhere"), null);

  // A Report page is not a rail destination either, and must not read "Dashboard".
  assert.equal(labelForPath("staff", "/dashboard/reports/rpt_1"), "Report");
});
