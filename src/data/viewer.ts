import type { Role } from "@/lib/nav";

/**
 * The types of the signed-in frame, and nothing else.
 *
 * The records themselves come from `GET /me/memberships`. Hiding a navigation item is
 * tidiness; whether a person may open a page is decided by the server, and nothing in
 * the address bar, a cookie or storage may choose the role.
 *
 * The shape follows ADR 0001: a User is one global identity, and the role, Workspace
 * and Space live on a Membership.
 */

export type Plan = "starter" | "team" | "enterprise";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  plan: Plan;
  /** The plan's member limit. Team has none. */
  memberLimit: number | null;
  aiFeatures: boolean;
  /** Deadlines are shown where the Workspace is, not where the reader is. */
  timeZone: string;
  /** Off: the report form has no location field at all. */
  locationTagging: boolean;
  /** Read-only Workspaces keep their reports and accept no new ones. */
  readOnly: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Membership = {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
  /** The Space this Membership belongs to. A Workspace Admin belongs to none. */
  space: string | null;
  /** The id of that Space, when the API sent it. */
  spaceId?: string | null;
};

export const ROLE_LABEL: Record<Role, string> = {
  staff: "Staff",
  head: "Head of Space",
  admin: "Workspace Admin",
};
