"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CO_LEAGUE_ROSTER } from "@/data/members";
import type { Comment, Report } from "@/data/reports";
import type { Task } from "@/data/tasks";
import type { DiscussionViewer } from "@/lib/discussion";
import { canComment, followUpProblem, threadsFor } from "@/lib/discussion";

/**
 * The conversation on one Report. A reviewer opens a thread and may raise a follow-up
 * task from it; the author replies. Bodies are text, never markup.
 */
export function ReportDiscussion({
  report,
  viewer,
  readOnly,
  now,
  tasks,
  onComment,
  onCreateTask,
}: {
  report: Report;
  viewer: DiscussionViewer;
  readOnly: boolean;
  now: string;
  tasks: Task[];
  onComment: (comment: Comment) => void;
  onCreateTask: (task: Task) => void;
}) {
  const [body, setBody] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [raisingFor, setRaisingFor] = useState<Comment | null>(null);

  const threads = threadsFor(report, CO_LEAGUE_ROSTER);
  const nameOf = (membershipId: string) =>
    CO_LEAGUE_ROSTER.find((member) => member.membershipId === membershipId)
      ?.name ?? "Former member";

  const guard = canComment({ report, viewer, readOnly });
  const isAuthor = report.authorMembershipId === viewer.membershipId;

  useEffect(() => {
    setBody("");
    setProblem(null);
  }, [report.id]);

  return (
    <section className="mt-6">
      <h2 className="font-medium text-[14px] text-ink">Discussion</h2>
      <p className="mt-1 text-[12.5px] text-ink/60">
        {isAuthor
          ? "A reviewer starts a thread. You reply here."
          : "You can start a thread. The author replies."}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {threads.map((thread) => {
          const raised = tasks.filter((task) => task.reportId === report.id);
          return (
            <article
              key={thread.opener.id}
              className="rounded-lg border border-hairline p-3.5"
            >
              <p className="text-[12px] text-ink/50">
                {nameOf(thread.opener.authorMembershipId)} ·{" "}
                {thread.opener.at.slice(0, 10)}
              </p>
              <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink/85 leading-[1.65]">
                {thread.opener.body}
              </p>

              {thread.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="mt-3 border-hairline border-l-2 pl-3"
                >
                  <p className="text-[12px] text-ink/50">
                    {nameOf(reply.authorMembershipId)} · {reply.at.slice(0, 10)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink/85 leading-[1.65]">
                    {reply.body}
                  </p>
                </div>
              ))}

              {readOnly || isAuthor ? null : (
                <Button
                  variant="ghost"
                  onClick={() => setRaisingFor(thread.opener)}
                  className="mt-2 min-h-11 rounded-md px-2 text-[12px] text-ink/70"
                >
                  Raise a task from this
                </Button>
              )}

              {raised.length > 0 ? (
                <p className="mt-2 text-[11.5px] text-ink/45">
                  {raised.length} follow-up task{raised.length === 1 ? "" : "s"}{" "}
                  on this Report.
                </p>
              ) : null}
            </article>
          );
        })}

        {threads.length === 0 ? (
          <p className="rounded-lg border border-hairline border-dashed px-3.5 py-4 text-[13px] text-ink/60">
            No discussion yet.
          </p>
        ) : null}
      </div>

      {guard.allowed || !isAuthor ? (
        <div className="mt-4">
          <label
            className="block text-[12px] text-ink/60"
            htmlFor="comment-body"
          >
            {isAuthor ? "Reply" : "Start a thread"}
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-transparent bg-surface-muted px-3 py-2 text-[13px] text-ink outline-none focus-visible:border-ink/30"
          />
          {problem ? (
            <p className="mt-1 text-[12.5px] text-destructive">{problem}</p>
          ) : null}
          <Button
            disabled={!guard.allowed}
            title={guard.reason ?? undefined}
            onClick={() => {
              if (body.trim() === "") {
                setProblem("Write something before posting.");
                return;
              }
              onComment({
                id: `cmt_${report.id}_${Date.now()}`,
                reportId: report.id,
                authorMembershipId: viewer.membershipId,
                body: body.trim(),
                at: now,
                kind: "comment",
              });
              setBody("");
              setProblem(null);
            }}
            className="mt-2 min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
          >
            Post comment
          </Button>
          {guard.reason ? (
            <p className="mt-1 text-[11.5px] text-ink/45">{guard.reason}</p>
          ) : null}
        </div>
      ) : null}

      {raisingFor ? (
        <RaiseTask
          report={report}
          comment={raisingFor}
          viewer={viewer}
          now={now}
          onClose={() => setRaisingFor(null)}
          onCreate={(task) => {
            onCreateTask(task);
            setRaisingFor(null);
          }}
        />
      ) : null}
    </section>
  );
}

function RaiseTask({
  report,
  comment,
  viewer,
  now,
  onClose,
  onCreate,
}: {
  report: Report;
  comment: Comment;
  viewer: DiscussionViewer;
  now: string;
  onClose: () => void;
  onCreate: (task: Task) => void;
}) {
  const [title, setTitle] = useState(comment.body.slice(0, 80));
  const [assignee, setAssignee] = useState(report.authorMembershipId);
  const [dueAt, setDueAt] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Raise a task"
      className="mt-4 rounded-lg border border-hairline bg-popover p-3.5"
    >
      <h3 className="font-medium text-[13.5px] text-ink">
        Raise a follow-up task
      </h3>
      <p className="mt-1 text-[12px] text-ink/55">
        It appears on the board and beside this Report. Due dates are in the
        Workspace's timezone.
      </p>

      <label
        className="mt-3 block text-[12px] text-ink/60"
        htmlFor="task-title"
      >
        Title
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        />
      </label>

      <label
        className="mt-2 block text-[12px] text-ink/60"
        htmlFor="task-assignee"
      >
        Assignee
        <select
          id="task-assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        >
          {CO_LEAGUE_ROSTER.filter((member) => member.active).map((member) => (
            <option key={member.membershipId} value={member.membershipId}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-2 block text-[12px] text-ink/60" htmlFor="task-due">
        Due date
        <input
          id="task-due"
          type="date"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        />
      </label>

      {problem ? (
        <p className="mt-2 text-[12.5px] text-destructive">{problem}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="min-h-11 rounded-md px-3 text-[12.5px] text-ink/70"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            const blocked = followUpProblem({ title, assignee, dueAt, now });
            if (blocked) {
              setProblem(blocked);
              return;
            }
            onCreate({
              id: `task_${Date.now()}`,
              reportId: report.id,
              title: title.trim(),
              assigneeMembershipId: assignee,
              assignedByMembershipId: viewer.membershipId,
              dueAt,
              status: "todo",
              completionNote: null,
              completionFile: null,
              completedAt: null,
              createdAt: now,
            });
          }}
          className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
        >
          Raise task
        </Button>
      </div>
    </div>
  );
}
