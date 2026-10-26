"use client";

import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { useShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { CO_LEAGUE_ROSTER, SPACES } from "@/data/members";
import {
  type KpiTemplateField,
  periodLabel,
  SAMPLE_NOW,
  SAMPLE_REPORTS,
} from "@/data/reports";
import { ROLE_LABEL } from "@/data/viewer";
import { recordAudit } from "@/lib/audit";
import {
  applyTemplate,
  canEditTemplate,
  reportsInSpace,
  spaceById,
  spaceStats,
} from "@/lib/spaces";
import { cn } from "@/lib/utils";

/* @info - One Space, three tabs. Every figure here counts the people in this Space,
   never the Workspace, because a Head must not be handed the Workspace totals. */

type Tab = "reports" | "members" | "template";

const TABS: Array<[Tab, string]> = [
  ["reports", "Reports"],
  ["members", "Members"],
  ["template", "KPI template"],
];

export function SpaceScreen({ id }: { id: string }) {
  const { membership } = useShell();
  const space = spaceById(SPACES, id);

  const [tab, setTab] = useState<Tab>("reports");
  const [template, setTemplate] = useState<KpiTemplateField[]>(
    space?.kpiTemplate ?? [],
  );
  const [notice, setNotice] = useState<string | null>(null);

  const stats = useMemo(
    () =>
      space
        ? spaceStats({
            space,
            roster: CO_LEAGUE_ROSTER,
            reports: SAMPLE_REPORTS,
          })
        : null,
    [space],
  );

  const reports = useMemo(
    () =>
      space ? reportsInSpace(SAMPLE_REPORTS, CO_LEAGUE_ROSTER, space.name) : [],
    [space],
  );

  if (!space || !stats) {
    return (
      <DataPage>
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          That Space could not be found.
        </h1>
        <p className="mt-2 text-[13px] text-ink/60">
          It may have been archived.{" "}
          <Link href="/dashboard/spaces" className="underline">
            Back to Spaces
          </Link>
        </p>
      </DataPage>
    );
  }

  const head = CO_LEAGUE_ROSTER.find(
    (member) => member.membershipId === space.headMembershipId,
  );
  const guard = canEditTemplate(
    {
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    },
    space,
  );

  const saveTemplate = (next: KpiTemplateField[]) => {
    setTemplate(next);
    recordAudit(window.localStorage, membership.id, {
      at: SAMPLE_NOW,
      actorMembershipId: membership.id,
      action: "settings.change",
      target: space.id,
      summary: `KPI template for ${space.name}`,
    });
    setNotice("Saved. Reports started after this change use the new fields.");
  };

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
              {space.name}
            </h1>
            {space.archived ? (
              <span className="rounded-md border border-hairline px-2 py-0.5 text-[11px] text-ink/50">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-ink/60">
            {head
              ? `Head of Space: ${head.name}`
              : "No Head, reviewed by Workspace Admins"}{" "}
            · {stats.people} {stats.people === 1 ? "member" : "members"}
          </p>
        </div>
        <Link
          href="/dashboard/spaces"
          className="min-h-11 rounded-md border border-hairline px-3 text-[12.5px] text-ink/70 leading-[2.75] hover:bg-surface-muted sm:min-h-9 sm:leading-[2.25]"
        >
          All Spaces
        </Link>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [
            "Submitted this period",
            `${stats.peopleSubmitted} of ${stats.expected}`,
          ],
          ["Pending review", String(stats.pending)],
          ["Approved", String(stats.approved)],
          ["Missing", String(stats.missing)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-hairline px-3 py-2"
          >
            <dt className="text-[11.5px] text-ink/50 uppercase tracking-wide">
              {label}
            </dt>
            <dd className="mt-0.5 font-medium text-[16px] text-ink tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
              tab === key
                ? "border-ink bg-ink text-surface"
                : "border-hairline text-ink/70 hover:bg-surface-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </p>
      ) : null}

      {tab === "reports" ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
          <div className="bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide">
            Reports in {space.name}
          </div>
          {reports.map((report) => {
            const author = CO_LEAGUE_ROSTER.find(
              (member) => member.membershipId === report.authorMembershipId,
            );
            return (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-2 border-hairline border-t px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] text-ink">
                    {author?.name ?? "Former member"}
                  </p>
                  <p className="text-[11.5px] text-ink/50">
                    {periodLabel(report.periodId)} · {report.reviewStatus}
                  </p>
                </div>
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="min-h-11 rounded-md bg-surface-muted px-3 text-[11.5px] text-ink/75 leading-[2.75] hover:bg-surface-muted/70 sm:min-h-8 sm:leading-[2]"
                >
                  Open report
                </Link>
              </div>
            );
          })}
          {reports.length === 0 ? (
            <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
              Nobody in this Space has submitted a Report yet.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
          <div className="bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide">
            Members of {space.name}
          </div>
          {CO_LEAGUE_ROSTER.filter((member) => member.space === space.name).map(
            (member) => (
              <div
                key={member.membershipId}
                className="flex flex-wrap items-center justify-between gap-2 border-hairline border-t px-3.5 py-3"
              >
                <p className="text-[13.5px] text-ink">
                  {member.name}
                  {member.active ? null : (
                    <span className="ml-2 text-[11.5px] text-ink/45">
                      Deactivated
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-ink/60">
                  {ROLE_LABEL[member.role]}
                </p>
              </div>
            ),
          )}
          {CO_LEAGUE_ROSTER.some(
            (member) => member.space === space.name,
          ) ? null : (
            <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
              Nobody is in this Space. A member joins one through Change Space.
            </p>
          )}
        </div>
      ) : null}

      {tab === "template" ? (
        <TemplateEditor
          template={template}
          guard={guard}
          onSave={saveTemplate}
          sampleRow={applyTemplate(template, [])[0] ?? null}
        />
      ) : null}
    </DataPage>
  );
}

function TemplateEditor({
  template,
  guard,
  onSave,
  sampleRow,
}: {
  template: KpiTemplateField[];
  guard: { allowed: boolean; reason: string | null };
  onSave: (next: KpiTemplateField[]) => void;
  sampleRow: { name: string; unit: string; value: number | null } | null;
}) {
  const [rows, setRows] = useState<KpiTemplateField[]>(template);

  return (
    <section className="mt-4 rounded-lg border border-hairline p-4">
      <h2 className="font-medium text-[14px] text-ink">KPI template</h2>
      <p className="mt-1 text-[12.5px] text-ink/60">
        Suggested fields, prefilled when someone in this Space starts a Report.
        Never required, and a blank figure is "not provided", never zero.
      </p>
      {guard.allowed ? null : (
        <p className="mt-2 text-[12px] text-ink/50">{guard.reason}</p>
      )}

      <div className="mt-3 grid gap-2">
        {rows.map((row, index) => (
          <div
            key={`${row.name}-${index}`}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              aria-label={`KPI name ${index + 1}`}
              value={row.name}
              disabled={!guard.allowed}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              className="min-h-11 min-w-0 flex-1 rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
            <input
              aria-label={`KPI unit ${index + 1}`}
              value={row.unit}
              disabled={!guard.allowed}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, unit: event.target.value } : item,
                  ),
                )
              }
              className="min-h-11 w-28 rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
            <button
              type="button"
              aria-label={`Remove KPI ${index + 1}`}
              disabled={!guard.allowed}
              onClick={() =>
                setRows((current) => current.filter((_, i) => i !== index))
              }
              className="grid size-11 place-items-center rounded-md bg-destructive/10 text-destructive disabled:opacity-40"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-ink/60">
          No fields. Reports in this Space start with an empty KPI table.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          disabled={!guard.allowed}
          onClick={() =>
            setRows((current) => [...current, { name: "", unit: "count" }])
          }
          className="min-h-11 gap-1.5 rounded-md px-3 text-[12.5px] text-ink/75"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
          Add field
        </Button>
        <Button
          disabled={!guard.allowed}
          onClick={() => onSave(rows.filter((row) => row.name.trim() !== ""))}
          className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
        >
          Save template
        </Button>
      </div>

      {sampleRow ? (
        <p className="mt-3 text-[11.5px] text-ink/45">
          A new Report in this Space opens with {rows.length}{" "}
          {rows.length === 1 ? "row" : "rows"}, the first reading "
          {sampleRow.name}" in {sampleRow.unit}. A Report already started keeps
          the rows it began with.
        </p>
      ) : null}
    </section>
  );
}

export function SpaceRoute({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  return <SpaceScreen id={resolved.id} />;
}
