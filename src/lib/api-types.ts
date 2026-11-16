/**
 * The JSON shapes the Workspace API sends, mirrored by hand from the backend's
 * "Shared JSON shapes" (openspec/changes/workspaces-people/design.md).
 *
 * Every id is a string. A change here is a change to the backend's DTOs, in the
 * same task.
 */

import type { RosterMember, SpaceSummary } from "../data/members.ts";
import type { Membership, Workspace } from "../data/viewer.ts";
import type { Role } from "./nav.ts";

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
