import type { Membership, Workspace } from "./viewer.ts";

/**
 * The lead shapes, declared once, plus the sample rows the two lead screens read.
 *
 * A captured lead is scoped to a Workspace and a Space the same way a Report is, so
 * `workspaceId` and `space` are read from `src/data/viewer.ts` rather than inventing a
 * second idea of a Workspace or a Space. Nothing here is a rule: the scope, the public
 * capture token and the rate limit are all decided by the server once it exists. The
 * token below is a sample constant, never a real security boundary.
 */

/* @info - Re-exported so a screen that renders a lead can name the Workspace and Space
   types it is scoped by without a second import line. */
export type { Membership, Workspace };

/** An explicit opt-in to follow-up contact, with the moment it was given. */
export type LeadConsent = {
  given: boolean;
  /** ISO instant, the capture time, so a later audit knows when consent was given. */
  at: string;
};

/**
 * A lead captured at an event booth. `workspaceId` and `space` mirror a Report's scope
 * and are resolved from the capture token, never chosen by the public caller.
 *
 * `email` and `phone` are each nullable: a lead needs at least one, not both.
 */
export type CapturedLead = {
  id: string;
  workspaceId: Workspace["id"];
  /** The Space this lead belongs to, like `Membership.space`. */
  space: NonNullable<Membership["space"]>;
  eventName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  notes: string | null;
  consent: LeadConsent;
  /** ISO instant the lead was captured. */
  capturedAt: string;
};

/**
 * The wire shape the public form posts. It carries the captured fields and consent and
 * never a `workspaceId` or a `space`: the server resolves both from the capture token in
 * the path, so an unauthenticated caller cannot name its own target Workspace.
 */
export type LeadDraft = {
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  notes: string | null;
  consent: LeadConsent;
};

/**
 * What a public capture link resolves to: which Workspace, which Space and which event.
 * This is the minimal context the public screen may show. It carries no lead data.
 */
export type EventContext = {
  workspaceId: Workspace["id"];
  workspaceName: string;
  space: NonNullable<Membership["space"]>;
  eventName: string;
};

/**
 * The sample token the public form is reached by in this build. Visiting
 * `/capture/<SAMPLE_CAPTURE_TOKEN>` resolves the one event context below. Any other
 * token reaches the invalid-link state. This is a demo constant, not a real token: it
 * is not a scope, a rate limit or a CREATE-only boundary, and nothing claims it is.
 */
export const SAMPLE_CAPTURE_TOKEN = "booth-arthurite-techexpo-2026";

/** The one event context the sample token resolves to while there is no backend. */
export const SAMPLE_EVENT_CONTEXT: EventContext = {
  workspaceId: "ws_arthurite",
  workspaceName: "Arthurite Integrated Group",
  space: "Platform",
  eventName: "Lagos Tech Expo 2026",
};

/**
 * Sample captured leads across two events and two Spaces, so the internal list, its
 * search, its event and Space filters and the CSV export are all reachable without a
 * backend. The fields are fake. One notes value carries a comma, one a quote and one a
 * newline, so the CSV quoting has something real to serialize.
 */
export const SAMPLE_LEADS: CapturedLead[] = [
  {
    id: "lead_001",
    workspaceId: "ws_arthurite",
    space: "Platform",
    eventName: "Lagos Tech Expo 2026",
    fullName: "Chidi Okeke",
    email: "chidi@example.com",
    phone: "+234 801 234 5678",
    company: "Lagos Analytics",
    jobTitle: "Head of Data",
    notes: "Wants a demo in November, and a follow up call.",
    consent: { given: true, at: "2026-10-31T10:15:00.000Z" },
    capturedAt: "2026-10-31T10:15:00.000Z",
  },
  {
    id: "lead_002",
    workspaceId: "ws_arthurite",
    space: "Platform",
    eventName: "Lagos Tech Expo 2026",
    fullName: "Ada Nwosu",
    email: "ada@example.com",
    phone: null,
    company: "Brightpath Consulting",
    jobTitle: "Operations Lead",
    notes: 'Said the pricing page was "very clear".',
    consent: { given: true, at: "2026-10-31T11:02:00.000Z" },
    capturedAt: "2026-10-31T11:02:00.000Z",
  },
  {
    id: "lead_003",
    workspaceId: "ws_arthurite",
    space: "Growth",
    eventName: "Lagos Tech Expo 2026",
    fullName: "Tunde Balogun",
    email: null,
    phone: "+234 (0) 802 111 2233",
    company: "Northwind Media",
    jobTitle: "Marketing Manager",
    notes: "Interested in the analytics module.\nNeeds sign off from finance.",
    consent: { given: true, at: "2026-10-31T13:40:00.000Z" },
    capturedAt: "2026-10-31T13:40:00.000Z",
  },
  {
    id: "lead_004",
    workspaceId: "ws_arthurite",
    space: "Growth",
    eventName: "Abuja Founders Meetup",
    fullName: "Zainab Yusuf",
    email: "zainab@example.com",
    phone: "+234 803 999 0001",
    company: "Sahel Ventures",
    jobTitle: "Partner",
    notes: null,
    consent: { given: true, at: "2026-11-05T09:30:00.000Z" },
    capturedAt: "2026-11-05T09:30:00.000Z",
  },
  {
    id: "lead_005",
    workspaceId: "ws_arthurite",
    space: "Platform",
    eventName: "Abuja Founders Meetup",
    fullName: "Emeka Obi",
    email: "emeka@example.com",
    phone: null,
    company: null,
    jobTitle: "Founder",
    notes: "Early stage, revisit next quarter.",
    consent: { given: true, at: "2026-11-05T10:12:00.000Z" },
    capturedAt: "2026-11-05T10:12:00.000Z",
  },
];
