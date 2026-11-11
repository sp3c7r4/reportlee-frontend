/**
 * Pure helpers for reading the backend's auth responses. No React, no fetch.
 *
 * Two error shapes exist: thrown app errors answer `error: { message }`, and body
 * validation answers `error: { "<field path>": "<message>" }` with no `message`.
 */

import type { Role } from "./nav.ts";

export type ExtractedError = {
  message: string;
  fieldErrors: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Unwraps the `{ success, data }` envelope, or undefined when there is no data. */
export function unwrapEnvelope<T>(payload: unknown): T | undefined {
  if (!isRecord(payload)) return undefined;
  return (payload.data ?? undefined) as T | undefined;
}

export function extractError(
  payload: unknown,
  fallback: string,
): ExtractedError {
  if (!isRecord(payload)) return { message: fallback, fieldErrors: {} };
  const error = payload.error;

  if (typeof error === "string" && error) {
    return { message: error, fieldErrors: {} };
  }
  if (!isRecord(error)) {
    const top = payload.message;
    return {
      message: typeof top === "string" && top ? top : fallback,
      fieldErrors: {},
    };
  }
  if (typeof error.message === "string" && error.message) {
    return { message: error.message, fieldErrors: {} };
  }

  /* @info - The password refine has an empty path, so its key is "". */
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(error)) {
    if (typeof value !== "string") continue;
    fieldErrors[key === "" ? "password" : key] = value;
  }
  const first = Object.values(fieldErrors)[0];
  return { message: first ?? fallback, fieldErrors };
}

/**
 * @info - Backend roles are `admin | member`. `admin` wins, `member` is staff, and
 * `head` has no backend peer yet, so it is never produced here.
 */
export function toFrontendRole(roles: readonly string[] | undefined): Role {
  return roles?.includes("admin") ? "admin" : "staff";
}

/** The backend answers an expired or invalid access token with 401. */
export function isAccessExpired(status: number): boolean {
  return status === 401;
}
