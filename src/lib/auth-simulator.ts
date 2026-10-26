/**
 * The demo transport for the auth surface.
 *
 * This phase builds the whole frontend on dummy data with no backend wiring, so
 * every auth flow runs through here and a reviewer can walk sign in, sign up,
 * reset and the code screens with nothing listening on port 5000. `SIMULATED_AUTH`
 * in `src/lib/auth.ts` is the switch: flip it and this file stops being reachable,
 * because the endpoints are called instead.
 *
 * It is not authentication and it must never be mistaken for it: any six digits
 * pass, apart from the one documented demo code that exists so the rejection path
 * can be shown. The wording matches what the API answers, so the screens do not
 * have to change copy when the endpoints arrive.
 */

import {
  type AuthFlow,
  isCompleteCode,
  isFlowExpired,
  resendSecondsLeft,
} from "./otp.ts";

/** Entered in a demo to show the rejection path. Every other code passes. */
export const DEMO_REJECTED_CODE = "111111";

/** Long enough that the pending states are real, short enough to sit through. */
export const SIMULATED_DELAY_MS = 1400;

export const MIN_PASSWORD = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REJECTED_MESSAGE = "That code is incorrect or has expired.";

export type SimulatedResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

type Options = {
  /** Checks pass 0 so they do not wait on the demo's own delay. */
  delayMs?: number;
};

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export async function simulateRequestCode(
  email: string,
  _flow: AuthFlow,
  { delayMs = SIMULATED_DELAY_MS }: Options = {},
): Promise<SimulatedResult<{ requestedAt: number }>> {
  await wait(delayMs);
  if (!EMAIL_PATTERN.test(email.trim())) {
    return { ok: false, message: "Enter a valid email address." };
  }
  return { ok: true, data: { requestedAt: Date.now() } };
}

export async function simulateVerifyCode(
  code: string,
  {
    delayMs = SIMULATED_DELAY_MS,
    requestedAt,
  }: Options & { requestedAt?: number } = {},
): Promise<SimulatedResult> {
  await wait(delayMs);
  if (!isCompleteCode(code)) {
    return { ok: false, message: "Enter the 6-digit code from your email." };
  }
  if (requestedAt !== undefined && isFlowExpired(requestedAt, Date.now())) {
    return { ok: false, message: REJECTED_MESSAGE };
  }
  if (code === DEMO_REJECTED_CODE) {
    return { ok: false, message: REJECTED_MESSAGE };
  }
  return { ok: true, data: undefined };
}

export async function simulateResend(
  requestedAt: number,
  now: number,
  { delayMs = SIMULATED_DELAY_MS }: Options = {},
): Promise<SimulatedResult<{ requestedAt: number }>> {
  await wait(delayMs);
  const secondsLeft = resendSecondsLeft(requestedAt, now);
  if (secondsLeft > 0) {
    return {
      ok: false,
      message: `Please wait ${secondsLeft}s before requesting another code.`,
    };
  }
  return { ok: true, data: { requestedAt: now } };
}

export async function simulateSetPassword(
  password: string,
  { delayMs = SIMULATED_DELAY_MS }: Options = {},
): Promise<SimulatedResult> {
  await wait(delayMs);
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      message: `Passwords are at least ${MIN_PASSWORD} characters.`,
    };
  }
  return { ok: true, data: undefined };
}

/** The password path runs through here too, so no screen dies when the API is down. */
export async function simulateSignIn(
  email: string,
  password: string,
  { delayMs = SIMULATED_DELAY_MS }: Options = {},
): Promise<SimulatedResult<{ greeting: string }>> {
  await wait(delayMs);
  if (!EMAIL_PATTERN.test(email.trim()) || password.length < MIN_PASSWORD) {
    return { ok: false, message: "Those details did not match an account." };
  }
  const name = email.trim().split("@")[0];
  return { ok: true, data: { greeting: `Welcome back, ${name}.` } };
}

export async function simulateSignUp(
  input: { firstName: string; email: string; password: string },
  { delayMs = SIMULATED_DELAY_MS }: Options = {},
): Promise<SimulatedResult<{ requestedAt: number }>> {
  await wait(delayMs);
  if (!input.firstName.trim() || !EMAIL_PATTERN.test(input.email.trim())) {
    return { ok: false, message: "We could not create that account." };
  }
  return { ok: true, data: { requestedAt: Date.now() } };
}

export async function simulateRequestPasswordReset(
  email: string,
  { delayMs = SIMULATED_DELAY_MS }: Options = {},
): Promise<SimulatedResult<{ requestedAt: number }>> {
  await wait(delayMs);
  if (!EMAIL_PATTERN.test(email.trim())) {
    return { ok: false, message: "We could not send the reset code." };
  }
  return { ok: true, data: { requestedAt: Date.now() } };
}
