/**
 * The first-run flow's logic, pure and browser free: the step table that decides
 * what each step says and whether it can be skipped, the slug rules, the row
 * limits, and what counts as a filled row.
 *
 * The step table is the only place a step's copy and order are decided. Nothing
 * here reads a step out of the address without checking it against the table.
 */

import type { ApiResult } from "./api.ts";
import { CODE_EMAIL_NOT_VERIFIED, type SlugAvailability } from "./api-types.ts";
import type { Role } from "./nav.ts";

export const SPACE_LIMIT = 4;
export const INVITE_LIMIT = 5;
/** The address a workspace lives at: <slug>.reportlee.app */
export const SLUG_DOMAIN = "reportlee.app";
/** Held back, because the product itself answers there. */
export const RESERVED_SLUGS: readonly string[] = [
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "smtp",
  "ns",
  "cdn",
  "docs",
  "help",
  "support",
  "status",
  "billing",
  "account",
  "dashboard",
  "login",
  "signup",
];
const SLUG_MAX = 32;

/** The two roles a first invitation can carry. */
export type InviteRole = "staff" | "admin";

export type OnboardingStepId = "workspace" | "spaces" | "team";

export type OnboardingStep = {
  id: OnboardingStepId;
  index: number;
  /** Short name for the indicator. */
  label: string;
  heading: string;
  supporting: string;
  /** A step the product can survive without. */
  skippable: boolean;
  continueLabel: string;
};

export const STEPS: readonly OnboardingStep[] = [
  {
    id: "workspace",
    index: 0,
    label: "Workspace",
    heading: "Set up your workspace",
    supporting: "This is where your team's reports will live.",
    skippable: false,
    continueLabel: "Continue",
  },
  {
    id: "spaces",
    index: 1,
    label: "Spaces",
    heading: "Add your first Space",
    supporting:
      "Spaces are the units that report each period. You can add more later.",
    skippable: true,
    continueLabel: "Continue",
  },
  {
    id: "team",
    index: 2,
    label: "Team",
    heading: "Invite your team",
    supporting:
      "Add the people who will report. Each gets an email, and you can copy their link.",
    skippable: true,
    continueLabel: "Go to dashboard",
  },
];

/** Workspace setup is an admin act. Everyone else is sent to the dashboard. */
export function canEnterOnboarding(role: Role | undefined): boolean {
  return role === "admin";
}

/** Resolves the query parameter, falling back to the first step. */
export function stepFromParam(
  value: string | null | undefined,
): OnboardingStep {
  if (!value) return STEPS[0];
  return STEPS.find((step) => step.id === value) ?? STEPS[0];
}

export function nextStep(current: OnboardingStep): OnboardingStep | null {
  return STEPS[current.index + 1] ?? null;
}

export function previousStep(current: OnboardingStep): OnboardingStep | null {
  return current.index > 0 ? STEPS[current.index - 1] : null;
}

/**
 * Lower case letters, digits and single hyphens, capped so the address stays
 * readable. Capitals are lowered rather than dropped, so "Reportlee HQ" survives as
 * a readable address.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A slug the product cannot hand out, because it already means something. */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.trim().toLowerCase());
}

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Trims each row and drops the blanks: an untouched field is not a mistake. */
export function cleanRows(rows: readonly string[]): string[] {
  return rows.map((row) => row.trim()).filter((row) => row.length > 0);
}

/** Indexes of rows the user filled in badly. Empty rows are not failures. */
export function invalidInviteIndexes(
  rows: readonly { email: string }[],
): number[] {
  return rows.reduce<number[]>((indexes, row, index) => {
    const email = row.email.trim();
    if (email.length > 0 && !isEmail(email)) indexes.push(index);
    return indexes;
  }, []);
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN = 3;

export const SLUG_FORMAT_MESSAGE =
  "Use 3 to 32 lowercase letters, digits or hyphens.";
export const SLUG_TAKEN_MESSAGE = "That address is already taken.";
export const SLUG_RESERVED_MESSAGE = "Reserved.";
export const VERIFY_EMAIL_MESSAGE = "Verify your email to continue.";

/** What the Workspace URL field says about the address typed so far. */
export type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; message: string };

/**
 * The checks that need no server: format and the reserved list. Null means the
 * address is worth asking the server about.
 */
export function slugLocalProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return SLUG_FORMAT_MESSAGE;
  }
  if (!SLUG_PATTERN.test(slug)) return SLUG_FORMAT_MESSAGE;
  if (isReservedSlug(slug)) return SLUG_RESERVED_MESSAGE;
  return null;
}

/** Turns the slug-available answer into the status the field shows. */
export function slugStatusFrom(
  result: ApiResult<SlugAvailability>,
): SlugStatus {
  // A failed check is not a verdict: the submit still gets the server's say.
  if (!result.ok) return { state: "idle" };
  if (result.data.available) return { state: "available" };
  if (result.data.reason === "taken") {
    return { state: "unavailable", message: SLUG_TAKEN_MESSAGE };
  }
  if (result.data.reason === "reserved") {
    return { state: "unavailable", message: SLUG_RESERVED_MESSAGE };
  }
  return { state: "unavailable", message: SLUG_FORMAT_MESSAGE };
}

export type WorkspaceFormErrors = {
  name?: string;
  slug?: string;
  timeZone?: string;
  /** A message for above the buttons, when no field owns the failure. */
  form?: string;
  /** True when the person must verify their email first. */
  verifyEmail?: boolean;
};

/** Where each failure of `POST /workspaces` is shown. */
export function workspaceFailure(failure: {
  status: number;
  message: string;
  code?: string;
  fields?: Record<string, string>;
}): WorkspaceFormErrors {
  if (failure.status === 400 && failure.fields) {
    const { name, slug, timeZone } = failure.fields;
    if (name || slug || timeZone) {
      return {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(timeZone ? { timeZone } : {}),
      };
    }
  }
  if (failure.status === 409) return { slug: failure.message };
  if (failure.status === 403 && failure.code === CODE_EMAIL_NOT_VERIFIED) {
    return { form: VERIFY_EMAIL_MESSAGE, verifyEmail: true };
  }
  return { form: failure.message };
}

/** Where a failed `POST /invitations` is shown: on rows when the server names one. */
export function inviteFailure(
  failure: { status: number; message: string; fields?: Record<string, string> },
  /** The row index each sent invitation came from, in the order sent. */
  sent: readonly number[],
): { rows: Record<number, string>; form?: string } {
  const rows: Record<number, string> = {};
  if (failure.status === 400 && failure.fields) {
    for (const [key, message] of Object.entries(failure.fields)) {
      const match = /^invitations\.(\d+)\./.exec(key);
      const row = match ? sent[Number(match[1])] : undefined;
      if (row !== undefined && rows[row] === undefined) rows[row] = message;
    }
    if (Object.keys(rows).length > 0) return { rows };
  }
  if (failure.status === 409 && sent.length === 1) {
    return { rows: { [sent[0]]: failure.message } };
  }
  return { rows, form: failure.message };
}

/** Where a failed `POST /workspaces/:id/spaces` is shown: on its row. */
export function spaceFailureMessage(failure: {
  message: string;
  fields?: Record<string, string>;
}): string {
  return failure.fields?.name ?? failure.message;
}
