/**
 * Code entry logic, pure and browser free: what a box is allowed to accept, where
 * focus goes next, what a paste fills, how long until a resend is allowed, and
 * which flow a URL parameter selects.
 *
 * The flow table is the only place a destination is decided. Nothing here reads a
 * destination out of the URL, so the verification screen cannot be turned into an
 * open redirect.
 */

export const CODE_LENGTH = 6;
export const RESEND_SECONDS = 60;
/** A requested code's flow state is good for this long before it is called expired. */
export const FLOW_TTL_MINUTES = 30;

export type AuthFlow = "signup" | "reset" | "login";

export type FlowConfig = {
  id: AuthFlow;
  heading: string;
  /** Split around the address the code went to, which renders in ink between them. */
  subtextLead: string;
  subtextTrail: string;
  /** Where a verified code sends the user. Never taken from the address bar. */
  destination: string;
  /** A reset proves the address, it does not sign anyone in. */
  establishesSession: boolean;
};

const SUBTEXT_LEAD = "We sent a 6-digit code to ";
// No medium is named: this build simulates the transport, and copy that sends
// someone to their inbox is a claim it cannot keep.
const SUBTEXT_TRAIL = ".";

export const FLOWS: Record<AuthFlow, FlowConfig> = {
  signup: {
    id: "signup",
    heading: "Verify your email",
    subtextLead: SUBTEXT_LEAD,
    subtextTrail: SUBTEXT_TRAIL,
    // A new account has no workspace yet, so verification hands off to setup.
    destination: "/onboarding",
    establishesSession: true,
  },
  reset: {
    id: "reset",
    heading: "Enter reset code",
    subtextLead: SUBTEXT_LEAD,
    subtextTrail: SUBTEXT_TRAIL,
    destination: "/reset-password",
    establishesSession: false,
  },
  login: {
    id: "login",
    heading: "Enter sign-in code",
    subtextLead: SUBTEXT_LEAD,
    subtextTrail: SUBTEXT_TRAIL,
    destination: "/dashboard",
    establishesSession: true,
  },
};

/** Resolves the query parameter, or null when it is missing or outside the set. */
export function flowConfig(
  value: string | null | undefined,
): FlowConfig | null {
  if (!value) return null;
  return (FLOWS as Record<string, FlowConfig | undefined>)[value] ?? null;
}

/** One box holds one digit, and nothing else. */
export function normaliseDigit(input: string): string | null {
  return /^\d$/.test(input) ? input : null;
}

/** Reads a code out of pasted text, ignoring whatever decoration came with it. */
export function parsePastedCode(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === CODE_LENGTH ? digits : null;
}

/** Typing in a box moves to the next one, and the last box holds focus. */
export function nextFocusAfterInput(index: number): number {
  return Math.min(index + 1, CODE_LENGTH - 1);
}

/** Backspace clears a filled box in place, and steps back out of an empty one. */
export function prevFocusAfterBackspace(
  index: number,
  hasValue: boolean,
): number {
  return hasValue ? index : Math.max(index - 1, 0);
}

export function isCompleteCode(value: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value);
}

/** Seconds left on the resend cooldown, counting down and never negative. */
export function resendSecondsLeft(requestedAt: number, now: number): number {
  const elapsed = Math.floor((now - requestedAt) / 1000);
  return Math.max(0, RESEND_SECONDS - elapsed);
}

export function isFlowExpired(requestedAt: number, now: number): boolean {
  return now - requestedAt > FLOW_TTL_MINUTES * 60_000;
}
