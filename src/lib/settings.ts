import type { Plan } from "../data/viewer";

/**
 * Workspace settings, with no React: one banner at a time, a schedule that always names
 * its timezone, and an AI switch that has no Save step.
 *
 * Money is never computed here. A plan's price and dates come from the API; this module
 * only decides what to say and in what order.
 */

export type Cadence =
  | "daily"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly";

export type Schedule = {
  cadence: Cadence;
  /** Weekly and fortnightly only. */
  weekday: string;
  /** Always required. */
  time: string;
  timeZone: string;
  /** Monthly and quarterly only. */
  dayOfMonth: number | null;
  lastDay: boolean;
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  fortnightly: "Every two weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export function scheduleProblem(schedule: Schedule): string | null {
  if (schedule.timeZone.trim() === "") return "Choose the Workspace timezone.";
  if (schedule.time.trim() === "") return "Choose the time a period closes.";
  if (
    (schedule.cadence === "weekly" || schedule.cadence === "fortnightly") &&
    schedule.weekday.trim() === ""
  ) {
    return "Choose the day of the week a period starts.";
  }
  if (
    (schedule.cadence === "monthly" || schedule.cadence === "quarterly") &&
    schedule.dayOfMonth === null &&
    !schedule.lastDay
  ) {
    return "Choose a day of the month, or the last day.";
  }
  return null;
}

/** Stated as a date, because "next period" is not something a person can hold. */
export function scheduleSummary(
  schedule: Schedule,
  nextPeriod: string,
): string {
  const when =
    schedule.cadence === "monthly" || schedule.cadence === "quarterly"
      ? schedule.lastDay
        ? "the last day of the month"
        : `day ${schedule.dayOfMonth}`
      : schedule.cadence === "daily"
        ? "every day"
        : `${schedule.weekday}s`;

  return `${CADENCE_LABEL[schedule.cadence]}, starting ${when} at ${schedule.time} (${schedule.timeZone}). Takes effect from ${nextPeriod}.`;
}

export type BannerKind = "readOnly" | "pastDue" | "grace" | "trial";

/** The most urgent first. One banner shows, never two. */
export const BANNER_ORDER: BannerKind[] = [
  "readOnly",
  "pastDue",
  "grace",
  "trial",
];

export type Banner = { kind: BannerKind; title: string; body: string };

export function activeBanner(
  input: {
    readOnly: boolean;
    pastDue: boolean;
    grace: boolean;
    trialDays: number | null;
  },
  _now: string,
): Banner | null {
  if (input.readOnly) {
    return {
      kind: "readOnly",
      title: "This Workspace is read-only",
      body: "Everything stays readable. No Report can be submitted and no decision recorded until the plan is settled.",
    };
  }
  if (input.pastDue) {
    return {
      kind: "pastDue",
      title: "The plan is past due",
      body: "Reports still work while the grace period runs. An Admin can settle the plan in Settings.",
    };
  }
  if (input.grace) {
    return {
      kind: "grace",
      title: "The grace period is running",
      body: "The Workspace keeps working until the grace period ends. An Admin can settle the plan in Settings.",
    };
  }
  if (input.trialDays !== null && input.trialDays >= 0) {
    return {
      kind: "trial",
      title: `${input.trialDays} days left in the trial`,
      body: "After that the Workspace drops to Starter: the current period plus the late list.",
    };
  }
  return null;
}

export type AiSwitchState = { allowed: boolean; reason: string | null };

/** Instant apply, gated on the plan first and the switch second. */
export function aiSwitch(input: {
  plan: Plan;
  aiEnabled: boolean;
}): AiSwitchState {
  const minPlan: Plan = "team";
  const entitled = input.plan === "team" || input.plan === "enterprise";
  if (!entitled) {
    return {
      allowed: false,
      reason: `${minPlan === "team" ? "Team" : minPlan} includes the Assistant and AI drafting.`,
    };
  }
  if (!input.aiEnabled) {
    return {
      allowed: false,
      reason: "AI features are switched off for this Workspace.",
    };
  }
  return { allowed: true, reason: null };
}
