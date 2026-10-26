"use client";

import {
  CheckmarkCircle02Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/dashboard/shell-context";
import { SAMPLE_NOW } from "@/data/reports";
import { ROLE_LABEL } from "@/data/viewer";
import { type AuditEntry, readAudit, recordAudit } from "@/lib/audit";
import { entitlement } from "@/lib/entitlements";
import {
  activeBanner,
  aiSwitch,
  CADENCE_LABEL,
  type Cadence,
  type Schedule,
  scheduleProblem,
  scheduleSummary,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Settings is an Admin surface. A Head reaching it is told why they cannot use it. */
export function SettingsScreen() {
  const { membership, workspace, user } = useShell();
  const isAdmin = membership.role === "admin";
  const [notice, setNotice] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<Schedule>({
    cadence: "weekly",
    weekday: "Monday",
    time: "17:00",
    timeZone: workspace.timeZone,
    dayOfMonth: null,
    lastDay: false,
  });

  const [aiEnabled, setAiEnabled] = useState(false);
  const [confirmAi, setConfirmAi] = useState(false);
  const ai = aiSwitch({ plan: workspace.plan, aiEnabled: true });
  const auditExport = entitlement(workspace.plan, "auditExport");

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  useEffect(() => {
    setEntries(readAudit(window.localStorage, membership.id));
  }, [membership.id]);

  const banner = useMemo(
    () =>
      activeBanner(
        {
          readOnly: workspace.readOnly,
          pastDue: false,
          grace: false,
          trialDays: workspace.plan === "starter" ? null : 12,
        },
        SAMPLE_NOW,
      ),
    [workspace.readOnly, workspace.plan],
  );

  const write = (
    action: Parameters<typeof recordAudit>[2]["action"],
    summary: string,
  ) => {
    recordAudit(window.localStorage, membership.id, {
      at: new Date().toISOString(),
      actorMembershipId: membership.id,
      action,
      target: workspace.name,
      summary,
    });
    setEntries(readAudit(window.localStorage, membership.id));
  };

  if (!isAdmin) {
    return (
      <div className="w-full px-4 py-6 sm:px-6">
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          Settings
        </h1>
        <p className="mt-2 text-[13px] text-ink/60">
          Workspace settings belong to an Admin. Ask {user.name.split(" ")[0]}'s
          Workspace Admin if something needs changing.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Settings
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            {workspace.name} · {workspace.plan} plan · your role is{" "}
            {ROLE_LABEL[membership.role]}
          </p>
        </div>
        <Link
          href="/dashboard/settings/audit"
          className="inline-flex min-h-11 items-center rounded-md border border-hairline px-3 text-[12.5px] text-ink/70 hover:bg-surface-muted sm:min-h-9"
        >
          Audit log
        </Link>
      </header>

      {banner ? (
        <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
          <p className="font-medium text-[13px] text-ink">{banner.title}</p>
          <p className="mt-0.5 text-[12.5px] text-ink/70">{banner.body}</p>
        </div>
      ) : null}

      {notice ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </p>
      ) : null}

      <section className="mt-6 max-w-[720px]">
        <h2 className="font-medium text-[14px] text-ink">Reporting schedule</h2>
        <p className="mt-1 text-[12.5px] text-ink/60">
          A change takes effect from the next Reporting period, never
          mid-period.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-[12px] text-ink/60">
            Cadence
            <select
              value={schedule.cadence}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  cadence: event.target.value as Cadence,
                }))
              }
              className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            >
              {(Object.keys(CADENCE_LABEL) as Cadence[]).map((cadence) => (
                <option key={cadence} value={cadence}>
                  {CADENCE_LABEL[cadence]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[12px] text-ink/60">
            Timezone
            <input
              value={schedule.timeZone}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  timeZone: event.target.value,
                }))
              }
              className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
          </label>

          {(schedule.cadence === "weekly" ||
            schedule.cadence === "fortnightly") && (
            <label className="block text-[12px] text-ink/60">
              Day of the week
              <input
                value={schedule.weekday}
                onChange={(event) =>
                  setSchedule((current) => ({
                    ...current,
                    weekday: event.target.value,
                  }))
                }
                className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
              />
            </label>
          )}

          {(schedule.cadence === "monthly" ||
            schedule.cadence === "quarterly") && (
            <label className="block text-[12px] text-ink/60">
              Day of the month
              <input
                inputMode="numeric"
                value={
                  schedule.lastDay ? "last" : String(schedule.dayOfMonth ?? "")
                }
                onChange={(event) => {
                  const raw = event.target.value.trim().toLowerCase();
                  setSchedule((current) =>
                    raw === "last"
                      ? { ...current, lastDay: true, dayOfMonth: null }
                      : {
                          ...current,
                          lastDay: false,
                          dayOfMonth: Number(raw) || null,
                        },
                  );
                }}
                className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
              />
            </label>
          )}

          <label className="block text-[12px] text-ink/60">
            Time a period closes
            <input
              type="time"
              value={schedule.time}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
              className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
          </label>
        </div>

        <p className="mt-2 text-[12px] text-ink/55">
          {scheduleSummary(schedule, "the period starting Mon 2 Nov 2026")}
        </p>

        <button
          type="button"
          onClick={() => {
            const problem = scheduleProblem(schedule);
            if (problem) {
              setNotice(problem);
              return;
            }
            write("schedule.change", scheduleSummary(schedule, "next period"));
            setNotice("Saved. It takes effect from the next Reporting period.");
          }}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md bg-ink px-3 text-[12.5px] text-surface"
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
          Save schedule
        </button>
      </section>

      <section className="mt-8 max-w-[720px]">
        <h2 className="font-medium text-[14px] text-ink">AI features</h2>
        <p className="mt-1 text-[12.5px] text-ink/60">
          Controls the Assistant and AI drafting together. It applies at once,
          with no Save step.
        </p>
        {ai.allowed ? null : (
          <p className="mt-1 text-[12px] text-ink/50">{ai.reason}</p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={aiEnabled}
            aria-label="AI features"
            disabled={!ai.allowed}
            onClick={() => {
              if (!aiEnabled) {
                setConfirmAi(true);
                return;
              }
              setAiEnabled(false);
              write("ai.toggle", "AI switched off");
              setNotice(
                "AI features are off. The Assistant is greyed out for everyone.",
              );
            }}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              aiEnabled ? "bg-ink" : "bg-ink/15",
              !ai.allowed && "opacity-40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-surface transition-transform",
                aiEnabled ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
          <p className="text-[12.5px] text-ink/70">
            {aiEnabled ? "On" : "Off"}
            {ai.allowed ? "" : " · not available on this plan"}
          </p>
        </div>

        {confirmAi ? (
          <div className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2.5">
            <p className="text-[12.5px] text-ink">
              Turning AI on sends Report text to the AI provider for anyone in
              this Workspace. Continue?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmAi(false)}
                className="min-h-9 rounded-md border border-hairline px-3 text-[12px] text-ink/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiEnabled(true);
                  setConfirmAi(false);
                  write("ai.toggle", "AI switched on");
                  setNotice("AI features are on.");
                }}
                className="min-h-9 rounded-md bg-ink px-3 text-[12px] text-surface"
              >
                Turn on
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8 max-w-[720px]">
        <h2 className="font-medium text-[14px] text-ink">Data and audit</h2>
        <p className="mt-1 text-[12.5px] text-ink/60">
          Exports are logged. Assistant conversations are never exported.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["reportsExport", "auditExport"] as const).map((feature) => {
            const gate = entitlement(workspace.plan, feature);
            return (
              <button
                key={feature}
                type="button"
                disabled={!gate.allowed}
                title={gate.allowed ? undefined : gate.reason}
                onClick={() => {
                  write(
                    "export",
                    feature === "auditExport" ? "Audit file" : "Reports export",
                  );
                  setNotice(
                    feature === "auditExport"
                      ? "The audit file is exported as CSV and JSON. Metadata only, no data sent."
                      : "Reports exported as CSV and JSON. Metadata only, no data sent.",
                  );
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-hairline px-3 text-[12.5px] text-ink/70 disabled:opacity-40"
              >
                <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
                {feature === "auditExport"
                  ? `Audit file${auditExport.allowed ? "" : " · Enterprise"}`
                  : "Export reports"}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11.5px] text-ink/45">
          {entries.length} audit {entries.length === 1 ? "entry" : "entries"} on
          this device.
        </p>
      </section>
    </div>
  );
}

/** The audit log: append-only, no edit and no delete in the UI. */
export function AuditScreen() {
  const { membership, workspace } = useShell();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(readAudit(window.localStorage, membership.id));
  }, [membership.id]);

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header>
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          Audit log
        </h1>
        <p className="mt-1 text-[13px] text-ink/60">
          {workspace.name} · append-only. Nothing here can be edited or deleted.
        </p>
      </header>

      <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
        <div className="hidden bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide sm:grid sm:grid-cols-[180px_minmax(0,1fr)_200px] sm:gap-3">
          <span>When</span>
          <span>What</span>
          <span>Action</span>
        </div>
        {entries.length === 0 ? (
          <p className="px-3.5 py-8 text-center text-[13px] text-ink/60">
            Nothing recorded yet. Submitting, deciding and changing settings
            write here.
          </p>
        ) : (
          entries
            .slice()
            .reverse()
            .map((entry) => (
              <div
                key={`${entry.at}-${entry.action}`}
                className="border-hairline border-t px-3.5 py-2.5 text-[12.5px] sm:grid sm:grid-cols-[180px_minmax(0,1fr)_200px] sm:gap-3"
              >
                <span className="text-ink/55 tabular-nums">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: workspace.timeZone,
                  }).format(new Date(entry.at))}
                </span>
                <span className="text-ink">{entry.summary}</span>
                <span className="text-ink/50">{entry.action}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
