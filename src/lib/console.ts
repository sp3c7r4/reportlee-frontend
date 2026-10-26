import { isReservedSlug, slugify } from "./onboarding.ts";

/**
 * The Super Admin console, extracted from the signed-in app on purpose: a platform
 * operator is never a Member of a Workspace (ADR 0004), so this module imports nothing
 * from the dashboard and the console lives outside `/dashboard`.
 *
 * Marked for extraction to `console.reportlee.app`; the operator identity below is a
 * constant on purpose and has no path into a Workspace.
 */

export const OPERATOR = {
  name: "Platform Support",
  note: "A platform operator is not a Member of any Workspace and never appears in a Workspace role picker.",
} as const;

export type PlatformAction = "open" | "suspend" | "restore" | "rename" | "plan";

/** Written before the content is shown, never after. */
export function auditLine(
  action: PlatformAction,
  workspaceName: string,
): string {
  switch (action) {
    case "open":
      return `Opened ${workspaceName} content`;
    case "suspend":
      return `Suspended ${workspaceName}`;
    case "restore":
      return `Restored ${workspaceName}`;
    case "rename":
      return `Renamed ${workspaceName}'s address`;
    case "plan":
      return `Changed the plan on ${workspaceName}`;
  }
}

export function renameProblem(next: string): string | null {
  const trimmed = next.trim();
  if (trimmed === "") return "Give the Workspace an address.";
  const slug = slugify(trimmed);
  if (slug.length < 3) return "An address needs at least three characters.";
  if (isReservedSlug(slug)) return "That address is reserved.";
  return null;
}

export type PlanState = "active" | "past_due" | "cancelled" | "trial";

export const PLAN_LABEL: Record<PlanState, string> = {
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  trial: "Trial",
};

/** The console displays what the API returns. It never computes a price or a proration. */
export function planDisplay(plan: string, state: PlanState): string {
  return `${plan} · ${PLAN_LABEL[state]}`;
}
