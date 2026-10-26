import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_NOTIFICATIONS } from "../src/data/notifications.ts";
import {
  badgeLabel,
  FIXED_CATEGORIES,
  unreadCount,
} from "../src/lib/notifications.ts";

/* @info - The badge is the only place a count reaches a person, so its two rules are
   pinned: nothing shows at zero, and no badge grows past two digits. */

test("the badge is silent when nothing is unread", () => {
  assert.equal(badgeLabel(0), null);
  assert.equal(badgeLabel(-3), null);
});

test("the badge shows a number, and stops at 99 plus", () => {
  assert.equal(badgeLabel(1), "1");
  assert.equal(badgeLabel(42), "42");
  assert.equal(badgeLabel(99), "99");
  assert.equal(badgeLabel(100), "99+");
});

test("the count is the unread number, not the total", () => {
  const items = [
    ...SAMPLE_NOTIFICATIONS,
    { ...SAMPLE_NOTIFICATIONS[0], id: "extra", read: false },
  ];
  assert.equal(unreadCount(SAMPLE_NOTIFICATIONS), 3);
  assert.equal(unreadCount(items), 4);
  assert.equal(unreadCount([]), 0);
});

test("invitation and security mail cannot be switched off", () => {
  assert.deepEqual(FIXED_CATEGORIES, ["invitations", "security"]);
});
