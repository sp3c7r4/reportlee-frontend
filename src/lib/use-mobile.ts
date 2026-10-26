"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the reader is on a phone sized screen: 768, which is where this layout stops
 * being two columns.
 *
 * Asked through useSyncExternalStore rather than an effect that sets state, so the
 * media query subscription is torn down properly and there is no render in between two
 * answers. The server cannot know a viewport, so the first answer is desktop and the
 * browser corrects it on hydration. That is why nothing here depends on the answer for
 * its content: a phone is given a sheet instead of a column, and the column is what the
 * first paint already draws.
 *
 * This is the question hive asks before it decides how to render navigation, copied
 * deliberately rather than reinvented, breakpoint included.
 */
const MOBILE_BREAKPOINT = 768;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
