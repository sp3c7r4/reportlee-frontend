import assert from "node:assert/strict";
import test from "node:test";
import { barWidth, stackedSegments } from "../src/lib/chart-geometry.ts";

/* @info - Chart math is pure so a chart can never disagree with the cards it draws. */

const TRACK = 100;

test("barWidth gives a count over a total as a fraction of the track", () => {
  assert.equal(barWidth(6, 10, TRACK), 60);
});

test("barWidth returns 0 width when the total is 0", () => {
  assert.equal(barWidth(0, 0, TRACK), 0);
  assert.equal(barWidth(3, 0, TRACK), 0);
});

test("barWidth clamps a count at the total to the full track", () => {
  assert.equal(barWidth(10, 10, TRACK), TRACK);
});

test("barWidth clamps a count above the total to the track, never over", () => {
  assert.equal(barWidth(14, 10, TRACK), TRACK);
});

test("stackedSegments lays on time, late and missing across the track", () => {
  const segments = stackedSegments({ onTime: 18, late: 3, missing: 6 }, TRACK);
  assert.equal(segments.length, 3);
  assert.deepEqual(
    segments.map((segment) => segment.state),
    ["onTime", "late", "missing"],
  );
  assert.deepEqual(
    segments.map((segment) => segment.count),
    [18, 3, 6],
  );
});

test("stackedSegments offsets follow each width in order", () => {
  const segments = stackedSegments({ onTime: 18, late: 3, missing: 6 }, TRACK);
  assert.equal(segments[0].offset, 0);
  assert.equal(segments[1].offset, segments[0].width);
  assert.equal(segments[2].offset, segments[0].width + segments[1].width);
});

test("stackedSegments widths sum to the track and never overflow", () => {
  const segments = stackedSegments({ onTime: 18, late: 3, missing: 6 }, TRACK);
  const total = segments.reduce((sum, segment) => sum + segment.width, 0);
  assert.equal(total, TRACK);
  const last = segments[segments.length - 1];
  assert.ok(last.offset + last.width <= TRACK);
});

test("stackedSegments returns an empty layout when the total is 0", () => {
  assert.deepEqual(
    stackedSegments({ onTime: 0, late: 0, missing: 0 }, TRACK),
    [],
  );
});
