"use client";

import {
  Cancel01Icon,
  Delete02Icon,
  File01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopBarAction, useShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import {
  periodLabel,
  type Report,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
} from "@/data/reports";
import { recordAudit } from "@/lib/audit";
import { htmlToLines } from "@/lib/report-draft";
import {
  lastDecision,
  latestReason,
  lockAt,
  primaryAction,
  timeLeft,
  timelineFor,
  visibleReports,
} from "@/lib/report-view";
import {
  clearEditCopy,
  draftKey,
  hiddenReportIds,
  hideReport,
  loadReport,
  loadReports,
  putHandoff,
  readDraft,
} from "@/lib/reports";
import { SUBMISSION_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ReportTimeline, StatePill } from "./report-timeline";

/* @info - Reading a Report writes nothing, reviewers included: seen belongs to review.
   Edit and Delete here mirror the server's rules; they are not the rules. */

const MINUTE = 60 * 1000;

const FILTER_LABEL = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
} as const;

function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

export function ReportView({ reportId }: { reportId: string }) {
  const { membership, workspace } = useShell();
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    const hidden = hiddenReportIds(window.localStorage, membership.id);
    const result = await loadReport(
      window.localStorage,
      membership.id,
      reportId,
      hidden,
    );
    if (result.success) {
      setReport(result.data);
      setState("ready");
      return;
    }
    setState("missing");
  }, [membership.id, reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const viewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const action = useMemo(
    () =>
      report
        ? primaryAction(report, viewer, SAMPLE_NOW, {
            workspaceReadOnly: workspace.readOnly,
          })
        : null,
    [report, viewer, workspace.readOnly],
  );

  const startEdit = useCallback(() => {
    if (!report) return;
    putHandoff(window.localStorage, membership.id, report.id);
    router.push("/dashboard/reports/new");
  }, [membership.id, report, router]);

  const remove = useCallback(() => {
    if (!report) return;
    recordAudit(window.localStorage, membership.id, {
      at: SAMPLE_NOW,
      actorMembershipId: membership.id,
      action: "report.deleted",
      target: report.id,
      summary: `Deleted ${periodLabel(report.periodId)}`,
    });
    hideReport(window.localStorage, membership.id, report.id);
    clearEditCopy(window.localStorage, membership.id, report.id);
    router.push("/dashboard/reports");
  }, [membership.id, report, router]);

  if (state === "loading") {
    return (
      <Shell>
        <div className="h-6 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-surface-muted" />
      </Shell>
    );
  }

  if (state !== "ready" || !report) {
    return (
      <Shell>
        <h1 className="font-bold text-[22px] text-ink tracking-[-0.02em]">
          That Report could not be found
        </h1>
        <p className="mt-2 max-w-[60ch] text-[14px] text-ink/60 leading-[1.6]">
          It may have been deleted, or it belongs to somebody else.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void load()} className="min-h-11 rounded-xl">
            Try again
          </Button>
          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-11 items-center rounded-xl border border-hairline px-3 text-[13px] text-ink"
          >
            My reports
          </Link>
        </div>
      </Shell>
    );
  }

  const isAuthor = report.authorMembershipId === membership.id;
  const canDelete =
    isAuthor &&
    report.firstSeenAt === null &&
    report.revisions.length === 0 &&
    !workspace.readOnly;
  const reason = latestReason(report);
  const decision = lastDecision(report);
  const lock = lockAt(report);
  const left = timeLeft(SAMPLE_NOW, lock);
  const events = timelineFor(report, viewer);
  const submission = SUBMISSION_STATUS[report.submissionStatus];

  return (
    <Shell>
      {action?.kind === "edit" || action?.kind === "resubmit" ? (
        <TopBarAction>
          <Button
            onClick={startEdit}
            className="hidden h-8 rounded-2xl bg-ink px-3 text-surface md:inline-flex"
          >
            {action.label}
          </Button>
        </TopBarAction>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <Link
            href="/dashboard/reports"
            className="text-[13px] text-ink/60 hover:text-ink"
          >
            Back to my reports
          </Link>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                {isAuthor ? "Your report" : "Report"}
              </h1>
              <StatePill
                status={report.reviewStatus}
                submission={submission.label}
              />
            </div>
            <p className="mt-1 text-[13px] text-ink/60">
              {periodLabel(report.periodId)} · submitted{" "}
              {formatWhen(report.submittedAt, workspace.timeZone)} (
              {workspace.timeZone})
            </p>
          </div>

          {reason ? (
            <div
              className={cn(
                "mt-4 flex items-start gap-3 rounded-xl border p-3.5",
                decision?.kind === "reopened"
                  ? "border-notice/25 bg-notice/[0.06]"
                  : "border-destructive/25 bg-destructive/[0.06]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                  decision?.kind === "reopened"
                    ? "bg-notice/12 text-notice"
                    : "bg-destructive/12 text-destructive",
                )}
              >
                <HugeiconsIcon
                  icon={
                    decision?.kind === "reopened" ? RefreshIcon : Cancel01Icon
                  }
                  strokeWidth={2.2}
                  className="size-4"
                />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-[13px] text-ink">
                  {decision?.kind === "reopened"
                    ? "Reopened for changes"
                    : "Changes requested"}
                </p>
                <p className="mt-1 text-[13px] text-ink/75 leading-[1.6]">
                  {reason}
                </p>
                {decision ? (
                  <p className="mt-1.5 text-[11.5px] text-ink/45">
                    {formatWhen(decision.at, workspace.timeZone)} ·{" "}
                    {decision.actorMembershipId === membership.id
                      ? "You"
                      : "Reviewer"}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {action?.kind === "none" && action.reason ? (
            <p className="mt-3 text-[13px] text-ink/60">{action.reason}</p>
          ) : null}

          <div className="mt-5">
            <article className="flex min-w-0 flex-col gap-5">
              {(
                [
                  ["Accomplishments", report.accomplishments],
                  ["Challenges", report.challenges],
                  ["Next plans", report.plans],
                ] as const
              ).map(([title, html]) => (
                <section key={title}>
                  <h2 className="font-medium text-[14px] text-ink">{title}</h2>
                  <p className="mt-1.5 whitespace-pre-line text-[14px] text-ink/75 leading-[1.7]">
                    {htmlToLines(html) || "Not provided."}
                  </p>
                </section>
              ))}

              <section>
                <h2 className="font-medium text-[14px] text-ink">KPIs</h2>
                <dl className="mt-1.5 grid w-fit grid-cols-[max-content_auto] items-baseline gap-x-5 gap-y-1 text-[13.5px]">
                  {report.kpis.map((kpi) => (
                    <div key={kpi.name} className="contents">
                      <dt className="text-ink/70">{kpi.name}</dt>
                      <dd className="m-0 tabular-nums text-ink">
                        {kpi.value === null
                          ? "Not provided"
                          : `${kpi.value} ${kpi.unit}`}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {report.attachments.length > 0 ? (
                <section>
                  <h2 className="font-medium text-[14px] text-ink">
                    Attachments
                  </h2>
                  <ul className="m-0 mt-1.5 flex list-none flex-col gap-2 p-0">
                    {report.attachments.map((file) => (
                      <li
                        key={file.name}
                        className="flex items-center gap-3 rounded-xl border border-hairline px-3 py-2"
                      >
                        <HugeiconsIcon
                          icon={File01Icon}
                          className="size-4 shrink-0 text-ink/50"
                        />
                        <span className="min-w-0 truncate text-[13px] text-ink">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-[11.5px] text-ink/50">
                          Not uploaded in this build
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </article>
          </div>
        </div>

        <aside className="mt-6 flex flex-col gap-4 lg:sticky lg:top-4 lg:mt-7 lg:self-start">
          <section className="rounded-2xl border border-hairline p-3.5">
            <h2 className="font-medium text-[13px] text-ink">Details</h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
              <dt className="text-ink/50">Submitted</dt>
              <dd className="tabular-nums text-ink">
                {formatWhen(report.submittedAt, workspace.timeZone)}
              </dd>
              <dt className="text-ink/50">First seen</dt>
              <dd className="tabular-nums text-ink">
                {report.firstSeenAt
                  ? formatWhen(report.firstSeenAt, workspace.timeZone)
                  : "Not seen yet"}
              </dd>
              {lock ? (
                <>
                  <dt className="text-ink/50">Locks</dt>
                  <dd className="tabular-nums text-ink">
                    {formatWhen(lock, workspace.timeZone)}
                    {isAuthor && left !== null && left > 0
                      ? ` (${Math.round(left / MINUTE)} min left)`
                      : ""}
                  </dd>
                </>
              ) : null}
              <dt className="text-ink/50">Revisions</dt>
              <dd className="tabular-nums text-ink">
                {report.revisions.length}
              </dd>
              <dt className="text-ink/50">Reviewed by</dt>
              <dd className="text-ink">
                {membership.role === "head" && isAuthor
                  ? "Workspace Admins"
                  : "Your Head of Space"}
              </dd>
            </dl>
          </section>

          <section className="rounded-2xl border border-hairline p-3.5">
            <h2 className="font-medium text-[13px] text-ink">Timeline</h2>
            <div className="mt-3">
              <ReportTimeline
                entries={events}
                when={(iso) => formatWhen(iso, workspace.timeZone)}
              />
            </div>
          </section>

          {canDelete ? (
            <div className="flex flex-col gap-2">
              {confirmDelete ? (
                <div className="rounded-2xl border border-destructive/40 p-3">
                  <p className="text-[12.5px] text-ink">
                    Delete this Report? The period opens again and the text is
                    gone.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      onClick={remove}
                      className="min-h-11 rounded-xl bg-destructive px-3 text-surface"
                    >
                      Delete
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-11 rounded-xl px-3 text-ink/70"
                    >
                      Keep
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-11 justify-start gap-2 rounded-xl bg-destructive px-3 text-[13px] text-surface hover:bg-destructive/90"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  Delete report
                </Button>
              )}
              <p className="text-[11.5px] text-ink/45">
                Deleting hides it on this device. The server owns the real
                delete.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {/* The phone's copy of the action, at the end of the report. */}
      {action?.kind === "edit" || action?.kind === "resubmit" ? (
        <Button
          onClick={startEdit}
          className="mt-6 h-12 w-full rounded-2xl bg-ink text-[15px] text-surface md:hidden"
        >
          {action.label}
        </Button>
      ) : null}
    </Shell>
  );
}

export function ReportList() {
  const { membership, workspace } = useShell();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [draftPeriod, setDraftPeriod] = useState<string | null>(null);

  useEffect(() => {
    const ids = hiddenReportIds(window.localStorage, membership.id);
    void loadReports(window.localStorage, membership.id, ids).then((result) => {
      if (result.success) setReports(result.data);
      else setReports([]);
    });

    const draft = readDraft(
      window.localStorage,
      draftKey(membership.id, SAMPLE_PERIOD.id),
    );
    setDraftPeriod(draft ? SAMPLE_PERIOD.label : null);
  }, [membership.id]);

  const rows = useMemo(() => {
    if (!reports) return null;
    const visible = visibleReports(
      reports.filter((report) => report.authorMembershipId === membership.id),
      workspace.plan,
      SAMPLE_NOW,
    );
    const filtered =
      filter === "all"
        ? visible
        : visible.filter((report) => report.reviewStatus === filter);
    return [...filtered].sort(
      (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
    );
  }, [filter, membership.id, reports, workspace.plan]);

  const counts = useMemo(() => {
    const own = (reports ?? []).filter(
      (report) => report.authorMembershipId === membership.id,
    );
    return {
      all: own.length,
      pending: own.filter((r) => r.reviewStatus === "pending").length,
      approved: own.filter((r) => r.reviewStatus === "approved").length,
      rejected: own.filter((r) => r.reviewStatus === "rejected").length,
    };
  }, [membership.id, reports]);

  return (
    <Shell>
      <TopBarAction>
        <Link
          href="/dashboard/reports/new"
          className="hidden h-8 items-center rounded-2xl bg-ink px-3 text-[13px] text-surface md:inline-flex"
        >
          Submit report
        </Link>
      </TopBarAction>

      <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
        My reports
      </h1>
      <p className="mt-1 text-[13px] text-ink/60">
        Times shown in {workspace.timeZone}.
      </p>

      {workspace.plan === "starter" ? (
        <p className="mt-2 text-[12px] text-ink/45">
          Starter keeps Reports from the last 30 days.
        </p>
      ) : null}

      {membership.role === "admin" ? (
        <div className="mt-4 rounded-2xl border border-hairline border-dashed p-4">
          <p className="text-[13.5px] text-ink">Admins monitor Reports</p>
          <p className="mt-1 max-w-[56ch] text-[12.5px] text-ink/60 leading-[1.6]">
            Workspace Admins review Reports and don't submit them. Switch to a
            Staff or Head of Space Membership to see authored Reports here.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(["all", "pending", "approved", "rejected"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn(
              "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
              filter === key
                ? "border-ink bg-ink text-surface"
                : "border-hairline text-ink/70 hover:bg-surface-muted",
            )}
          >
            {FILTER_LABEL[key]} ({counts[key]})
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {draftPeriod && membership.role !== "admin" ? (
          <Link
            href="/dashboard/reports/new"
            className="flex min-h-11 flex-wrap items-center gap-2.5 rounded-2xl border border-dashed border-hairline px-3.5 py-3 hover:bg-surface-muted"
          >
            <span className="text-[13px] text-ink">Draft, continue</span>
            <span className="text-[12px] text-ink/50">{draftPeriod}</span>
          </Link>
        ) : null}

        {rows === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-hairline border-dashed p-6 text-center">
            <p className="text-[13.5px] text-ink">
              {filter === "all"
                ? "No reports yet."
                : `Nothing is ${filter} right now.`}
            </p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-2 text-[12.5px] text-ink/60 underline"
            >
              Show all
            </button>
          </div>
        ) : (
          rows.map((report) => (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.id}`}
              className="grid gap-x-3 gap-y-1 rounded-2xl border border-hairline px-3.5 py-3 hover:bg-surface-muted sm:grid-cols-[minmax(0,1fr)_150px_170px] sm:items-center"
            >
              <span className="text-[13.5px] text-ink">
                {periodLabel(report.periodId)}
                {report.revisions.length > 0 ? (
                  <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink/60">
                    Edited
                  </span>
                ) : null}
              </span>
              <StatePill
                status={report.reviewStatus}
                submission={SUBMISSION_STATUS[report.submissionStatus].label}
              />
              <span className="tabular-nums text-[12px] text-ink/45">
                {formatWhen(report.submittedAt, workspace.timeZone)}
              </span>
            </Link>
          ))
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="w-full px-4 py-6 sm:px-6">{children}</div>;
}
