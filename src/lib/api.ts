/**
 * The one place a request leaves the app.
 *
 * `request` and `authed` are the calls `auth.ts` always made, moved here so the
 * Workspace, Space, member and invitation modules share them. Nothing about how
 * they answer changed. The base URL comes from `NEXT_PUBLIC_API_URL` only.
 */

import { refreshSession, SIMULATED_AUTH } from "./auth.ts";
import {
  extractError,
  isAccessExpired,
  unwrapEnvelope,
} from "./auth-contract.ts";
import { clearTokens, getAccessToken } from "./tokens.ts";

/**
 * The base URL is read at build time so a deployed frontend can point at its own
 * environment without a code change.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export type FieldErrors = Record<string, string>;

export type Failure = {
  ok: false;
  message: string;
  fieldErrors?: FieldErrors;
  /** The machine readable `error.code`, when the server sent one. */
  code?: string;
};

export const UNREACHABLE =
  "We could not reach the server. Check your connection and try again.";

export type Call<T> =
  | { ok: true; data: T; status: number }
  | (Failure & { status: number });

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function errorCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code ? code : undefined;
}

/**
 * One request against the API. Success unwraps `{ success, data }`; failure reads
 * either `error.message` or the validation field map.
 */
export async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  fallback: string,
  bearer?: string | null,
): Promise<Call<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (response.ok) {
      return {
        ok: true,
        data: unwrapEnvelope<T>(payload) as T,
        status: response.status,
      };
    }

    const { message, fieldErrors } = extractError(payload, fallback);
    const code = errorCode(payload);
    return {
      ok: false,
      message,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      ...(code ? { code } : {}),
      status: response.status,
    };
  } catch {
    return { ok: false, message: UNREACHABLE, status: 0 };
  }
}

/**
 * A call carrying the access token. A 401 means it expired, so the pair is
 * refreshed once and the call retried once.
 */
export async function authed<T>(
  method: Method,
  path: string,
  body: unknown | (() => unknown),
  fallback: string,
): Promise<Call<T>> {
  /* @info - a body function is read per attempt, so a retry sees rotated tokens. */
  const read = () => (typeof body === "function" ? body() : body);
  const first = await request<T>(
    method,
    path,
    read(),
    fallback,
    getAccessToken(),
  );
  if (first.ok || !isAccessExpired(first.status)) return first;

  const renewed = await refreshSession();
  if (!renewed) return first;

  const second = await request<T>(
    method,
    path,
    read(),
    fallback,
    getAccessToken(),
  );
  if (!second.ok && isAccessExpired(second.status)) clearTokens();
  return second;
}

/** What the screens read: the status is always there, and `fields` only on a 400. */
export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      status: number;
      message: string;
      code?: string;
      fields?: FieldErrors;
    };

/**
 * The shape every Workspace module answers with. `fields` is filled for a 400 only,
 * so a 409 or 422 reads as one message the screen shows where the person can act.
 */
export async function apiCall<T>(
  method: Method,
  path: string,
  body: unknown,
  fallback: string,
): Promise<ApiResult<T>> {
  /* @info - Simulated auth has no backend behind it, so these calls answer with the
     same failure shape rather than reaching for a server that is not there. */
  if (SIMULATED_AUTH) {
    return {
      ok: false,
      status: 0,
      message: "Workspaces need the live API. Turn off SIMULATED_AUTH.",
    };
  }
  const call = await authed<T>(method, path, body, fallback);
  if (call.ok) return { ok: true, data: call.data, status: call.status };
  return {
    ok: false,
    status: call.status,
    message: call.message,
    ...(call.code ? { code: call.code } : {}),
    ...(call.status === 400 && call.fieldErrors
      ? { fields: call.fieldErrors }
      : {}),
  };
}
