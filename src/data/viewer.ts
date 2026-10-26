import type { Role } from "@/lib/nav";

/**
 * Sample data for the signed-in frame.
 *
 * None of this is real, and none of it guards anything. Hiding a navigation item is
 * tidiness; whether a person may open a page is decided by the server once it exists.
 * `ACTIVE_MEMBERSHIP_ID` picks which Membership is signed in on load, and nothing in
 * the address bar, a cookie or storage may choose the role.
 *
 * The shape follows ADR 0001: a User is one global identity, and the role, Workspace
 * and Space live on a Membership. One person holds all three Memberships here, so the
 * Workspace switcher has something real to switch between.
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
};

export const WORKSPACES: Workspace[] = [
  {
    id: "ws_arthurite",
    name: "Arthurite Integrated Group",
    slug: "arthurite",
    memberCount: 24,
    plan: "team",
    memberLimit: null,
    aiFeatures: true,
    timeZone: "Africa/Lagos",
    locationTagging: true,
    readOnly: false,
  },
  {
    id: "ws_northline",
    name: "Northline Logistics",
    slug: "northline",
    memberCount: 12,
    plan: "team",
    memberLimit: null,
    aiFeatures: true,
    timeZone: "Africa/Lagos",
    locationTagging: false,
    readOnly: false,
  },
  {
    id: "ws_meridian",
    name: "Meridian Health Trust",
    slug: "meridian",
    memberCount: 6,
    plan: "starter",
    memberLimit: 10,
    aiFeatures: false,
    timeZone: "Africa/Lagos",
    locationTagging: false,
    readOnly: true,
  },
  {
    id: "ws_kano",
    name: "Kano Programme Office",
    slug: "kano",
    memberCount: 7,
    plan: "starter",
    memberLimit: 10,
    aiFeatures: false,
    timeZone: "Africa/Lagos",
    locationTagging: false,
    readOnly: false,
  },
];

export const USER: User = {
  id: "usr_amara",
  name: "Amara Okonkwo",
  email: "amara@example.com",
};

export const MEMBERSHIPS: Membership[] = [
  {
    id: "mem_staff",
    userId: USER.id,
    workspaceId: "ws_arthurite",
    role: "staff",
    space: "Platform",
  },
  {
    id: "mem_head",
    userId: USER.id,
    workspaceId: "ws_northline",
    role: "head",
    space: "Logistics",
  },
  // The Admin Membership sits in the Starter Workspace with AI off, so the usage bar
  // and the greyed Assistant are both visible without switching.
  {
    id: "mem_admin",
    userId: USER.id,
    workspaceId: "ws_kano",
    role: "admin",
    space: null,
  },
  // A read-only Workspace, so the "no Edit and no Delete" rule has something to show.
  {
    id: "mem_meridian_head",
    userId: USER.id,
    workspaceId: "ws_meridian",
    role: "head",
    space: "Clinical",
  },
];

/** The only thing that chooses the role. Change this line to develop as another role. */
export const ACTIVE_MEMBERSHIP_ID = "mem_admin";

export function membershipById(id: string): Membership {
  return (
    MEMBERSHIPS.find((membership) => membership.id === id) ?? MEMBERSHIPS[0]
  );
}

export function workspaceFor(membership: Membership): Workspace {
  return (
    WORKSPACES.find((workspace) => workspace.id === membership.workspaceId) ??
    WORKSPACES[0]
  );
}

export function membershipsForUser(userId: string): Membership[] {
  return MEMBERSHIPS.filter((membership) => membership.userId === userId);
}

export const ROLE_LABEL: Record<Role, string> = {
  staff: "Staff",
  head: "Head of Space",
  admin: "Workspace Admin",
};
