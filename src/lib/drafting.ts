import type { Plan } from "../data/viewer";

/**
 * AI drafting, simulated. The rules are the point: the plan gate and the switch come
 * first, a suggestion never submits, and text somebody typed is never replaced without a
 * yes.
 *
 * No provider, key or prompt lives in this repository; the backend owns all three.
 */

export type DraftingGate = { allowed: boolean; reason: string | null };

export function gate(input: { plan: Plan; aiEnabled: boolean }): DraftingGate {
  const entitled = input.plan === "team" || input.plan === "enterprise";
  if (!entitled) {
    return {
      allowed: false,
      reason:
        "Team includes AI drafting. This Workspace keeps the manual form.",
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

export type Suggestion = {
  accomplishments: string;
  challenges: string;
  plans: string;
};

export type MergeResult = {
  sections: Suggestion;
  /** True when typed text would have been replaced, so the screen must ask first. */
  needsConfirm: boolean;
};

/** A blank section takes the suggestion; a filled one waits for a confirmation. */
export function mergeDraft(
  current: Suggestion,
  suggestion: Suggestion,
): MergeResult {
  const needsConfirm =
    (current.accomplishments.trim() !== "" &&
      suggestion.accomplishments !== "") ||
    (current.challenges.trim() !== "" && suggestion.challenges !== "") ||
    (current.plans.trim() !== "" && suggestion.plans !== "");

  const take = (typed: string, proposed: string) =>
    typed.trim() === "" ? proposed : typed;

  return {
    sections: {
      accomplishments: take(
        current.accomplishments,
        suggestion.accomplishments,
      ),
      challenges: take(current.challenges, suggestion.challenges),
      plans: take(current.plans, suggestion.plans),
    },
    needsConfirm,
  };
}

/** Model output is untrusted: tags are stripped so the form only ever receives text. */
export function sanitizeSuggestion(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** `POST /api/v1/reports/draft-suggestion`, simulated over a fixed shape. */
export async function requestSuggestion(input: {
  periodLabel: string;
  spaceName: string | null;
}): Promise<Suggestion> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const where = input.spaceName ?? "the Workspace";
  return {
    accomplishments: sanitizeSuggestion(
      `Closed the agreed items for ${where} in ${input.periodLabel.toLowerCase()}.`,
    ),
    challenges: sanitizeSuggestion(
      "Two reviews were waiting at once, so decisions took longer than usual.",
    ),
    plans: sanitizeSuggestion(
      "Start the next period with the backlog cleared and the figures ready.",
    ),
  };
}
