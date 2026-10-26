/**
 * Auth endpoints of the Reportlee API, behind one switch.
 *
 * This phase builds the whole frontend on dummy data, so `SIMULATED_AUTH` is on
 * and every call below answers from `src/lib/auth-simulator.ts` with nothing
 * listening on port 5000.
 *
 * The live branch is not decoration: both branches of every function answer with
 * the same shape, so wiring the backend is this flag plus the endpoint paths and
 * request bodies already written below. The credential carrying calls read their
 * token from the flow state `src/lib/session.ts` holds, which is where the API's
 * short lived verification token is kept once a code has been requested.
 */

import {
  simulateRequestCode,
  simulateRequestPasswordReset,
  simulateResend,
  simulateSetPassword,
  simulateSignIn,
  simulateSignUp,
  simulateVerifyCode,
} from "./auth-simulator.ts";
import type { AuthFlow } from "./otp.ts";
import { readFlow } from "./session.ts";

/** Flip to false once the endpoints are in scope. Nothing else changes. */
export const SIMULATED_AUTH = true;

/**
 * The base URL is read at build time so a deployed frontend can point at its own
 * environment without a code change.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export type AuthResult =
  | { ok: true; greeting?: string }
  | { ok: false; message: string };

export type AuthActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string };

type ApiEnvelope = {
  message?: string;
  error?: { message?: string };
  data?: { message?: string; user?: { firstName?: string }; authId?: string };
};

const UNREACHABLE =
  "We could not reach the server. Check your connection and try again.";

/**
 * The API answers failures as `{ success: false, error: { message } }`. Session
 * endpoints additionally want the short lived token as a bearer.
 */
async function post<T>(
  path: string,
  body: unknown,
  fallback: string,
  options: { bearer?: string } = {},
): Promise<AuthActionResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.bearer
          ? { Authorization: `Bearer ${options.bearer}` }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope | null;

    if (response.ok) {
      return { ok: true, data: (payload?.data ?? undefined) as T };
    }

    return {
      ok: false,
      message: payload?.error?.message ?? payload?.message ?? fallback,
    };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

/**
 * Requests a code, answering with when it was requested and, once the API is
 * wired, the short lived verification token the session endpoints carry.
 */
export async function requestSignInCode(
  email: string,
): Promise<AuthActionResult<{ requestedAt: number; token?: string }>> {
  if (SIMULATED_AUTH) return simulateRequestCode(email, "login");

  const result = await post<{ authId?: string }>(
    "/auth/login",
    { email, loginType: "otp" },
    "We could not send a code to that address.",
  );
  return result.ok
    ? {
        ok: true,
        data: { requestedAt: Date.now(), token: result.data?.authId },
      }
    : result;
}

/** Checks a code against the flow the tab is holding. */
export async function verifyCode(code: string): Promise<AuthActionResult> {
  if (SIMULATED_AUTH) {
    return simulateVerifyCode(code, { requestedAt: readFlow()?.requestedAt });
  }

  return post<void>(
    "/auth/verify-email",
    { otp: code },
    "That code is incorrect or has expired.",
    {
      bearer: readFlow()?.token,
    },
  );
}

export async function resendCode(
  requestedAt: number,
  now: number,
): Promise<AuthActionResult<{ requestedAt: number }>> {
  if (SIMULATED_AUTH) return simulateResend(requestedAt, now);

  const result = await post<void>(
    "/auth/resend-otp",
    {},
    "We could not resend that code.",
    {
      bearer: readFlow()?.token,
    },
  );
  return result.ok ? { ok: true, data: { requestedAt: now } } : result;
}

export async function setNewPassword(
  password: string,
): Promise<AuthActionResult> {
  if (SIMULATED_AUTH) return simulateSetPassword(password);

  return post<void>(
    "/auth/reset-password",
    { password },
    "We could not set that password.",
    {
      bearer: readFlow()?.token,
    },
  );
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (SIMULATED_AUTH) {
    const result = await simulateSignIn(email, password);
    return result.ok ? { ok: true, greeting: result.data.greeting } : result;
  }

  const result = await post<{ user?: { firstName?: string } }>(
    "/auth/login",
    { email, password, loginType: "password" },
    "Those details did not match an account.",
  );
  if (!result.ok) return result;
  const firstName = result.data?.user?.firstName;
  return {
    ok: true,
    greeting: firstName ? `Welcome back, ${firstName}.` : undefined,
  };
}

export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthResult & { requestedAt?: number }> {
  if (SIMULATED_AUTH) {
    const result = await simulateSignUp(input);
    return result.ok
      ? { ok: true, requestedAt: result.data.requestedAt }
      : result;
  }

  const result = await post<void>(
    "/auth/signup",
    input,
    "We could not create that account.",
  );
  return result.ok ? { ok: true, requestedAt: Date.now() } : result;
}

export async function requestPasswordReset(
  email: string,
): Promise<AuthResult & { requestedAt?: number }> {
  if (SIMULATED_AUTH) {
    const result = await simulateRequestPasswordReset(email);
    return result.ok
      ? { ok: true, requestedAt: result.data.requestedAt }
      : result;
  }

  const result = await post<void>(
    "/auth/forgot-password",
    { email },
    "We could not send the reset code.",
  );
  return result.ok ? { ok: true, requestedAt: Date.now() } : result;
}

/** Provider sign-in leaves the app and returns through the API's callback. */
export function oauthStartUrl(provider: "google" | "facebook") {
  return `${API_BASE}/auth/${provider}/auth`;
}

export type { AuthFlow };
