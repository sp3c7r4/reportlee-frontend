import type { Report, ReportDraft } from "../data/reports.ts";

/**
 * Report state kept on this device, and the draft body the server accepts.
 *
 * The report calls live in `reports-api.ts` and answer from the real API. The server
 * owns drafts, submits, edits and deletes, so the Submit and My reports screens no
 * longer use the draft, edit copy or hidden helpers below. They stay because the
 * sign out path clears what earlier builds left behind, and the mock screens still
 * read `savedReports`.
 *
 * `Storage` is injected so the failure path (quota, private mode, a broken browser)
 * is testable without one.
 */

export const DRAFT_PREFIX = "reportlee.report.draft";

export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

export type WriteResult = { ok: true } | { ok: false; message: string };

export const EDIT_PREFIX = "reportlee.report.edit";
export const HANDOFF_PREFIX = "reportlee.report.handoff";
export const HIDDEN_PREFIX = "reportlee.report.hidden";
export const SAVED_PREFIX = "reportlee.report.saved";

export function draftKey(membershipId: string, periodId: string): string {
  return `${DRAFT_PREFIX}.${membershipId}.${periodId}`;
}

/** The private edit copy: autosave goes here, and the live Report is untouched. */
export function editCopyKey(membershipId: string, reportId: string): string {
  return `${EDIT_PREFIX}.${membershipId}.${reportId}`;
}

function handoffKey(membershipId: string): string {
  return `${HANDOFF_PREFIX}.${membershipId}`;
}

function hiddenKey(membershipId: string): string {
  return `${HIDDEN_PREFIX}.${membershipId}`;
}

/** One shot: written by the Report page, consumed by the form, then gone. */
export function putHandoff(
  storage: StorageLike,
  membershipId: string,
  reportId: string,
): void {
  try {
    storage.setItem(handoffKey(membershipId), reportId);
  } catch {
    /* @info - A handoff that cannot be stored simply opens the plain form. */
  }
}

export function takeHandoff(
  storage: StorageLike,
  membershipId: string,
): string | null {
  try {
    const key = handoffKey(membershipId);
    const value = storage.getItem(key);
    if (!value) return null;
    storage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}

/** A deleted Report stays hidden on this device: the server owns the real delete. */
export function hideReport(
  storage: StorageLike,
  membershipId: string,
  reportId: string,
): void {
  const ids = hiddenReportIds(storage, membershipId);
  if (ids.includes(reportId)) return;
  try {
    storage.setItem(
      hiddenKey(membershipId),
      JSON.stringify([...ids, reportId]),
    );
  } catch {
    /* @info - Nothing to do: the row comes back on the next load. */
  }
}

export function hiddenReportIds(
  storage: StorageLike,
  membershipId: string,
): string[] {
  try {
    const raw = storage.getItem(hiddenKey(membershipId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Sign out: everything this Membership left behind, and nothing else. */
export function clearReportStateFor(
  storage: StorageLike,
  membershipId: string,
): void {
  clearDraftsFor(storage, membershipId);
  const prefixes = [
    `${EDIT_PREFIX}.${membershipId}.`,
    `${HANDOFF_PREFIX}.${membershipId}`,
    `${HIDDEN_PREFIX}.${membershipId}`,
    `${SAVED_PREFIX}.${membershipId}`,
    `reportlee.audit.${membershipId}`,
  ];
  const doomed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix)))
      doomed.push(key);
  }
  for (const key of doomed) {
    try {
      storage.removeItem(key);
    } catch {
      /* @info - Unreadable state is state we no longer care about. */
    }
  }
}

export function readDraft(
  storage: StorageLike,
  key: string,
): ReportDraft | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ReportDraft;
  } catch {
    return null;
  }
}

export function writeDraft(
  storage: StorageLike,
  key: string,
  draft: ReportDraft,
): WriteResult {
  try {
    storage.setItem(key, JSON.stringify(draft));
    return { ok: true };
  } catch {
    // A save indicator that lies is worse than none: people close the tab on it.
    return { ok: false, message: "Couldn't save on this device." };
  }
}

/** Sign out: this Membership's drafts go, the theme and anyone else's draft stay. */
export function clearDraftsFor(
  storage: StorageLike,
  membershipId: string,
): void {
  const prefix = `${DRAFT_PREFIX}.${membershipId}.`;
  const doomed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) doomed.push(key);
  }
  for (const key of doomed) {
    try {
      storage.removeItem(key);
    } catch {
      /* @info - Nothing useful to do: the draft was unreadable anyway. */
    }
  }
}

export function draftBody(draft: ReportDraft) {
  // No authorMembershipId: the server takes the Membership from the token.
  return {
    periodId: draft.periodId,
    accomplishments: draft.accomplishments,
    challenges: draft.challenges,
    plans: draft.plans,
    kpis: draft.kpis,
    attachments: draft.attachments.map(({ name, size, type }) => ({
      name,
      size,
      type,
    })),
    taggedMembershipIds: draft.taggedMembershipIds,
    location: draft.location,
  };
}

/**
 * One shot: set on a successful submit, read once by the confirmation on /dashboard
 * and cleared. A stored flag beats a query parameter, which the user ruled out for
 * choosing a state.
 */
export const SUBMITTED_KEY = "reportlee.report.submitted";

export function readEditCopy(
  storage: StorageLike,
  membershipId: string,
  reportId: string,
): ReportDraft | null {
  return readDraft(storage, editCopyKey(membershipId, reportId));
}

export function writeEditCopy(
  storage: StorageLike,
  membershipId: string,
  reportId: string,
  draft: ReportDraft,
): WriteResult {
  return writeDraft(storage, editCopyKey(membershipId, reportId), draft);
}

export function clearEditCopy(
  storage: StorageLike,
  membershipId: string,
  reportId: string,
): void {
  try {
    storage.removeItem(editCopyKey(membershipId, reportId));
  } catch {
    /* @info - An unreadable copy is nothing to keep. */
  }
}

/**
 * Reports saved on this device by the mock screens (Home, Review, Analytics). The
 * Submit and My reports screens read the server instead. Cleared on sign out.
 */
export function savedReports(
  storage: StorageLike,
  membershipId: string,
): Record<string, Report> {
  try {
    const raw = storage.getItem(`${SAVED_PREFIX}.${membershipId}`);
    return raw ? (JSON.parse(raw) as Record<string, Report>) : {};
  } catch {
    return {};
  }
}
