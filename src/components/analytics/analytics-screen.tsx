"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/dashboard/shell-context";
import { CO_LEAGUE_ROSTER } from "@/data/members";
import { SAMPLE_PERIOD, SAMPLE_REPORTS } from "@/data/reports";
import { analyticsFor } from "@/lib/analytics";
import { savedReports } from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * Analytics for one period and one scope. Every figure names what it counted, a small
 * sample says so, and the table view is a first-class way to read the same numbers.
 */
export function AnalyticsScreen({ scope }: { scope: "workspace" | "me" }) {
  const { membership, workspace, user } = useShell();
  const [showTable, setShowTable] = useState(false);

  const viewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<typeof SAMPLE_REPORTS | null>(null);

  useEffect(() => {
    // The device-local overlay is read after mount, never during a prerender.
    const saved = savedReports(window.localStorage, membership.id);
    setReports(SAMPLE_REPORTS.map((report) => saved[report.id] ?? report));
    setMounted(true);
  }, [membership.id]);

  const view = useMemo(
    () =>
      analyticsFor({
        viewer,
        reports: reports ?? [],
        roster: CO_LEAGUE_ROSTER,
        period: SAMPLE_PERIOD,
        spaceFilter: null,
      }),
    [viewer, reports],
  );

  const isMe = view.scope === "me";
  const heading = isMe ? "My record" : "Analytics";

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            {heading}
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            {SAMPLE_PERIOD.label} ·{" "}
            {view.scope === "workspace"
              ? "the whole Workspace"
              : view.scope === "space"
                ? `the ${view.spaceFilter} Space`
                : user.name}{" "}
            · times in {workspace.timeZone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((current) => !current)}
          aria-pressed={showTable}
          className={cn(
            "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
            showTable
              ? "border-ink bg-ink text-surface"
              : "border-hairline text-ink/70 hover:bg-surface-muted",
          )}
        >
          Table view
        </button>
      </header>

      {!mounted ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-surface-muted" />
      ) : (
        <>
          {view.smallSample ? (
            <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
              Small sample: {view.coverage.submitted} of{" "}
              {view.coverage.expected} Reports. Figures below five are shown,
              not trusted.
            </p>
          ) : null}

          {view.lockedReason ? (
            <p className="mt-3 text-[12.5px] text-ink/55">
              {view.lockedReason}
            </p>
          ) : null}

          <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {view.cards.map((card) => (
              <div
                key={card.key}
                className="rounded-lg border border-hairline p-3.5"
              >
                <dt className="text-[11.5px] text-ink/50 uppercase tracking-wide">
                  {card.label}
                </dt>
                <dd className="mt-1 font-medium text-[22px] text-ink tabular-nums">
                  {card.value}
                </dd>
                <p className="mt-1 text-[11.5px] text-ink/55">{card.detail}</p>
              </div>
            ))}
          </dl>

          {showTable ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-surface-muted text-[11.5px] text-ink/55 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 font-medium">Figure</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">Counted</th>
                  </tr>
                </thead>
                <tbody>
                  {view.cards.map((card) => (
                    <tr key={card.key} className="border-hairline border-t">
                      <td className="px-3 py-2 text-ink">{card.label}</td>
                      <td className="px-3 py-2 text-ink tabular-nums">
                        {card.value}
                      </td>
                      <td className="px-3 py-2 text-ink/60">{card.detail}</td>
                    </tr>
                  ))}
                  {view.kpis.map((kpi) => (
                    <tr key={kpi.name} className="border-hairline border-t">
                      <td className="px-3 py-2 text-ink">{kpi.name}</td>
                      <td className="px-3 py-2 text-ink tabular-nums">
                        {kpi.included} of {kpi.total}
                      </td>
                      <td className="px-3 py-2 text-ink/60">
                        Reports that included this figure
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {view.kpis.length > 0 ? (
            <section className="mt-6">
              <h2 className="font-medium text-[14px] text-ink">KPI coverage</h2>
              <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
                {view.kpis.map((kpi) => (
                  <li
                    key={kpi.name}
                    className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2 text-[13px]"
                  >
                    <span className="text-ink">{kpi.name}</span>
                    <span className="text-ink/60 tabular-nums">
                      {kpi.included} of {kpi.total} Reports included it
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {view.groups.length > 0 ? (
            <section className="mt-6">
              <h2 className="font-medium text-[14px] text-ink">
                People by state
              </h2>
              <p className="mt-1 text-[12px] text-ink/55">
                Grouped by state, never ranked.
              </p>
              <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
                {view.groups.map((group) => (
                  <li
                    key={group.state}
                    className="rounded-md border border-hairline px-3 py-2 text-[13px]"
                  >
                    <span className="font-medium text-ink">{group.state}</span>
                    <span className="ml-2 text-ink/60">
                      {group.people.join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-6 text-[12px] text-ink/45">
            {scope === "me"
              ? "Your own record. "
              : "Nothing here ranks a person. "}
            <Link href="/dashboard/reports" className="underline">
              Open My reports
            </Link>{" "}
            to see the Reports behind a figure.
          </p>
        </>
      )}
    </div>
  );
}
