/**
 * The JSON shapes the Workspace API sends, mirrored by hand from the backend's
 * "Shared JSON shapes" (openspec/changes/workspaces-people/design.md).
 *
 * Every id is a string. A change here is a change to the backend's DTOs, in the
 * same task.
 */

import type { RosterMember, SpaceSummary } from "../data/members.ts";
import type { Comment, Report } from "../data/reports.ts";
import type { Membership, Workspace } from "../data/viewer.ts";
import type { Role } from "./nav.ts";
import type { MissingRow } from "./review.ts";
import type { Schedule } from "./settings.ts";

export type { Membership, Workspace };

/** Spaces as the API sends them: the screens' shape plus the active member count. */
export type ApiSpace = SpaceSummary & { memberCount: number };

/** A roster row. `email` is present only when the caller is an Admin. */
export type ApiMember = RosterMember & {
  spaceId: string | null;
  joinedAt: string;
  email?: string;
};

export type ApiInvitation = {
  id: string;
  email: string;
  role: Role;
  space: string | null;
  spaceId: string | null;
  sentAt: string;
  invitedByMembershipId: string;
  expired: boolean;
};

/** Only the create call carries the link, once. The list never does. */
export type CreatedInvitation = ApiInvitation & { inviteUrl: string };

export type MeMemberships = {
  user: { id: string; name: string; email: string };
  memberships: Membership[];
  workspaces: Workspace[];
  lastWorkspaceId: string | null;
};

export type SlugAvailability =
  | { available: true }
  | { available: false; reason: "taken" | "reserved" | "invalid" };

export type InvitationPreview = {
  workspaceName: string;
  role: Role;
  spaceName: string | null;
  /** Masked by the server, for example `n***@example.com`. */
  email: string;
};

export type KpiRow = { name: string; unit: string };

/** The two `error.code` values the frontend branches on, never the message text. */
export const CODE_EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
export const CODE_INVITE_EMAIL_MISMATCH = "INVITE_EMAIL_MISMATCH";

/**
 * The Schedule as the API sends it (openspec/changes/reports/design.md, `ApiSchedule`).
 * `effectiveFrom` is null for the baseline version. `pending` is a change that has not
 * started yet.
 */
export type ApiSchedule = Schedule & {
  effectiveFrom: string | null;
  pending: (Schedule & { effectiveFrom: string }) | null;
};

/** The PUT answer adds the instant the new version starts. */
export type ApiScheduleSaved = ApiSchedule & { appliesFrom: string };

/** Report error codes. The screens branch on these, never on the message text. */
export const CODE_NO_SPACE = "NO_SPACE";
export const CODE_PERIOD_CLOSED = "PERIOD_CLOSED";
export const CODE_PERIOD_NOT_OPEN = "PERIOD_NOT_OPEN";
export const CODE_EDIT_WINDOW_CLOSED = "EDIT_WINDOW_CLOSED";
export const CODE_REPORT_APPROVED = "REPORT_APPROVED";
export const CODE_REPORT_SEEN = "REPORT_SEEN";
export const CODE_WORKSPACE_READ_ONLY = "WORKSPACE_READ_ONLY";
export const CODE_ALREADY_SUBMITTED = "ALREADY_SUBMITTED";
export const CODE_NOT_SUBMITTED = "NOT_SUBMITTED";
export const CODE_NOT_AUTHOR = "NOT_AUTHOR";
export const CODE_ADMIN_CANNOT_AUTHOR = "ADMIN_CANNOT_AUTHOR";

/** Review error codes (openspec/changes/review/design.md). Screens branch on these. */
export const CODE_NOT_REVIEWER = "NOT_REVIEWER";
export const CODE_NOT_AUTHOR_CANNOT_DECIDE = "NOT_AUTHOR_CANNOT_DECIDE";
export const CODE_NOT_APPROVED = "NOT_APPROVED";
export const CODE_REVIEWER_MUST_START = "REVIEWER_MUST_START";
export const CODE_NOT_ASSIGNEE = "NOT_ASSIGNEE";
export const CODE_VIEW_NOT_ALLOWED = "VIEW_NOT_ALLOWED";
export const CODE_NOT_FOUND = "NOT_FOUND";
export const CODE_INTERNAL = "INTERNAL";

/** A comment as the server sends it: `taskId` is null when no task came with it. */
export type ApiComment = Omit<Comment, "taskId" | "attachments"> & {
  taskId: string | null;
};

/** A Report as the server sends it once comments can carry a task id. */
export type ApiReport = Omit<Report, "comments"> & { comments: ApiComment[] };

export type ApiSeen = {
  firstSeenAt: string | null;
  windowStartedAt: string | null;
};

export type ApiQueue = { reports: ApiReport[]; missing: MissingRow[] };

export type ApiBulkResult = {
  approved: string[];
  skipped: { id: string; code: string }[];
};

/** `type` also holds `system` and `account` from before this slice. */
export type ApiNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  workspaceId: string | null;
  href: string | null;
};
