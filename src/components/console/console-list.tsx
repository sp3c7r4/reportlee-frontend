"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SPACES } from "@/data/members";
import { SAMPLE_PERIOD, SAMPLE_REPORTS } from "@/data/reports";
import { WORKSPACES } from "@/data/viewer";
import {
  type PlatformAction,
  auditLine,
  OPERATOR,
  planDisplay,
  type PlanState,
  renameProblem,
} from "@/lib/console";

/**
 * The console reads what the platform returns. It computes no price, no proration and no
 * discount, and it writes an audit entry before it shows a Workspace's content.
 */

const CONSOLE_KEY = "reportlee.console.audit";

function readLog(): Array<{ at: string; line: string }> {
  try {
    const raw = window.localStorage.getItem(CONSOLE_KEY);
    return raw ? (JSON.parse(raw) as Array<{ at: string; line: string }>) : [];
  } catch {
    return [];
  }
}

function writeLog(action: PlatformAction, workspaceName: string) {
  const next = [
    { at: new Date().toISOString(), line: auditLine(action, workspaceName) },
    ...readLog(),
  ].slice(0, 50);
  window.localStorage.setItem(CONSOLE_KEY, JSON.stringify(next));
  return next;
}

const STATE: Record<string, PlanState> = {
  ws_arthurite: "active",
  ws_northline: "past_due",
  ws_meridian: "cancelled",
  ws_kano: "trial",
};

export function ConsoleList() {
  const [query, setQuery] = useState("");
  const [log, setLog] = useState<Array<{ at: string; line: string }>>([]);

  useEffect(() => {
    setLog(readLog());
  }, []);

  const rows = useMemo(
    () =>
      WORKSPACES.filter((workspace) =>
        workspace.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-[22px] text-ink tracking-[-0.03em]">
            Workspaces
          </h1>
          <p className="mt-1 text-[12.5px] text-ink/60">{OPERATOR.note}</p>
        </div>
        <p className="text-[12px] text-ink/50">{OPERATOR.name}</p>
      </header>

      <label className="mt-4 block max-w-[360px] text-[12px] text-ink/60">
        Find a Workspace
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-surface px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
        <div className="hidden bg-surface-muted px-3 py-2 text-[11.5px] text-ink/55 uppercase tracking-wide sm:grid sm:grid-cols-[minmax(0,1fr)_140px_120px_140px] sm:gap-3">
          <span>Workspace</span>
          <span>Plan</span>
          <span>Members</span>
          <span className="text-right">Support</span>
        </div>
        {rows.map((workspace) => (
          <div
            key={workspace.id}
            className="grid gap-1 border-hairline border-t px-3 py-2.5 text-[12.5px] sm:grid-cols-[minmax(0,1fr)_140px_120px_140px] sm:items-center sm:gap-3"
          >
            <span className="text-ink">{workspace.name}</span>
            <span className="text-ink/60">
              {planDisplay(workspace.plan, STATE[workspace.id] ?? "active")}
            </span>
            <span className="text-ink/60 tabular-nums">
              {workspace.memberLimit ?? "No limit"}
            </span>
            <div className="flex justify-start sm:justify-end">
              <Link
                href={`/super-admin/workspaces/${workspace.id}`}
                onClick={() => setLog(writeLog("open", workspace.name))}
                className="inline-flex min-h-9 items-center rounded-md border border-hairline px-2.5 text-[12px] text-ink/75 hover:bg-surface-muted"
              >
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="font-medium text-[13px] text-ink">
          Recent platform actions
        </h2>
        <p className="mt-1 text-[11.5px] text-ink/50">
          Append-only. There is no edit and no delete.
        </p>
        <ul className="mt-2 flex list-none flex-col gap-1 p-0">
          {log.length === 0 ? (
            <li className="text-[12px] text-ink/55">Nothing yet.</li>
          ) : (
            log.slice(0, 8).map((entry) => (
              <li
                key={`${entry.at}-${entry.line}`}
                className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink/70"
              >
                <span className="text-ink/45 tabular-nums">
                  {new Date(entry.at)
                    .toISOString()
                    .slice(0, 16)
                    .replace("T", " ")}
                </span>{" "}
                {entry.line}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export function ConsoleWorkspace({ id }: { id: string }) {
  const workspace = WORKSPACES.find((row) => row.id === id);
  const [log, setLog] = useState<Array<{ at: string; line: string }>>([]);
  const [suspended, setSuspended] = useState(false);
  const [rename, setRename] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    // Audit before showing content, never after. Reading and writing the log happens
    // after mount, so the route can still be prerendered.
    setLog(writeLog("open", workspace.name));
  }, [workspace]);

  if (!workspace) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-4 py-6">
        <h1 className="font-bold text-[20px] text-ink">
          That Workspace was not found.
        </h1>
        <Link
          href="/super-admin"
          className="mt-2 inline-flex text-[12.5px] text-ink/60 underline"
        >
          Back to the console
        </Link>
      </div>
    );
  }

  const memberCount = SPACES.filter((space) => !space.archived).length;
  const reportCount = SAMPLE_REPORTS.length;

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-6">
      <Link
        href="/super-admin"
        className="text-[12.5px] text-ink/60 hover:text-ink"
      >
        Back to the console
      </Link>

      <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-ink">
        Read-only support view. This is not the Workspace, and nothing here
        changes its data. Your visit was logged before this page rendered.
      </div>

      <header className="mt-4">
        <h1 className="font-bold text-[22px] text-ink tracking-[-0.03em]">
          {workspace.name}
        </h1>
        <p className="mt-1 text-[12.5px] text-ink/60">
          {planDisplay(workspace.plan, STATE[workspace.id] ?? "active")} ·{" "}
          {workspace.memberLimit === null
            ? "no member limit"
            : `${workspace.memberLimit} seats`}{" "}
          · {SAMPLE_PERIOD.label}
        </p>
      </header>

      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          ["Spaces", String(memberCount)],
          ["Reports this period", String(reportCount)],
          ["Location tagging", workspace.locationTagging ? "On" : "Off"],
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

      <section className="mt-6">
        <h2 className="font-medium text-[13.5px] text-ink">Plan</h2>
        <p className="mt-1 text-[12px] text-ink/55">
          Shown as the API returns it. The console never computes a price or a
          proration.
        </p>
        <p className="mt-2 text-[13px] text-ink">
          {planDisplay(workspace.plan, STATE[workspace.id] ?? "active")}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-medium text-[13.5px] text-ink">Address</h2>
        <p className="mt-1 text-[12px] text-ink/55">
          Renaming keeps the old address redirecting and refuses every reserved
          word.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            value={rename}
            onChange={(event) => setRename(event.target.value)}
            placeholder="new-address"
            aria-label="New Workspace address"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-hairline bg-surface px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
          />
          <button
            type="button"
            onClick={() => {
              const blocked = renameProblem(rename);
              if (blocked) {
                setProblem(blocked);
                return;
              }
              setProblem(null);
              setLog(writeLog("rename", workspace.name));
            }}
            className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
          >
            Rename
          </button>
        </div>
        {problem ? (
          <p className="mt-1 text-[12px] text-destructive">{problem}</p>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="font-medium text-[13.5px] text-ink">Support actions</h2>
        <p className="mt-1 text-[12px] text-ink/55">
          Suspending deletes nothing. Restoring puts the Workspace back as it
          was.
        </p>
        <button
          type="button"
          onClick={() => {
            const next = !suspended;
            setSuspended(next);
            setLog(writeLog(next ? "suspend" : "restore", workspace.name));
          }}
          className="mt-2 min-h-11 rounded-md border border-hairline px-3 text-[12.5px] text-ink/75"
        >
          {suspended ? "Restore Workspace" : "Suspend Workspace"}
        </button>
        {suspended ? (
          <p className="mt-2 text-[12px] text-warning">
            Suspended. Members see a suspended screen with no navigation behind
            it.
          </p>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="font-medium text-[13.5px] text-ink">This session</h2>
        <ul className="mt-2 flex list-none flex-col gap-1 p-0">
          {log.map((entry) => (
            <li
              key={`${entry.at}-${entry.line}`}
              className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink/70"
            >
              <span className="text-ink/45 tabular-nums">
                {new Date(entry.at).toISOString().slice(11, 19)}
              </span>{" "}
              {entry.line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
