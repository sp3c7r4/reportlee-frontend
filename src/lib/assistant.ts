import type { RosterMember } from "../data/members";
import type { Plan } from "../data/viewer";
import type { Report, ReportingPeriod } from "../data/reports";
import { analyticsFor, type AnalyticsViewer } from "./analytics.ts";
import { aiSwitch } from "./settings.ts";

/**
 * The Assistant, simulated: it answers only from the analytics module, so a figure here
 * and a figure on the Analytics screen are the same figure. A draft is never read, and a
 * question outside the reporting world is declined rather than invented.
 *
 * Keys, prompts and guardrails belong in the backend; nothing here calls a provider.
 */

export type AssistantState = { allowed: boolean; reason: string | null };

export function assistantGate(input: {
  plan: Plan;
  aiEnabled: boolean;
}): AssistantState {
  return aiSwitch(input);
}

export const SUGGESTIONS = [
  "How is our on-time rate?",
  "Who has not submitted?",
  "How long do decisions take?",
  "Which KPIs are being filled in?",
];

export type Answer = {
  text: string;
  /** Sources are structured, so the screen renders them as filters, not ids. */
  sources: string;
};

export function answerFor(input: {
  viewer: AnalyticsViewer;
  reports: Report[];
  roster: RosterMember[];
  period: ReportingPeriod;
  question: string;
}): Answer {
  const view = analyticsFor({
    viewer: input.viewer,
    // A draft is not readable by the Assistant, so it is dropped before anything counts.
    reports: input.reports.filter(
      (report) => report.submissionStatus !== "draft",
    ),
    roster: input.roster,
    period: input.period,
  });

  const checked = `Checked ${view.coverage.submitted} Reports across the Workspace for ${input.period.label}.`;
  const question = input.question.toLowerCase();
  const owner = input.viewer.role === "staff" ? "your" : "the";

  const draftAsked = /draft/.test(question);

  if (draftAsked) {
    return {
      text: `Drafts are not readable here, so I cannot answer from one. ${checked}`,
      sources: input.period.label,
    };
  }

  if (/on.?time|submitted|submission/.test(question)) {
    const card = view.cards.find((row) => row.key === "onTime");
    return {
      text: `For ${owner} on-time rate this period: ${card?.value}. ${card?.detail}. ${checked}`,
      sources: input.period.label,
    };
  }

  if (/late|missing|not submitted|has not/.test(question)) {
    const late = view.cards.find((row) => row.key === "late");
    const missing = view.cards.find((row) => row.key === "missing");
    const names = view.groups.map(
      (group) => `${group.state}: ${group.people.join(", ")}`,
    );
    return {
      text: `${late?.value} late and ${missing?.value} missing of ${view.coverage.expected} expected. ${names.join("; ")}. ${checked}`,
      sources: input.period.label,
    };
  }

  if (/decision|approve|approval|reject/.test(question)) {
    const card = view.cards.find((row) => row.key === "decision");
    return {
      text: `The average time to a decision is ${card?.value}, measured from submission to the first decision. ${checked}`,
      sources: input.period.label,
    };
  }

  if (/kpi|figure|metric/.test(question)) {
    const rows = view.kpis
      .map((kpi) => `${kpi.name}: ${kpi.included} of ${kpi.total} Reports`)
      .join("; ");
    return {
      text:
        rows === ""
          ? `No KPI figures this period. ${checked}`
          : `${rows}. ${checked}`,
      sources: input.period.label,
    };
  }

  return {
    text: `I can only answer questions about Reports in this Workspace: on-time, late, missing, decisions and KPI coverage. ${checked}`,
    sources: input.period.label,
  };
}
