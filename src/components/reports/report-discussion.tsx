"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Comment, Report } from "@/data/reports";
import type { Priority } from "@/data/tasks";
import type { ApiMember } from "@/lib/api-types";
import type { DiscussionViewer } from "@/lib/discussion";
import { canComment, followUpProblem, threadsFor } from "@/lib/discussion";
import { type FollowUp, postComment } from "@/lib/discussion-api";
import { reportErrorMessage } from "@/lib/report-errors";

/**
 * The conversation on one Report. A reviewer opens a thread and may attach a follow-up
 * task to the comment; the author replies. Bodies are text, never markup. The server
 * decides who may post and sanitizes what is posted.
 */
export function ReportDiscussion({
  report,
  viewer,
  readOnly,
  now,
  roster,
  onPosted,
}: {
  report: Report;
  viewer: DiscussionViewer;
  readOnly: boolean;
  now: string;
  roster: ApiMember[];
  onPosted: (comment: Comment, raisedTask: boolean) => void;
}) {
  const [body, setBody] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withTask, setWithTask] = useState(false);

  const threads = threadsFor(report, roster);
  const nameOf = (membershipId: string) =>
    roster.find((member) => member.membershipId === membershipId)?.name ??
    "Former member";

  const guard = canComment({ report, viewer, readOnly });
  const isAuthor = report.authorMembershipId === viewer.membershipId;
  /* @info - The author replies. Until someone else has written, there is nothing to
     reply to, and the server refuses a start with REVIEWER_MUST_START. */
  const spoken = report.comments.some(
    (comment) => comment.authorMembershipId !== report.authorMembershipId,
  );
  const showForm = isAuthor ? spoken && guard.allowed : true;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the form resets when the report changes
  useEffect(() => {
    setBody("");
    setProblem(null);
    setWithTask(false);
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
        {threads.map((thread) => (
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
            {thread.opener.taskId ? (
              <p className="mt-2 text-[11.5px] text-ink/45">
                A follow-up task came with this comment.
              </p>
            ) : null}

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
          </article>
        ))}

        {threads.length === 0 ? (
          <p className="rounded-lg border border-hairline border-dashed px-3.5 py-4 text-[13px] text-ink/60">
            No discussion yet.
          </p>
        ) : null}
      </div>

      {showForm ? (
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

          {isAuthor || readOnly ? null : (
            <Button
              variant="ghost"
              onClick={() => setWithTask((current) => !current)}
              aria-pressed={withTask}
              className="mt-1 min-h-11 rounded-md px-2 text-[12px] text-ink/70"
            >
              {withTask ? "Remove the follow-up task" : "Add a follow-up task"}
            </Button>
          )}

          {withTask ? (
            <FollowUpFields
              body={body}
              viewer={viewer}
              report={report}
              roster={roster}
              now={now}
              busy={busy}
              onSend={async (followUp) => {
                await send(followUp);
              }}
              problem={problem}
              setProblem={setProblem}
            />
          ) : (
            <>
              {problem ? (
                <p role="alert" className="mt-1 text-[12.5px] text-destructive">
                  {problem}
                </p>
              ) : null}
              <Button
                disabled={!guard.allowed || busy}
                title={guard.reason ?? undefined}
                onClick={() => void send()}
                className="mt-2 min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
              >
                {busy ? "Posting" : "Post comment"}
              </Button>
            </>
          )}
          {guard.reason ? (
            <p className="mt-1 text-[11.5px] text-ink/45">{guard.reason}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  async function send(followUp?: FollowUp) {
    if (body.trim() === "") {
      setProblem("Write something before posting.");
      return;
    }
    setBusy(true);
    setProblem(null);
    const result = await postComment(report.id, { body, followUp });
    setBusy(false);
    if (!result.ok) {
      /* @info - Field errors sit under their field names, so the first one is shown. */
      const field = result.fields ? Object.values(result.fields)[0] : undefined;
      setProblem(field ?? reportErrorMessage(result));
      return;
    }
    setBody("");
    setWithTask(false);
    onPosted(result.data, followUp !== undefined);
  }
}

function FollowUpFields({
  body,
  viewer,
  report,
  roster,
  now,
  busy,
  onSend,
  problem,
  setProblem,
}: {
  body: string;
  viewer: DiscussionViewer;
  report: Report;
  roster: ApiMember[];
  now: string;
  busy: boolean;
  onSend: (followUp: FollowUp) => Promise<void>;
  problem: string | null;
  setProblem: (message: string | null) => void;
}) {
  /* @info - The server accepts an active Staff or Head of this Workspace, never the
     person assigning. The Report's author is the usual choice, so it is the default. */
  const options = useMemo(
    () =>
      roster.filter(
        (member) =>
          member.active &&
          member.role !== "admin" &&
          member.membershipId !== viewer.membershipId,
      ),
    [roster, viewer.membershipId],
  );
  const [title, setTitle] = useState(() => body.trim().slice(0, 80));
  const [assignee, setAssignee] = useState(
    options.find((member) => member.membershipId === report.authorMembershipId)
      ?.membershipId ??
      options[0]?.membershipId ??
      "",
  );
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  return (
    <div className="mt-2 rounded-lg border border-hairline bg-popover p-3.5">
      <h3 className="font-medium text-[13.5px] text-ink">
        Follow-up task with this comment
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
          {options.map((member) => (
            <option key={member.membershipId} value={member.membershipId}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <label
        className="mt-2 block text-[12px] text-ink/60"
        htmlFor="task-priority"
      >
        Priority
        <select
          id="task-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
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
        <p role="alert" className="mt-2 text-[12.5px] text-destructive">
          {problem}
        </p>
      ) : null}

      <Button
        disabled={busy}
        onClick={() => {
          const blocked = followUpProblem({ title, assignee, dueAt, now });
          if (blocked) {
            setProblem(blocked);
            return;
          }
          void onSend({
            title,
            assigneeMembershipId: assignee,
            dueAt,
            priority,
          });
        }}
        className="mt-3 min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
      >
        {busy ? "Posting" : "Post comment and raise task"}
      </Button>
    </div>
  );
}
