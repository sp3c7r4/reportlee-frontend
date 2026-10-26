"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useShell } from "@/components/dashboard/shell-context";
import { CO_LEAGUE_ROSTER } from "@/data/members";
import { SAMPLE_PERIOD, SAMPLE_REPORTS } from "@/data/reports";
import {
  type Answer,
  answerFor,
  assistantGate,
  SUGGESTIONS,
} from "@/lib/assistant";
import { cn } from "@/lib/utils";

/**
 * The Assistant, docked. Two entry points exist and they never open each other: the rail
 * item opens this panel, and the phone tab opens the page. Answers come from the same
 * module analytics uses, and are rendered as text, never as HTML.
 */
export function AssistantScreen() {
  const { membership, workspace } = useShell();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<Array<{ q: string; answer: Answer }>>([]);
  const [error, setError] = useState<string | null>(null);

  const viewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const [transcriptFor, setTranscriptFor] = useState(membership.id);

  const gate = assistantGate({
    plan: workspace.plan,
    aiEnabled: workspace.aiFeatures,
  });

  const ask = (text: string) => {
    // Switching Workspace clears the transcript through the key below.
    const key = viewer.membershipId;
    if (key !== transcriptFor) {
      setTranscriptFor(key);
      setAsked([]);
      setQuestion("");
    }

    const trimmed = text.trim();
    if (trimmed === "") return;
    try {
      const answer = answerFor({
        viewer,
        reports: SAMPLE_REPORTS,
        roster: CO_LEAGUE_ROSTER,
        period: SAMPLE_PERIOD,
        question: trimmed,
      });
      setAsked((current) => [{ q: trimmed, answer }, ...current].slice(0, 6));
      setQuestion("");
      setError(null);
    } catch {
      setError("That could not be answered. Try again.");
    }
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-bold text-[24px] text-ink tracking-[-0.03em]">
            <HugeiconsIcon icon={SparklesIcon} className="size-5 text-ink/60" />
            Assistant
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            Answers from {SAMPLE_PERIOD.label}, counted the same way Analytics
            counts.
          </p>
        </div>
        {gate.allowed ? null : (
          <p className="max-w-[280px] text-right text-[12px] text-ink/55">
            {gate.reason}{" "}
            <Link href="/dashboard/settings" className="underline">
              Open Settings
            </Link>
          </p>
        )}
      </header>

      <div className="mt-4 max-w-[720px]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={!gate.allowed}
            placeholder="Ask about on-time, late, missing or decisions"
            aria-label="Ask the Assistant"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-hairline bg-surface px-3 text-[13.5px] text-ink outline-none focus-visible:border-ink/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!gate.allowed || question.trim() === ""}
            className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface disabled:opacity-40"
          >
            Ask
          </button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((line) => (
            <button
              key={line}
              type="button"
              disabled={!gate.allowed}
              onClick={() => ask(line)}
              className={cn(
                "min-h-9 rounded-md border border-hairline px-2.5 text-[12px] text-ink/70 hover:bg-surface-muted",
                !gate.allowed && "opacity-40",
              )}
            >
              {line}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-3 text-[12.5px] text-destructive">{error}</p>
        ) : null}

        {asked.length === 0 ? (
          <p className="mt-4 rounded-lg border border-hairline border-dashed px-4 py-6 text-center text-[13px] text-ink/60">
            Nothing asked yet. A question about a draft is answered by saying
            drafts are not readable.
          </p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-2 p-0">
            {asked.map((entry, index) => (
              <li
                key={`${entry.q}-${index}`}
                className="rounded-lg border border-hairline p-3.5"
              >
                <p className="text-[12px] text-ink/50">{entry.q}</p>
                <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink/85 leading-[1.65]">
                  {entry.answer.text}
                </p>
                <p className="mt-2 text-[11.5px] text-ink/45">
                  {entry.answer.sources}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
