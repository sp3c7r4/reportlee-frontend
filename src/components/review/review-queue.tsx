"use client";

import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { useShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Report, ReportingPeriod } from "@/data/reports";
import type { ApiMember } from "@/lib/api-types";
import { listMembers } from "@/lib/members";
import { periodTitle } from "@/lib/periods";
import { reportErrorMessage } from "@/lib/report-errors";
import { getCurrentPeriod } from "@/lib/reports-api";
import {
  type Decision,
  decisionBlocked,
  decisionGuard,
  type MissingRow,
  type ReviewViewer,
} from "@/lib/review";
import {
  type BulkSummary,
  bulkApprove,
  bulkSummary,
  decide,
  loadQueue,
} from "@/lib/review-api";
import { REPORT_STATUS, SUBMISSION_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

/* @info - A queue row is not an open: the reviewer's clock starts when the Report page
   is opened, never here. This screen only decides, and the server answer wins. */

type Tab = "pending" | "approved" | "rejected" | "missing";

const TABS: Array<[Tab, string]> = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["missing", "Not submitted"],
];

const DECISION_LABEL: Record<Decision, string> = {
  approve: "Approve",
  reject: "Request changes",
  reopen: "Reopen",
};

type Loaded = {
  period: ReportingPeriod;
  reports: Report[];
  missing: MissingRow[];
  roster: ApiMember[];
};

export function ReviewQueue() {
  const { membership, workspace, user } = useShell();
  const viewer: ReviewViewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const [data, setData] = useState<Loaded | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [deciding, setDeciding] = useState<{
    report: Report;
    decision: Decision;
  } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isStaff = viewer.role === "staff";

  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the retry trigger
  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    setData(null);
    setFailure(null);
    void (async () => {
      const period = await getCurrentPeriod(workspace.id);
      if (cancelled) return;
      if (!period.ok) {
        setFailure(reportErrorMessage(period));
        return;
      }
      const [queue, roster] = await Promise.all([
        loadQueue(workspace.id, period.data.id),
        listMembers(workspace.id),
      ]);
      if (cancelled) return;
      if (!queue.ok) {
        setFailure(reportErrorMessage(queue));
        return;
      }
      setData({
        period: period.data,
        reports: queue.data.reports,
        missing: queue.data.missing,
        /* @info - Names are a nicety: a failed roster call leaves "Former member". */
        roster: roster.ok ? roster.data : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff, version, workspace.id]);

  const reports = data?.reports ?? [];
  const missing = data?.missing ?? [];
  const visible = reports.filter((report) => report.reviewStatus === tab);
  const counts: Record<Tab, number> = {
    pending: reports.filter((report) => report.reviewStatus === "pending")
      .length,
    approved: reports.filter((report) => report.reviewStatus === "approved")
      .length,
    rejected: reports.filter((report) => report.reviewStatus === "rejected")
      .length,
    missing: missing.length,
  };

  const nameOf = useCallback(
    (membershipId: string) =>
      data?.roster.find((member) => member.membershipId === membershipId)
        ?.name ?? "Former member",
    [data],
  );

  const guard = (report: Report, decision: Decision) =>
    decisionGuard({
      report,
      viewer,
      readOnly: workspace.readOnly,
      now: new Date().toISOString(),
      decision,
    });

  /** Returns a sentence when the server refused, so the dialog can show it. */
  const submitDecision = async (
    report: Report,
    decision: Decision,
    reason: string,
  ): Promise<string | null> => {
    const result = await decide(report.id, decision, reason);
    if (!result.ok) {
      return result.fields?.reason ?? reportErrorMessage(result);
    }
    setData((current) =>
      current
        ? {
            ...current,
            reports: current.reports.map((row) =>
              row.id === report.id ? result.data : row,
            ),
          }
        : current,
    );
    const who = nameOf(report.authorMembershipId);
    setNotice(
      decision === "approve"
        ? `${who} was notified: their Report is approved.`
        : decision === "reject"
          ? `${who} was notified and can edit their Report.`
          : `${who} was notified that the Report is reopened.`,
    );
    return null;
  };

  const bulkRows = reports.filter(
    (report) =>
      selected.includes(report.id) && guard(report, "approve").allowed,
  );

  const runBulk = async () => {
    setBulkBusy(true);
    setBulkError(null);
    const result = await bulkApprove(
      workspace.id,
      bulkRows.map((report) => report.id),
    );
    setBulkBusy(false);
    if (!result.ok) {
      setBulkError(reportErrorMessage(result));
      return;
    }
    setSummary(
      bulkSummary(result.data, (id) => {
        const row = reports.find((report) => report.id === id);
        return row ? nameOf(row.authorMembershipId) : `Report ${id}`;
      }),
    );
    setBulk(false);
    setSelected([]);
    setVersion((current) => current + 1);
  };

  if (isStaff) {
    return (
      <DataPage>
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          Review
        </h1>
        <p className="mt-3 rounded-lg border border-hairline border-dashed px-4 py-8 text-center text-[13px] text-ink/60">
          You do not review reports.
        </p>
      </DataPage>
    );
  }

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Review
          </h1>
          {data ? (
            <p className="mt-1 text-[13px] text-ink/60">
              {periodTitle(data.period.id, [data.period])} · {counts.pending}{" "}
              waiting · {counts.missing} not submitted
            </p>
          ) : null}
        </div>
        <p className="text-[12px] text-ink/50">{user.name}</p>
      </header>

      {workspace.readOnly ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          This Workspace is read-only, so no decisions can be recorded.
        </p>
      ) : null}

      {failure ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-hairline p-4"
        >
          <p className="text-[13.5px] text-ink">{failure}</p>
          <Button
            variant="outline"
            onClick={() => setVersion((current) => current + 1)}
            className="mt-2 min-h-11 rounded-md px-3 text-[13px] sm:min-h-9"
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!failure && !data ? (
        <div aria-busy="true" className="mt-4">
          <span className="sr-only">Loading</span>
          <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setSelected([]);
                }}
                aria-pressed={tab === key}
                className={cn(
                  "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
                  tab === key
                    ? "border-ink bg-ink text-surface"
                    : "border-hairline text-ink/70 hover:bg-surface-muted",
                )}
              >
                {label} ({counts[key]})
              </button>
            ))}
          </div>

          {notice ? (
            <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
              {notice}
            </p>
          ) : null}

          {summary ? (
            <div className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2">
              <p className="text-[12.5px] text-ink">{summary.headline}</p>
              {summary.skipped.length > 0 ? (
                <ul className="m-0 mt-1 list-none p-0">
                  {summary.skipped.map((row) => (
                    <li key={row.id} className="text-[12px] text-ink/65">
                      {row.label}: {row.message}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => setSummary(null)}
                className="mt-1 min-h-11 text-[12px] text-ink/60 underline sm:min-h-8"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {viewer.role === "admin" && bulkRows.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-hairline bg-surface-muted px-3 py-2">
              <p className="text-[12.5px] text-ink">
                {bulkRows.length} selected. Approving notifies each author once.
              </p>
              <Button
                onClick={() => {
                  setBulkError(null);
                  setBulk(true);
                }}
                className="min-h-11 rounded-md bg-ink px-3 text-[12px] text-surface sm:min-h-8"
              >
                Approve selected
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelected([])}
                className="min-h-11 rounded-md px-3 text-[12px] text-ink/70 sm:min-h-8"
              >
                Clear
              </Button>
            </div>
          ) : null}

          {tab !== "missing" ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
              <div className="hidden bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide sm:grid sm:grid-cols-[28px_minmax(0,1fr)_150px_180px] sm:gap-3">
                <span />
                <span>Author</span>
                <span>State</span>
                <span className="text-right">Actions</span>
              </div>
              {visible.map((report) => {
                const approve = guard(report, "approve");
                const reject = guard(report, "reject");
                const reopen = guard(report, "reopen");
                const checked = selected.includes(report.id);
                const hint =
                  [approve, reject, reopen].find((g) => g.allowed)?.reason ??
                  [approve, reject, reopen].find((g) => g.reason)?.reason ??
                  null;
                const anyAllowed =
                  approve.allowed || reject.allowed || reopen.allowed;
                return (
                  <div
                    key={report.id}
                    className="grid gap-2 border-hairline border-t px-3.5 py-3 sm:grid-cols-[28px_minmax(0,1fr)_150px_180px] sm:items-center sm:gap-3"
                  >
                    {viewer.role === "admin" ? (
                      <input
                        type="checkbox"
                        aria-label={`Select ${nameOf(report.authorMembershipId)}'s Report`}
                        checked={checked}
                        disabled={!approve.allowed}
                        onChange={() =>
                          setSelected((current) =>
                            checked
                              ? current.filter((id) => id !== report.id)
                              : [...current, report.id],
                          )
                        }
                        className="size-4 accent-ink"
                      />
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/reports/${report.id}`}
                        className="truncate text-[13.5px] text-ink hover:underline"
                      >
                        {nameOf(report.authorMembershipId)}
                      </Link>
                      <p className="text-[11.5px] text-ink/50">
                        {SUBMISSION_STATUS[report.submissionStatus].label} ·{" "}
                        {report.comments.length} comment
                        {report.comments.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-[12.5px] text-ink/70">
                      {REPORT_STATUS[report.reviewStatus].label}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <DecisionButton
                        allowed={approve}
                        tone="success"
                        onClick={() =>
                          setDeciding({ report, decision: "approve" })
                        }
                      >
                        Approve
                      </DecisionButton>
                      <DecisionButton
                        allowed={reject}
                        tone="danger"
                        onClick={() =>
                          setDeciding({ report, decision: "reject" })
                        }
                      >
                        Reject
                      </DecisionButton>
                      <DecisionButton
                        allowed={reopen}
                        tone="notice"
                        onClick={() =>
                          setDeciding({ report, decision: "reopen" })
                        }
                      >
                        Reopen
                      </DecisionButton>
                    </div>
                    {anyAllowed ? null : (
                      <p className="text-[11.5px] text-ink/45 sm:col-span-3 sm:col-start-2">
                        {hint}
                      </p>
                    )}
                  </div>
                );
              })}
              {visible.length === 0 ? (
                <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
                  {tab === "pending"
                    ? "Nothing to review in this period. The queue is clear."
                    : "Nothing here."}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
              <div className="bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide">
                Not submitted this period
              </div>
              {missing.map((row) => (
                <div
                  key={row.membershipId}
                  className="flex flex-wrap items-center justify-between gap-2 border-hairline border-t px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-ink">
                      {row.name}
                    </p>
                    <p className="text-[11.5px] text-ink/50">
                      {row.space ?? "No Space"} ·{" "}
                      {row.hasDraft ? "Draft, not sent" : "Not submitted"}
                    </p>
                  </div>
                  <span className="rounded-md border border-hairline px-2 py-0.5 text-[11px] text-ink/50">
                    Not submitted
                  </span>
                </div>
              ))}
              {missing.length === 0 ? (
                <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
                  Everyone expected to report has submitted.
                </p>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      <DecisionDialog
        target={deciding}
        onClose={() => setDeciding(null)}
        onConfirm={async (target, reason) => {
          const problem = await submitDecision(
            target.report,
            target.decision,
            reason,
          );
          if (!problem) {
            setDeciding(null);
            setSelected([]);
          }
          return problem;
        }}
      />

      <Dialog open={bulk} onOpenChange={(open) => !open && setBulk(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve {bulkRows.length} Reports</DialogTitle>
            <DialogDescription>
              Each author is notified once. Reports that cannot be approved are
              skipped, and the result lists each one.
            </DialogDescription>
          </DialogHeader>
          {bulkError ? (
            <p role="alert" className="text-[12.5px] text-destructive">
              {bulkError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setBulk(false)}
              className="min-h-11 rounded-md px-3 text-[12.5px]"
            >
              Cancel
            </Button>
            <Button
              disabled={bulkBusy}
              onClick={() => void runBulk()}
              className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
            >
              {bulkBusy ? "Approving" : `Approve ${bulkRows.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataPage>
  );
}

function DecisionButton({
  allowed,
  tone,
  onClick,
  children,
}: {
  allowed: { allowed: boolean; reason: string | null };
  tone: "success" | "danger" | "notice";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones = {
    success: "bg-success/10 text-success hover:bg-success/15",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/15",
    notice: "bg-notice/10 text-notice hover:bg-notice/15",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!allowed.allowed}
      title={allowed.reason ?? undefined}
      className={cn(
        "min-h-11 whitespace-nowrap rounded-md px-2 text-[11.5px] font-medium disabled:opacity-40 sm:min-h-8",
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}

type DecisionTarget = { report: Report; decision: Decision };

function DecisionDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: DecisionTarget | null;
  onClose: () => void;
  /** Resolves to a sentence when the server refused, or null when it worked. */
  onConfirm: (target: DecisionTarget, reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the form resets when the target changes
  useEffect(() => {
    setReason("");
    setProblem(null);
    setBusy(false);
  }, [target?.report.id, target?.decision]);

  const decision = target?.decision ?? "approve";

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{DECISION_LABEL[decision]}</DialogTitle>
          <DialogDescription>
            {decision === "approve"
              ? "The author is notified. Approving needs no reason."
              : decision === "reject"
                ? "The author is told what to change and can edit their Report."
                : "The Report returns to pending and the author can edit it again."}
          </DialogDescription>
        </DialogHeader>

        {decision !== "approve" ? (
          <label
            className="block text-[12px] text-ink/60"
            htmlFor="decision-reason"
          >
            Reason
            <textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-transparent bg-surface-muted px-3 py-2 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
          </label>
        ) : null}

        {problem ? (
          <p role="alert" className="text-[12.5px] text-destructive">
            {problem}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="min-h-11 rounded-md px-3 text-[12.5px]"
          >
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (!target) return;
              const blocked = decisionBlocked(decision, reason);
              if (blocked) {
                setProblem(blocked);
                return;
              }
              setBusy(true);
              setProblem(null);
              const refused = await onConfirm(target, reason);
              setBusy(false);
              if (refused) setProblem(refused);
            }}
            className="min-h-11 gap-1.5 rounded-md bg-ink px-3 text-[12.5px] text-surface"
          >
            <HugeiconsIcon
              icon={
                decision === "approve"
                  ? CheckmarkCircle02Icon
                  : decision === "reject"
                    ? Cancel01Icon
                    : RefreshIcon
              }
              className="size-3.5"
            />
            {busy ? "Saving" : DECISION_LABEL[decision]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
