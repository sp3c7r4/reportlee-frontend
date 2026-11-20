/**
 * The comment call, and the one place a server comment becomes the screens' `Comment`.
 * Plain functions, no React. The server decides who may comment; this carries the call.
 * Endpoint E14 of openspec/changes/review/design.md.
 */

import type { Comment, Report } from "../data/reports.ts";
import type { Priority } from "../data/tasks.ts";
import { type ApiResult, apiCall } from "./api.ts";
import type { ApiComment, ApiReport } from "./api-types.ts";

/** The server sends `taskId: null` for a comment with no task. The screens say undefined. */
export function commentFrom(comment: ApiComment): Comment {
  const { taskId, ...rest } = comment;
  return taskId === null || taskId === undefined ? rest : { ...rest, taskId };
}

/** A Report whose comments are in the screens' shape. Nothing else changes. */
export function reportFrom(report: ApiReport | Report): Report {
  return {
    ...report,
    comments: ((report.comments ?? []) as ApiComment[]).map(commentFrom),
  } as Report;
}

export type FollowUp = {
  title: string;
  assigneeMembershipId: string;
  /** YYYY-MM-DD. */
  dueAt: string;
  priority: Priority;
};

export type CommentInput = { body: string; followUp?: FollowUp };

export async function postComment(
  reportId: string,
  input: CommentInput,
): Promise<ApiResult<Comment>> {
  const body = {
    body: input.body.trim(),
    ...(input.followUp
      ? {
          followUp: {
            title: input.followUp.title.trim(),
            assigneeMembershipId: input.followUp.assigneeMembershipId,
            dueAt: input.followUp.dueAt,
            priority: input.followUp.priority,
          },
        }
      : {}),
  };
  const result = await apiCall<ApiComment>(
    "POST",
    `/reports/${encodeURIComponent(reportId)}/comments`,
    body,
    "We could not post that comment. Try again.",
  );
  if (!result.ok) return result;
  return { ...result, data: commentFrom(result.data) };
}
