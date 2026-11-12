/**
 * Auth endpoints of the Reportlee API, behind one switch.
 *
 * `SIMULATED_AUTH` is off: every call below goes to the backend mounted at
 * `NEXT_PUBLIC_API_URL`. Flip it back on to answer from `src/lib/auth-simulator.ts`
 * with nothing listening on port 5000. Both branches of every function answer with
 * the same shape.
 *
 * Two kinds of bearer exist. The short lived verification token (signup, code
 * sign-in, reset) lives in the flow state `src/lib/session.ts` holds, because a
 * flow must survive a reload. The access and refresh tokens of a signed-in person
 * live in memory only, in `src/lib/tokens.ts`.
 */

import {
  extractError,
  isAccessExpired,
  toFrontendRole,
  unwrapEnvelope,
} from "./auth-contract.ts";
import {
  simulateMe,
  simulateRequestCode,
  simulateRequestPasswordReset,
  simulateResend,
  simulateSetPassword,
  simulateSignIn,
  simulateSignUp,
  simulateVerifyCode,
} from "./auth-simulator.ts";
import type { Role } from "./nav.ts";
import type { AuthFlow } from "./otp.ts";
import { readFlow, writeFlow } from "./session.ts";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasTokens,
  setTokens,
} from "./tokens.ts";

/* @info - The local backend is in scope, so the live branch is on. Set to true to
   run the screens with no backend; nothing else changes. */
export const SIMULATED_AUTH = false;

/**
 * The base URL is read at build time so a deployed frontend can point at its own
 * environment without a code change.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export type FieldErrors = Record<string, string>;

type Failure = { ok: false; message: string; fieldErrors?: FieldErrors };

export type AuthResult = { ok: true; greeting?: string; role?: Role } | Failure;

export type AuthActionResult<T = void> = { ok: true; data: T } | Failure;

export type CurrentIdentity = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/** The user record the backend returns on login, verify and /auth/me. */
type ApiUser = {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
};

type TokenPair = { accessToken?: string; refreshToken?: string };

const UNREACHABLE =
  "We could not reach the server. Check your connection and try again.";

type Call<T> =
  | { ok: true; data: T; status: number }
  | (Failure & { status: number });

/**
 * One request against the API. Success unwraps `{ success, data }`; failure reads
 * either `error.message` or the validation field map.
 */
async function request<T>(
  method: "GET" | "POST",
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
    return {
      ok: false,
      message,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      status: response.status,
    };
  } catch {
    return { ok: false, message: UNREACHABLE, status: 0 };
  }
}

/** Drops the transport status, so callers keep the documented result shape. */
function settle<T>(call: Call<T>): AuthActionResult<T> {
  if (call.ok) return { ok: true, data: call.data };
  const { status: _status, ...failure } = call;
  return failure;
}

let refreshing: Promise<boolean> | null = null;

/**
 * Rotates the token pair. The backend rotates on every call, so parallel callers
 * share one in-flight request rather than racing two rotations.
 */
export function refreshSession(): Promise<boolean> {
  if (SIMULATED_AUTH) return Promise.resolve(true);
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return false;
    }
    const call = await request<TokenPair>(
      "POST",
      "/auth/refresh",
      { refreshToken },
      "Your session has ended. Sign in again.",
    );
    if (call.ok && call.data?.accessToken && call.data.refreshToken) {
      setTokens({
        accessToken: call.data.accessToken,
        refreshToken: call.data.refreshToken,
      });
      return true;
    }
    // A network failure keeps the pair: the server never said it was dead.
    if (call.status !== 0) clearTokens();
    return false;
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

/**
 * A call carrying the access token. A 401 means it expired, so the pair is
 * refreshed once and the call retried once.
 */
async function authed<T>(
  method: "GET" | "POST",
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

function storePair(pair: TokenPair | undefined): void {
  if (pair?.accessToken && pair.refreshToken) {
    setTokens({
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
    });
  }
}

/**
 * Requests a code, answering with when it was requested and the short lived
 * verification token the code screen carries.
 */
export async function requestSignInCode(
  email: string,
): Promise<AuthActionResult<{ requestedAt: number; token?: string }>> {
  if (SIMULATED_AUTH) return simulateRequestCode(email, "login");

  const result = settle(
    await request<{ token?: string }>(
      "POST",
      "/auth/login",
      { email, loginType: "otp" },
      "We could not send a code to that address.",
    ),
  );
  if (!result.ok) return result;
  return {
    ok: true,
    data: { requestedAt: Date.now(), token: result.data?.token },
  };
}

/**
 * Checks a code against the flow the tab is holding. Signup and code sign-in
 * answer with a session; a reset answers with the token the next step carries.
 */
export async function verifyCode(
  code: string,
): Promise<AuthActionResult<{ role?: Role }>> {
  if (SIMULATED_AUTH) {
    const result = await simulateVerifyCode(code, {
      requestedAt: readFlow()?.requestedAt,
    });
    return result.ok ? { ok: true, data: {} } : result;
  }

  const flow = readFlow();
  const result = settle(
    await request<TokenPair & { user?: ApiUser }>(
      "POST",
      "/auth/verify-email",
      { otp: code },
      "That code is incorrect or has expired.",
      flow?.token,
    ),
  );
  if (!result.ok) return result;

  if (flow?.flow === "reset") {
    // reset-password wants the NEW token issued here, not the one that asked.
    if (result.data?.accessToken) {
      writeFlow({ ...flow, token: result.data.accessToken });
    }
    return { ok: true, data: {} };
  }

  storePair(result.data);
  return {
    ok: true,
    data: { role: toFrontendRole(result.data?.user?.roles) },
  };
}

export async function resendCode(
  requestedAt: number,
  now: number,
): Promise<AuthActionResult<{ requestedAt: number; token?: string }>> {
  if (SIMULATED_AUTH) return simulateResend(requestedAt, now);

  const result = settle(
    await request<{ token?: string }>(
      "POST",
      "/auth/resend-otp",
      {},
      "We could not resend that code.",
      readFlow()?.token,
    ),
  );
  // The backend replaces the verification token on every resend.
  return result.ok
    ? { ok: true, data: { requestedAt: now, token: result.data?.token } }
    : result;
}

export async function setNewPassword(
  password: string,
): Promise<AuthActionResult> {
  if (SIMULATED_AUTH) return simulateSetPassword(password);

  const result = settle(
    await request<unknown>(
      "POST",
      "/auth/reset-password",
      { password },
      "We could not set that password.",
      readFlow()?.token,
    ),
  );
  if (!result.ok) return result;
  // A reset ends every session on the server, so the local pair is dead too.
  clearTokens();
  return { ok: true, data: undefined };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (SIMULATED_AUTH) {
    const result = await simulateSignIn(email, password);
    return result.ok ? { ok: true, greeting: result.data.greeting } : result;
  }

  const result = settle(
    await request<TokenPair & { user?: ApiUser }>(
      "POST",
      "/auth/login",
      { email, password, loginType: "password" },
      "Those details did not match an account.",
    ),
  );
  if (!result.ok) return result;
  storePair(result.data);
  const firstName = result.data?.user?.firstName;
  return {
    ok: true,
    greeting: firstName ? `Welcome back, ${firstName}.` : undefined,
    role: toFrontendRole(result.data?.user?.roles),
  };
}

export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthResult & { requestedAt?: number; token?: string }> {
  if (SIMULATED_AUTH) {
    const result = await simulateSignUp(input);
    return result.ok
      ? { ok: true, requestedAt: result.data.requestedAt }
      : result;
  }

  /* @info - The backend requires a role. Signup leads to creating a Workspace,
     which is an admin act; members arrive by invitation. */
  const result = settle(
    await request<{ token?: string }>(
      "POST",
      "/auth/signup",
      { ...input, role: "admin" },
      "We could not create that account.",
    ),
  );
  return result.ok
    ? { ok: true, requestedAt: Date.now(), token: result.data?.token }
    : result;
}

export async function requestPasswordReset(
  email: string,
): Promise<AuthResult & { requestedAt?: number; token?: string }> {
  if (SIMULATED_AUTH) {
    const result = await simulateRequestPasswordReset(email);
    return result.ok
      ? { ok: true, requestedAt: result.data.requestedAt }
      : result;
  }

  // The verification token is named `accessToken` on this one endpoint.
  const result = settle(
    await request<{ accessToken?: string }>(
      "POST",
      "/auth/forgot-password",
      { email },
      "We could not send the reset code.",
    ),
  );
  return result.ok
    ? { ok: true, requestedAt: Date.now(), token: result.data?.accessToken }
    : result;
}

/** Ends the session on the server when possible, and always forgets it locally. */
export async function signOut(): Promise<void> {
  if (!SIMULATED_AUTH) {
    if (getRefreshToken()) {
      // Best effort: a failed logout must not keep anyone signed in here.
      await authed<unknown>(
        "POST",
        "/auth/logout",
        () => ({ refreshToken: getRefreshToken() }),
        "We could not sign you out.",
      );
    }
  }
  clearTokens();
}

/** The signed-in person, from /auth/me. Fails when there is no live session. */
export async function fetchMe(
  fallbackEmail = "",
): Promise<AuthActionResult<CurrentIdentity>> {
  if (SIMULATED_AUTH) return simulateMe(fallbackEmail);

  if (!hasTokens()) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }
  // /auth/me nests the user one level deeper: `data.data`.
  const result = settle(
    await authed<{ data?: ApiUser }>(
      "GET",
      "/auth/me",
      undefined,
      "We could not load your account.",
    ),
  );
  if (!result.ok) return result;
  const user = result.data?.data;
  const name = [user?.firstName, user?.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  return {
    ok: true,
    data: {
      id: user?.id === undefined ? "" : String(user.id),
      email: user?.email ?? "",
      name,
      role: toFrontendRole(user?.roles),
    },
  };
}

/** True while the live branch holds a token pair. Always true when simulated. */
export function hasLiveSession(): boolean {
  return SIMULATED_AUTH || hasTokens();
}

/** Provider sign-in leaves the app and returns through the API's callback. */
export function oauthStartUrl(provider: "google" | "facebook") {
  return `${API_BASE}/auth/${provider}/auth`;
}

export type { AuthFlow };
