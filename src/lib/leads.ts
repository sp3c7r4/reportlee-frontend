/**
 * Lead endpoints of the Reportlee API, behind one switch, plus the plain logic the two
 * lead screens lean on: validation, the first-error resolver, the hand-rolled CSV
 * serializer and the list filter.
 *
 * There is no backend, so `SIMULATED_LEADS` is on and every call below answers from a
 * `simulate*` body over the sample data in `src/data/leads.ts`, the way
 * `src/lib/auth.ts` answers auth. Both branches of every call return the same envelope
 * shape, so wiring the backend is this flag plus the endpoint paths already written.
 *
 * The public capture path is an unauthenticated write when the backend lands. Nothing
 * here enforces a scope, a rate limit or a CREATE-only rule, and no comment or copy may
 * claim it does: the token is a sample constant and the guard is designed, not built.
 */

import type { CapturedLead, EventContext, LeadDraft } from "../data/leads.ts";
import {
  SAMPLE_CAPTURE_TOKEN,
  SAMPLE_EVENT_CONTEXT,
  SAMPLE_LEADS,
} from "../data/leads.ts";

/** Flip to false once the endpoints are in scope. Nothing else changes. */
export const SIMULATED_LEADS = true;

/**
 * The base URL is read at build time so a deployed frontend can point at its own
 * environment without a code change.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

/** Long enough that a pending state is real, short enough to sit through at a booth. */
const SIMULATED_DELAY_MS = 700;

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

/** The same plausible-format check the auth simulator uses, kept client-side only. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The field a validation message belongs beside. `contact` is the one combined message
 * for "email or phone", which sits beside the email field (the first of the pair).
 */
export type LeadErrorField =
  | "fullName"
  | "email"
  | "contact"
  | "phone"
  | "consent";

export type LeadError = {
  field: LeadErrorField;
  message: string;
};

/**
 * Reading order of the fields, so `firstError` focuses the first problem a person meets
 * top to bottom: name, then the contact pair, then the email format, then consent.
 */
const FIELD_ORDER: LeadErrorField[] = [
  "fullName",
  "contact",
  "email",
  "phone",
  "consent",
];

/**
 * Validates a draft for the required-field and format rules. Returns one entry per
 * problem, each tagged with the field it belongs beside. An empty array means the draft
 * may submit. Phone is never rewritten here: it is kept exactly as entered.
 */
export function validateLead(draft: LeadDraft): LeadError[] {
  const errors: LeadError[] = [];

  if (!draft.fullName.trim()) {
    errors.push({ field: "fullName", message: "Enter a name." });
  }

  const hasEmail = Boolean(draft.email?.trim());
  const hasPhone = Boolean(draft.phone?.trim());
  if (!hasEmail && !hasPhone) {
    errors.push({
      field: "contact",
      message: "Enter an email or a phone number, at least one.",
    });
  }

  if (hasEmail && !EMAIL_PATTERN.test((draft.email ?? "").trim())) {
    errors.push({ field: "email", message: "Enter a valid email address." });
  }

  if (!draft.consent.given) {
    errors.push({
      field: "consent",
      message: "Tick the box to agree to be contacted.",
    });
  }

  return errors;
}

/** The first problem in reading order, the one the form focuses, or null if clean. */
export function firstError(errors: LeadError[]): LeadError | null {
  for (const field of FIELD_ORDER) {
    const match = errors.find((error) => error.field === field);
    if (match) return match;
  }
  return null;
}

/**
 * The filter the internal list applies: a search over name, email, company and job
 * title, and exact-match filters by event name and by Space. The filters combine, so an
 * event and a Space narrow together. An empty criteria object returns every lead.
 */
export type LeadFilter = {
  search?: string;
  event?: string;
  space?: string;
};

export function filterLeads(
  leads: CapturedLead[],
  filter: LeadFilter,
): CapturedLead[] {
  const term = filter.search?.trim().toLowerCase() ?? "";

  return leads.filter((lead) => {
    if (filter.event && lead.eventName !== filter.event) return false;
    if (filter.space && lead.space !== filter.space) return false;

    if (term) {
      const haystack = [lead.fullName, lead.email, lead.company, lead.jobTitle]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });
}

/* @info - The column order the header row and every data row follow. Consent is split
   into whether it was given and when, so the export carries the audit timestamp. */
const CSV_COLUMNS = [
  "id",
  "capturedAt",
  "eventName",
  "space",
  "fullName",
  "email",
  "phone",
  "company",
  "jobTitle",
  "notes",
  "consentGiven",
  "consentAt",
] as const;

const CSV_HEADER = [
  "ID",
  "Captured at",
  "Event",
  "Space",
  "Full name",
  "Email",
  "Phone",
  "Company",
  "Job title",
  "Notes",
  "Consent given",
  "Consent at",
];

/**
 * Quotes one CSV value if it carries a comma, a quote, a carriage return or a newline,
 * doubling any inner quote, per RFC 4180. A value without those characters is left bare.
 */
function quoteCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** The raw cell values for one lead, in `CSV_COLUMNS` order, before quoting. */
function leadCells(lead: CapturedLead): string[] {
  const byColumn: Record<(typeof CSV_COLUMNS)[number], string> = {
    id: lead.id,
    capturedAt: lead.capturedAt,
    eventName: lead.eventName,
    space: lead.space,
    fullName: lead.fullName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    notes: lead.notes ?? "",
    consentGiven: lead.consent.given ? "yes" : "no",
    consentAt: lead.consent.at,
  };
  return CSV_COLUMNS.map((column) => byColumn[column]);
}

/** One CSV data row for a lead, quoted where a value needs it. No trailing newline. */
export function leadToCsvRow(lead: CapturedLead): string {
  return leadCells(lead).map(quoteCsvValue).join(",");
}

/**
 * The whole CSV: a header row plus one row per lead, joined with CRLF per RFC 4180. The
 * caller passes the already-filtered leads, so the export reflects the active filter.
 */
export function leadsToCsv(leads: CapturedLead[]): string {
  const header = CSV_HEADER.map(quoteCsvValue).join(",");
  const rows = leads.map(leadToCsvRow);
  return [header, ...rows].join("\r\n");
}

/** The response envelope the API answers with, matching `sendSuccessResponse`. */
export type LeadResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

type ApiEnvelope<T> = {
  message?: string;
  error?: { message?: string };
  data?: T;
};

const UNREACHABLE =
  "We could not reach the server. Check your connection and try again.";

async function request<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<LeadResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, init);
    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<T> | null;

    if (response.ok) {
      return { ok: true, data: payload?.data as T };
    }
    return {
      ok: false,
      message: payload?.error?.message ?? payload?.message ?? fallback,
    };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

/**
 * Resolves a public capture link to its event context.
 * `GET /api/v1/public/capture/:token`. No Authorization header: the token is the path
 * segment. In this build the token resolves against the one sample constant.
 */
export async function resolveCaptureLink(
  token: string,
): Promise<LeadResult<EventContext>> {
  if (SIMULATED_LEADS) return simulateResolveCaptureLink(token);

  return request<EventContext>(
    `/public/capture/${encodeURIComponent(token)}`,
    { method: "GET" },
    "That link is not valid.",
  );
}

/**
 * Posts a captured lead from the public form.
 * `POST /api/v1/public/capture/:token`. The body is a `LeadDraft` and carries no
 * `workspaceId` and no `space`: the server resolves both from the token. The call
 * returns only the new id, never any other lead.
 */
export async function captureLead(
  token: string,
  draft: LeadDraft,
): Promise<LeadResult<{ id: string }>> {
  if (SIMULATED_LEADS) return simulateCaptureLead(token, draft);

  return request<{ id: string }>(
    `/public/capture/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    },
    "We could not save your details. Please try again.",
  );
}

/**
 * Lists captured leads for the internal screen.
 * `GET /api/v1/leads`. Guarded by the backend to Workspace Admin and Staff when it
 * lands; nothing enforces that here.
 */
export async function listLeads(): Promise<LeadResult<CapturedLead[]>> {
  if (SIMULATED_LEADS) return simulateListLeads();

  return request<CapturedLead[]>(
    "/leads",
    { method: "GET" },
    "We could not load the leads.",
  );
}

/* @info - The demo transport. These answer the three calls above over the sample data
   while there is no backend. They are not a security boundary and must never be read as
   one: the token match below is a sample constant lookup, not a validated scope. */

async function simulateResolveCaptureLink(
  token: string,
): Promise<LeadResult<EventContext>> {
  await wait(SIMULATED_DELAY_MS);
  if (token !== SAMPLE_CAPTURE_TOKEN) {
    return { ok: false, message: "That link is not valid." };
  }
  return { ok: true, data: SAMPLE_EVENT_CONTEXT };
}

async function simulateCaptureLead(
  token: string,
  draft: LeadDraft,
): Promise<LeadResult<{ id: string }>> {
  await wait(SIMULATED_DELAY_MS);
  if (token !== SAMPLE_CAPTURE_TOKEN) {
    return { ok: false, message: "That link is not valid." };
  }
  const errors = validateLead(draft);
  if (errors.length > 0) {
    const first = firstError(errors);
    return {
      ok: false,
      message: first?.message ?? "Please check the form and try again.",
    };
  }
  // The lead is recorded against the sample event context and only a new id comes back,
  // so the public caller cannot read the Workspace.
  return { ok: true, data: { id: `lead_${Date.now().toString(36)}` } };
}

async function simulateListLeads(): Promise<LeadResult<CapturedLead[]>> {
  await wait(SIMULATED_DELAY_MS);
  return { ok: true, data: SAMPLE_LEADS };
}
