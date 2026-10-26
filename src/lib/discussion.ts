import type { RosterMember } from "../data/members";
import type { Comment, Report } from "../data/reports";
import type { Role } from "./nav";

/**
 * Discussion on one Report, with no React.
 *
 * A reviewer of the Report starts a thread; the author replies to it; nobody else
 * joins. That is a product rule, and the server repeats it.
 */

export type DiscussionViewer = {
  membershipId: string;
  role: Role;
  space: string | null;
};

export type CommentGuard = { allowed: boolean; reason: string | null };

export function canComment(input: {
  report: Report;
  viewer: DiscussionViewer;
  readOnly: boolean;
  /** Starting a thread is the reviewer's right; a reply is the author's. */
  starting?: boolean;
  body?: string;
}): CommentGuard {
  const { report, viewer } = input;

  if (input.readOnly) {
    return {
      allowed: false,
      reason: "This Workspace is read-only, so no comment can be added.",
    };
  }
  if (input.body !== undefined && input.body.trim() === "") {
    return { allowed: false, reason: "Write something before posting." };
  }

  const isAuthor = report.authorMembershipId === viewer.membershipId;
  const isReviewer = viewer.role === "admin" || viewer.role === "head";

  if (isAuthor) {
    if (input.starting) {
      return {
        allowed: false,
        reason: "Only a reviewer starts a thread. You can reply to one.",
      };
    }
    return { allowed: true, reason: null };
  }
  if (isReviewer) return { allowed: true, reason: null };

  return {
    allowed: false,
    reason: "Only the author and the reviewers of this Report can comment.",
  };
}

export type Thread = {
  opener: Comment;
  replies: Comment[];
};

/**
 * One thread per reviewer comment, replies under it. Decision comments are the reason
 * banner's property, not the discussion's, so they stay out.
 */
export function threadsFor(report: Report, _roster: RosterMember[]): Thread[] {
  const author = report.authorMembershipId;
  const comments = (report.comments ?? []).filter(
    (comment) => comment.kind === "comment",
  );

  const threads: Thread[] = [];
  for (const comment of comments) {
    const isReply = comment.authorMembershipId === author && threads.length > 0;
    if (isReply) threads[threads.length - 1].replies.push(comment);
    else threads.push({ opener: comment, replies: [] });
  }
  return threads;
}

/** Escaped text in, escaped text out: a comment body is never markup. */
export function commentBodies(report: Report): string[] {
  return (report.comments ?? [])
    .filter((comment) => comment.kind === "comment")
    .map((comment) => comment.body);
}

export function authorOf(
  report: Report,
  roster: RosterMember[],
): RosterMember | null {
  return (
    roster.find(
      (member) => member.membershipId === report.authorMembershipId,
    ) ?? null
  );
}

export function followUpProblem(input: {
  title: string;
  assignee: string;
  dueAt: string;
  now: string;
}): string | null {
  if (input.title.trim() === "") return "Give the task a title.";
  if (input.assignee === "") return "Assign the task to somebody.";
  if (input.dueAt.trim() === "") return "A due date is required.";
  if (Date.parse(input.dueAt) < Date.parse(input.now.slice(0, 10))) {
    return `Choose today or later. ${input.now.slice(0, 10)} is the earliest allowed.`;
  }
  return null;
}
