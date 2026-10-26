/**
 * A Workspace roster, for the rules that need to know who is who.
 *
 * Not a screen's data: the review queue, the event stream and the member table all ask
 * this about a Space. Nothing here is real, and nothing here is a guard: whether a
 * person may review or invite is decided by the server once it exists.
 */

import type { Role } from "../lib/nav.ts";

export type RosterMember = {
  membershipId: string;
  name: string;
  role: Role;
  /** The Space the Membership reports into. Admins belong to none. */
  space: string | null;
  active: boolean;
};

export const CO_LEAGUE_ROSTER: RosterMember[] = [
  {
    membershipId: "mem_head_platform",
    name: "Ifeoma Balogun",
    role: "head",
    space: "Platform",
    active: true,
  },
  {
    membershipId: "mem_staff",
    name: "Amara Okonkwo",
    role: "staff",
    space: "Platform",
    active: true,
  },
  {
    membershipId: "mem_tunde",
    name: "Tunde Adeyemi",
    role: "staff",
    space: "Platform",
    active: true,
  },
  {
    membershipId: "mem_zainab",
    name: "Zainab Yusuf",
    role: "staff",
    space: "Field Operations",
    active: true,
  },
  {
    membershipId: "mem_emeka",
    name: "Emeka Nwosu",
    role: "staff",
    space: "Field Operations",
    active: true,
  },
  // Programmes has no Head, so its Reports belong to the Admins.
  {
    membershipId: "mem_halima",
    name: "Halima Sani",
    role: "staff",
    space: "Programmes",
    active: true,
  },
  {
    membershipId: "mem_admin",
    name: "Amara Admin",
    role: "admin",
    space: null,
    active: true,
  },
  {
    membershipId: "mem_admin_two",
    name: "Daniel Osei",
    role: "admin",
    space: null,
    active: true,
  },
];

export type SpaceSummary = {
  id: string;
  name: string;
  /** The Membership that heads it, or null when nobody does. */
  headMembershipId: string | null;
  archived: boolean;
  /** Suggested KPI fields. Prefilled when a Report starts, never required. */
  kpiTemplate: Array<{ name: string; unit: string }>;
};

export const SPACES: SpaceSummary[] = [
  {
    id: "sp_platform",
    name: "Platform",
    headMembershipId: "mem_head_platform",
    archived: false,
    kpiTemplate: [
      { name: "Reports reviewed", unit: "count" },
      { name: "Incidents closed", unit: "count" },
      { name: "Training sessions", unit: "sessions" },
    ],
  },
  // No Head: its Reports belong to the Workspace Admins.
  {
    id: "sp_programmes",
    name: "Programmes",
    headMembershipId: null,
    archived: false,
    kpiTemplate: [
      { name: "Beneficiaries reached", unit: "people" },
      { name: "Visits completed", unit: "count" },
    ],
  },
  {
    id: "sp_field",
    name: "Field Operations",
    headMembershipId: null,
    archived: false,
    kpiTemplate: [{ name: "Sites inspected", unit: "count" }],
  },
  {
    id: "sp_legacy",
    name: "Legacy Systems",
    headMembershipId: null,
    archived: true,
    kpiTemplate: [],
  },
];

export type Invitation = {
  id: string;
  email: string;
  role: Role;
  space: string | null;
  sentAt: string;
  invitedByMembershipId: string;
  expired: boolean;
};

/** Seven days, an assumption: no document fixes the window. */
export const INVITATION_DAYS = 7;

export const INVITATIONS: Invitation[] = [
  {
    id: "inv_1",
    email: "new.starter@example.com",
    role: "staff",
    space: "Platform",
    sentAt: "2026-10-25T09:00:00.000Z",
    invitedByMembershipId: "mem_admin",
    expired: false,
  },
  {
    id: "inv_2",
    email: "new.head@example.com",
    role: "head",
    space: "Programmes",
    sentAt: "2026-10-18T09:00:00.000Z",
    invitedByMembershipId: "mem_admin",
    expired: false,
  },
];
