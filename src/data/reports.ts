import type { Role } from "../lib/nav.ts";
import type { ReportStatus, SubmissionStatus } from "../lib/status.ts";

/**
 * The report shapes, declared once, plus the sample rows the first screen reads.
 *
 * Nothing here is a rule. The single report per period, the deadline and "already
 * submitted" are all decided by the server once it exists; locally they are derived
 * from these samples so the screen has something honest to render.
 *
 * `authorMembershipId` names whose draft this is on this device. It is never sent:
 * the API reads the Membership from the token, so a caller cannot name someone else.
 */

export type ReportingPeriod = {
  id: string;
  label: string;
  /** ISO instants. The deadline is shown in the Workspace's timezone. */
  startsAt: string;
  endsAt: string;
  dueAt: string;
};

export type KpiTemplateField = {
  name: string;
  unit: string;
};

export type KpiEntry = {
  name: string;
  unit: string;
  /** null is "not provided". 0 is a measurement. */
  value: number | null;
};

export type Attachment = {
  name: string;
  size: number;
  type: string;
  /** Always false in this build: nothing leaves the machine. */
  uploaded: boolean;
};

/** Captured by the browser, never typed. Accuracy is metres. */
export type ReportLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type ReportDraft = {
  id: string;
  periodId: string;
  authorMembershipId: string;
  accomplishments: string;
  challenges: string;
  plans: string;
  kpis: KpiEntry[];
  attachments: Attachment[];
  taggedMembershipIds: string[];
  location: ReportLocation | null;
  submissionStatus: SubmissionStatus;
  reviewStatus: ReportStatus;
  updatedAt: string;
};

/** A colleague who can be tagged. The address is shown to Workspace Admins only. */
export type Colleague = {
  membershipId: string;
  name: string;
  email: string;
  space: string;
};

/**
 * One "now" for the whole screen, so the on-time case cannot drift between renders.
 * Move it past `SAMPLE_PERIOD.dueAt` to reach the late case; nothing in the address
 * bar or a cookie may select the state.
 */
export const SAMPLE_NOW = "2026-10-26T15:30:00.000Z";

export const SAMPLE_PERIOD: ReportingPeriod = {
  id: "per_2026_10_19",
  label: "Week of 19 October",
  startsAt: "2026-10-19T00:00:00.000Z",
  endsAt: "2026-10-25T23:59:59.000Z",
  dueAt: "2026-10-26T17:00:00.000Z",
};

/**
 * Late submissions stay open for a week after the deadline, which is what makes a
 * draft survive the deadline instead of being stranded. The real window is a server
 * rule; this constant only decides when the screen says "no open period".
 */
export const SUBMISSION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const SAMPLE_KPI_TEMPLATE: KpiTemplateField[] = [
  { name: "Reports reviewed", unit: "count" },
  { name: "Incidents closed", unit: "count" },
  { name: "Training sessions", unit: "sessions" },
];

export const COLLEAGUES: Colleague[] = [
  {
    membershipId: "mem_ifeoma",
    name: "Ifeoma Balogun",
    email: "ifeoma@example.com",
    space: "Platform",
  },
  {
    membershipId: "mem_tunde",
    name: "Tunde Adeyemi",
    email: "tunde@example.com",
    space: "Platform",
  },
  {
    membershipId: "mem_zainab",
    name: "Zainab Yusuf",
    email: "zainab@example.com",
    space: "Field Operations",
  },
  {
    membershipId: "mem_emeka",
    name: "Emeka Nwosu",
    email: "emeka@example.com",
    space: "Field Operations",
  },
  {
    membershipId: "mem_halima",
    name: "Halima Sani",
    email: "halima@example.com",
    space: "Programmes",
  },
  {
    membershipId: "mem_daniel",
    name: "Daniel Osei",
    email: "daniel@example.com",
    space: "Programmes",
  },
  {
    membershipId: "mem_grace",
    name: "Grace Achieng",
    email: "grace@example.com",
    space: "Platform",
  },
  {
    membershipId: "mem_musa",
    name: "Musa Bello",
    email: "musa@example.com",
    space: "Field Operations",
  },
];

/**
 * The Membership whose report is already in for the sample period. Switching to
 * Northline Logistics in the Workspace switcher reaches the already-submitted state;
 * no address bar or cookie is involved.
 */
export const SAMPLE_SUBMITTED_MEMBERSHIP_ID = "mem_head";

/* ---------------------------------------------------------------------------------
 * A submitted Report: the draft's content plus the two clocks, the revisions and the
 * record. The revision list is what makes an edit auditable; the clocks are what make
 * Delete and the edit window answerable.
 * -------------------------------------------------------------------------------*/

/** What the Report held before an edit. Kept so the page can say what changed. */
export type RevisionContent = {
  accomplishments: string;
  challenges: string;
  plans: string;
  kpis: KpiEntry[];
  attachments: Attachment[];
  taggedMembershipIds: string[];
  location: ReportLocation | null;
};

export type Revision = {
  at: string;
  previous: RevisionContent;
};

export type ReportEventKind =
  | "submitted"
  | "edited"
  | "seen"
  | "approved"
  | "rejected"
  | "reopened";

export type ReportEvent = {
  kind: ReportEventKind;
  at: string;
  actorMembershipId: string;
};

export type CommentKind = "comment" | "decision";

/**
 * A decision's reason IS a comment: one sentence, one home. The Report page, the
 * timeline and the author's banner all read it from here.
 */
export type Comment = {
  id: string;
  reportId: string;
  authorMembershipId: string;
  body: string;
  at: string;
  kind: CommentKind;
  taskId?: string;
  attachments?: Attachment[];
};

export type Report = ReportDraft & {
  submittedAt: string;
  /** Permanent once set. The only thing that governs Delete. */
  firstSeenAt: string | null;
  /** First look at the current version. Cleared on resubmission. */
  windowStartedAt: string | null;
  editWindowMinutes: number;
  revisions: Revision[];
  events: ReportEvent[];
  comments: Comment[];
};

/** Who is looking. A role comes from a Membership, never from the session. */
export type ReportViewer = {
  membershipId: string;
  role: Role;
  space: string | null;
};

export type ReportActionKind = "none" | "edit" | "resubmit";

export type ReportAction = {
  kind: ReportActionKind;
  label: string | null;
  /** Why there is no action, in the product's words. */
  reason: string | null;
};

const MINUTE = 60 * 1000;
const at = (offsetMinutes: number) =>
  new Date(Date.parse(SAMPLE_NOW) + offsetMinutes * MINUTE).toISOString();

const emptyRevisionContent: RevisionContent = {
  accomplishments: "<p>Earlier version.</p>",
  challenges: "",
  plans: "",
  kpis: [],
  attachments: [],
  taggedMembershipIds: [],
  location: null,
};

const baseReport: Omit<
  Report,
  | "id"
  | "accomplishments"
  | "submissionStatus"
  | "reviewStatus"
  | "submittedAt"
  | "firstSeenAt"
  | "windowStartedAt"
  | "updatedAt"
  | "events"
> = {
  periodId: SAMPLE_PERIOD.id,
  challenges: "<p>Two reviewers were away, so the queue moved slowly.</p>",
  plans: "<p>Close the pilot, then hand the template to the next Space.</p>",
  kpis: [
    { name: "Reports reviewed", unit: "count", value: 12 },
    { name: "Incidents closed", unit: "count", value: 0 },
    { name: "Training sessions", unit: "sessions", value: null },
  ],
  attachments: [
    {
      name: "weekly-notes.pdf",
      size: 220_200,
      type: "application/pdf",
      uploaded: false,
    },
  ],
  taggedMembershipIds: ["mem_ifeoma"],
  location: null,
  authorMembershipId: "mem_staff",
  editWindowMinutes: 30,
  revisions: [],
  comments: [],
};

/**
 * Six sample Reports, chosen so every branch of the state table is reachable without a
 * query parameter, a cookie or a second build. None is reopened: that decision is open.
 */
export const SAMPLE_REPORTS: Report[] = [
  {
    ...baseReport,
    id: "rpt_head_submitted",
    authorMembershipId: "mem_head_platform",
    accomplishments: "<p>Reconciled the depot counts and closed the month.</p>",
    submissionStatus: "submitted",
    reviewStatus: "pending",
    submittedAt: at(-240),
    firstSeenAt: null,
    windowStartedAt: null,
    updatedAt: at(-240),
    events: [
      { kind: "submitted", at: at(-240), actorMembershipId: "mem_head_platform" },
    ],
  },
  {
    ...baseReport,
    id: "rpt_unseen",
    accomplishments:
      "<p>Ran the weekly reporting pilot with three Spaces and cleared the backlog of reviews.</p>",
    submissionStatus: "submitted",
    reviewStatus: "pending",
    submittedAt: at(-90),
    firstSeenAt: null,
    windowStartedAt: null,
    updatedAt: at(-90),
    events: [
      { kind: "submitted", at: at(-90), actorMembershipId: "mem_staff" },
    ],
  },
  {
    ...baseReport,
    id: "rpt_seen_open",
    accomplishments:
      "<p>Reviewed the Space template with two Heads and shipped the first version.</p>",
    submissionStatus: "submitted",
    reviewStatus: "pending",
    submittedAt: at(-1_500),
    firstSeenAt: at(-10),
    windowStartedAt: at(-10),
    updatedAt: at(-1_500),
    events: [
      { kind: "submitted", at: at(-1_500), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-10), actorMembershipId: "mem_admin" },
    ],
    comments: [],
  },
  {
    ...baseReport,
    id: "rpt_seen_closed",
    accomplishments:
      "<p>Closed four incidents and wrote the handover note for the night shift.</p>",
    submissionStatus: "submitted",
    reviewStatus: "pending",
    submittedAt: at(-4_000),
    firstSeenAt: at(-180),
    windowStartedAt: at(-180),
    updatedAt: at(-4_000),
    events: [
      { kind: "submitted", at: at(-4_000), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-180), actorMembershipId: "mem_admin" },
    ],
    comments: [],
  },
  {
    ...baseReport,
    id: "rpt_rejected",
    accomplishments: "<p>Set up the reporting schedule for the new Space.</p>",
    submissionStatus: "submitted",
    reviewStatus: "rejected",
    submittedAt: at(-5_000),
    firstSeenAt: at(-4_000),
    windowStartedAt: at(-4_000),
    updatedAt: at(-3_000),
    revisions: [{ at: at(-3_000), previous: emptyRevisionContent }],
    events: [
      { kind: "submitted", at: at(-5_000), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-4_000), actorMembershipId: "mem_admin" },
      {
        kind: "rejected",
        at: at(-3_000),
        actorMembershipId: "mem_admin",
      },
    ],
    comments: [
      {
        id: "cmt_rejected",
        reportId: "rpt_rejected",
        authorMembershipId: "mem_admin",
        body: "Please say what the schedule covers and who agreed to it. The numbers are fine.",
        at: at(-3_000),
        kind: "decision",
      },
      {
        id: "cmt_thread_open",
        reportId: "rpt_rejected",
        authorMembershipId: "mem_head_platform",
        body: "Which Space owns the schedule now that Platform handed it over?",
        at: at(-2_900),
        kind: "comment",
      },
      {
        id: "cmt_thread_reply",
        reportId: "rpt_rejected",
        authorMembershipId: "mem_staff",
        body: "Platform still does. I will name it in the next Report.",
        at: at(-2_800),
        kind: "comment",
      },
    ],
  },
  {
    ...baseReport,
    id: "rpt_approved",
    accomplishments:
      "<p>Shipped the KPI template and trained both Heads on it.</p>",
    submissionStatus: "submitted",
    reviewStatus: "approved",
    submittedAt: at(-600),
    firstSeenAt: at(-2),
    windowStartedAt: at(-2),
    updatedAt: at(-2),
    events: [
      { kind: "submitted", at: at(-600), actorMembershipId: "mem_staff" },
      { kind: "seen", at: at(-2), actorMembershipId: "mem_admin" },
      { kind: "approved", at: at(-1), actorMembershipId: "mem_admin" },
    ],
    comments: [],
  },
  {
    ...baseReport,
    id: "rpt_readonly",
    authorMembershipId: "mem_meridian_head",
    accomplishments: "<p>Ran the clinical audit checklist for the month.</p>",
    submissionStatus: "submitted",
    reviewStatus: "pending",
    submittedAt: at(-700),
    firstSeenAt: at(-90),
    windowStartedAt: at(-90),
    updatedAt: at(-700),
    events: [
      {
        kind: "submitted",
        at: at(-700),
        actorMembershipId: "mem_meridian_head",
      },
      { kind: "seen", at: at(-90), actorMembershipId: "mem_admin" },
    ],
    comments: [],
  },
];

/** One period exists in the samples, so the label is a lookup, not a guess. */
export function periodLabel(periodId: string): string {
  return periodId === SAMPLE_PERIOD.id ? SAMPLE_PERIOD.label : periodId;
}

export function reportById(id: string): Report | null {
  return SAMPLE_REPORTS.find((report) => report.id === id) ?? null;
}

/** The 30 day window a Starter Workspace keeps. Plan rule, not a UI preference. */
export const STARTER_VISIBLE_DAYS = 30;
