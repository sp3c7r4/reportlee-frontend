/**
 * Where the auth flows keep state between screens.
 *
 * Two things live here. The flow in progress: which flow it is, the address the
 * code went to, when it was requested, and the token the API would issue for it
 * once the endpoints are wired. And the session a verified flow establishes.
 *
 * Session scoped on purpose. The flow belongs to one tab, a reload in the middle
 * of it must not strand anyone, and none of it belongs in a URL. Every read is
 * guarded so a server component can import this module without touching window.
 */

import type { AuthFlow } from "./otp.ts";

export type FlowState = {
  flow: AuthFlow;
  email: string;
  requestedAt: number;
  /** Set by the live branch of `src/lib/auth.ts` when the API issues one. */
  token?: string;
};

export type AuthSession = {
  email: string;
  establishedAt: number;
};

const FLOW_KEY = "iroyin.auth.flow";
const SESSION_KEY = "iroyin.auth.session";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* A full or blocked storage is not worth failing a flow over. */
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* see above */
  }
}

export function readFlow(): FlowState | null {
  return read<FlowState>(FLOW_KEY);
}

export function writeFlow(state: FlowState): void {
  write(FLOW_KEY, state);
}

export function clearFlow(): void {
  remove(FLOW_KEY);
}

export function readSession(): AuthSession | null {
  return read<AuthSession>(SESSION_KEY);
}

export function writeSession(email: string): AuthSession {
  const session: AuthSession = { email, establishedAt: Date.now() };
  write(SESSION_KEY, session);
  return session;
}

export function clearSession(): void {
  remove(SESSION_KEY);
}
