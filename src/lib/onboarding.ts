/**
 * The first-run flow's logic, pure and browser free: the step table that decides
 * what each step says and whether it can be skipped, the slug rules, the row
 * limits, and what counts as a filled row.
 *
 * The step table is the only place a step's copy and order are decided. Nothing
 * here reads a step out of the address without checking it against the table.
 */

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
      "Add the people who will report. Nothing is sent in this build.",
    skippable: true,
    continueLabel: "Go to dashboard",
  },
];

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
