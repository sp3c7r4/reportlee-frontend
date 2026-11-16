import type { User, Workspace } from "./viewer.ts";

/* @info - Sample records kept for two places outside the Workspaces slice: the Super Admin console list and the simulated provider sign-in. No dashboard screen reads them. */

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
