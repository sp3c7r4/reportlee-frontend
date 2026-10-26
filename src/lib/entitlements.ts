import { STARTER_VISIBLE_DAYS } from "../data/reports.ts";
import type { Plan } from "../data/viewer.ts";

/**
 * What a plan may use, in one place.
 *
 * A screen asks this module; it never compares plan strings itself. Gating here is
 * presentation: the server must enforce the same matrix, and a disabled control is a
 * courtesy, not a permission.
 *
 * The trial is gated as Team, so a 30 day trial can actually test what it is selling.
 */

export type Feature =
  | "trends"
  | "spaceComparison"
  | "kpiCards"
  | "assistant"
  | "aiDrafting"
  | "locationTagging"
  | "auditExport"
  | "reportsExport";

type Gated = "starter" | "team" | "enterprise";

export type Entitlement =
  | { allowed: true }
  | { allowed: false; reason: string; unlockPlan: Gated };

const MINIMUM: Record<Feature, Gated> = {
  trends: "team",
  spaceComparison: "team",
  kpiCards: "team",
  assistant: "team",
  aiDrafting: "team",
  locationTagging: "team",
  auditExport: "enterprise",
  reportsExport: "starter",
};

const RANK: Record<Gated, number> = { starter: 0, team: 1, enterprise: 2 };

function effective(plan: Plan | "trial"): Gated {
  if (plan === "trial") return "team";
  if (plan === "enterprise") return "enterprise";
  return plan;
}

const PLAN_NAME: Record<Gated, string> = {
  starter: "Starter",
  team: "Team",
  enterprise: "Enterprise",
};

export function entitlement(
  plan: Plan | "trial",
  feature: Feature,
): Entitlement {
  const needed = MINIMUM[feature];
  if (RANK[effective(plan)] >= RANK[needed]) return { allowed: true };
  return {
    allowed: false,
    reason: `${PLAN_NAME[needed]} includes this.`,
    unlockPlan: needed,
  };
}

/** One rule for the retention window, so four screens cannot disagree about it. */
export function visibleTo<T extends { submittedAt: string }>(
  rows: T[],
  plan: Plan,
  now: string,
): T[] {
  if (plan !== "starter") return rows;
  const floor = Date.parse(now) - STARTER_VISIBLE_DAYS * 86_400_000;
  return rows.filter((row) => Date.parse(row.submittedAt) >= floor);
}
