"use client";

import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { CO_LEAGUE_ROSTER } from "@/data/members";
import {
  type Comment,
  periodLabel,
  type Report,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
} from "@/data/reports";
import { REPORT_STATUS, SUBMISSION_STATUS } from "@/lib/status";
import { recordAudit } from "@/lib/audit";
import {
  canDecide,
  type Decision,
  decisionBlocked,
  missingFor,
  queueFor,
  type ReviewViewer,
} from "@/lib/review";
import { savedReports, SAVED_PREFIX } from "@/lib/reports";
import { cn } from "@/lib/utils";

/* @info - A queue row is not an open: the clocks start when the Report page is
   opened, never here. This screen only decides. */

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

export function ReviewQueue() {
  const { membership, workspace, user } = useShell();
  const viewer: ReviewViewer = {
    membershipId: membership.id,
    role: membership.role,
    space: membership.space,
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [deciding, setDeciding] = useState<{
    report: Report;
    decision: Decision;
  } | null>(null);
  const [bulk, setBulk] = useState<Decision | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = savedReports(window.localStorage, membership.id);
    setReports(SAMPLE_REPORTS.map((report) => saved[report.id] ?? report));
    setLoaded(true);
  }, [membership.id]);

  const queue = useMemo(
    () =>
      queueFor({
        reports,
        roster: CO_LEAGUE_ROSTER,
        viewer,
        periodId: SAMPLE_PERIOD.id,
      }),
    [reports, viewer],
  );

  const missing = useMemo(
    () =>
      missingFor({
        reports,
        roster: CO_LEAGUE_ROSTER,
        viewer,
        periodId: SAMPLE_PERIOD.id,
      }),
    [reports, viewer],
  );

  const visible = queue.filter((report) => report.reviewStatus === tab);
  const counts: Record<Tab, number> = {
    pending: queue.filter((report) => report.reviewStatus === "pending").length,
    approved: queue.filter((report) => report.reviewStatus === "approved")
      .length,
    rejected: queue.filter((report) => report.reviewStatus === "rejected")
      .length,
    missing: missing.length,
  };

  const nameOf = (membershipId: string) =>
    CO_LEAGUE_ROSTER.find((member) => member.membershipId === membershipId)
      ?.name ?? "Former member";

  const guard = (report: Report) =>
    canDecide({
      report,
      viewer,
      readOnly: workspace.readOnly,
      now: SAMPLE_NOW,
    });

  const decide = (report: Report, decision: Decision, reason: string) => {
    const at = new Date().toISOString();
    const comment: Comment | null =
      decision === "approve"
        ? null
        : {
            id: `cmt_${report.id}_${decision}_${Date.now()}`,
            reportId: report.id,
            authorMembershipId: membership.id,
            body: reason.trim(),
            at,
            kind: "decision",
          };

    const next: Report = {
      ...report,
      reviewStatus: decision === "approve" ? "approved" : "pending",
      // Reopen gives the author a fresh window: the next look starts a new one, and
      // firstSeenAt is never lost.
      windowStartedAt: decision === "reopen" ? null : report.windowStartedAt,
      comments: comment ? [...report.comments, comment] : report.comments,
      events: [
        ...report.events,
        {
          kind:
            decision === "approve"
              ? "approved"
              : decision === "reject"
                ? "rejected"
                : "reopened",
          at,
          actorMembershipId: membership.id,
        },
      ],
      updatedAt: at,
    };

    const saved = savedReports(window.localStorage, membership.id);
    try {
      window.localStorage.setItem(
        `${SAVED_PREFIX}.${membership.id}`,
        JSON.stringify({ ...saved, [report.id]: next }),
      );
    } catch {
      setNotice("That decision could not be saved on this device.");
      return;
    }

    recordAudit(window.localStorage, membership.id, {
      at,
      actorMembershipId: membership.id,
      action: decision === "reopen" ? "reopened" : "decided",
      target: report.id,
      summary: DECISION_LABEL[decision],
    });

    setReports((current) =>
      current.map((row) => (row.id === report.id ? next : row)),
    );
    setNotice(
      decision === "approve"
        ? `${nameOf(report.authorMembershipId)} was notified: their Report is approved.`
        : decision === "reject"
          ? `${nameOf(report.authorMembershipId)} was notified and can edit their Report.`
          : `${nameOf(report.authorMembershipId)} was notified that the Report is reopened.`,
    );
  };

  const bulkRows = queue.filter(
    (report) => selected.includes(report.id) && guard(report).allowed,
  );

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Review
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            {periodLabel(SAMPLE_PERIOD.id)} · {counts.pending} waiting ·{" "}
            {counts.missing} not submitted
          </p>
        </div>
        <p className="text-[12px] text-ink/50">{user.name}</p>
      </header>

      {workspace.readOnly ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          This Workspace is read-only, so no decisions can be recorded.
        </p>
      ) : null}

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

      {bulkRows.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-hairline bg-surface-muted px-3 py-2">
          <p className="text-[12.5px] text-ink">
            {bulkRows.length} selected. Approving notifies each author once.
          </p>
          <Button
            onClick={() => setBulk("approve")}
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

      {!loaded ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-surface-muted" />
      ) : null}

      {loaded && tab !== "missing" ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
          <div className="hidden bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide sm:grid sm:grid-cols-[28px_minmax(0,1fr)_150px_180px] sm:gap-3">
            <span />
            <span>Author</span>
            <span>State</span>
            <span className="text-right">Actions</span>
          </div>
          {visible.map((report) => {
            const allowed = guard(report);
            const checked = selected.includes(report.id);
            return (
              <div
                key={report.id}
                className="grid gap-2 border-hairline border-t px-3.5 py-3 sm:grid-cols-[28px_minmax(0,1fr)_150px_180px] sm:items-center sm:gap-3"
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${nameOf(report.authorMembershipId)}'s Report`}
                  checked={checked}
                  disabled={!allowed.allowed}
                  onChange={() =>
                    setSelected((current) =>
                      checked
                        ? current.filter((id) => id !== report.id)
                        : [...current, report.id],
                    )
                  }
                  className="size-4 accent-ink"
                />
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
                    allowed={allowed}
                    tone="success"
                    onClick={() => setDeciding({ report, decision: "approve" })}
                  >
                    Approve
                  </DecisionButton>
                  <DecisionButton
                    allowed={allowed}
                    tone="danger"
                    onClick={() => setDeciding({ report, decision: "reject" })}
                  >
                    Reject
                  </DecisionButton>
                  <DecisionButton
                    allowed={allowed}
                    tone="notice"
                    onClick={() => setDeciding({ report, decision: "reopen" })}
                  >
                    Reopen
                  </DecisionButton>
                </div>
                {allowed.allowed ? null : (
                  <p className="text-[11.5px] text-ink/45 sm:col-start-2 sm:col-span-3">
                    {allowed.reason}
                  </p>
                )}
              </div>
            );
          })}
          {visible.length === 0 ? (
            <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
              Nothing here. {tab === "pending" ? "The queue is clear." : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {loaded && tab === "missing" ? (
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
                <p className="truncate text-[13.5px] text-ink">{row.name}</p>
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
      ) : null}

      <DecisionDialog
        target={deciding}
        onClose={() => setDeciding(null)}
        onConfirm={(decision, reason) => {
          if (deciding) decide(deciding.report, decision, reason);
          setDeciding(null);
          setSelected([]);
        }}
      />

      <Dialog
        open={bulk !== null}
        onOpenChange={(open) => !open && setBulk(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve {bulkRows.length} Reports</DialogTitle>
            <DialogDescription>
              Each author is notified once. Reports already decided are skipped,
              because a second decision is refused.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setBulk(null)}
              className="min-h-11 rounded-md px-3 text-[12.5px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                bulkRows.forEach((report) => decide(report, "approve", ""));
                setBulk(null);
                setSelected([]);
              }}
              className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
            >
              Approve {bulkRows.length}
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

function DecisionDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: { report: Report; decision: Decision } | null;
  onClose: () => void;
  onConfirm: (decision: Decision, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setProblem(null);
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
          <p className="text-[12.5px] text-destructive">{problem}</p>
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
            onClick={() => {
              const blocked = decisionBlocked(decision, reason);
              if (blocked) {
                setProblem(blocked);
                return;
              }
              onConfirm(decision, reason);
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
            {DECISION_LABEL[decision]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
