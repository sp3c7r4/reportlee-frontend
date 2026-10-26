import type { StorageLike } from "./reports.ts";

/**
 * The audit log: who changed what, when, and to whom.
 *
 * Append-only in the UI. A browser cannot refuse a write, so the spec says plainly that
 * the server owns the real record; this is the shape it will keep. Entries are stored
 * per Membership and cleared at sign out with the rest of the device state.
 */

export type AuditAction =
  | "submitted"
  | "edited"
  | "decided"
  | "reopened"
  | "role.change"
  | "space.change"
  | "member.deactivated"
  | "member.reactivated"
  | "invitation.sent"
  | "invitation.revoked"
  | "space.created"
  | "space.archived"
  | "schedule.change"
  | "settings.change"
  | "ai.toggle"
  | "export"
  | "report.deleted"
  | "draft.requested"
  | "task.moved";

export type AuditEntry = {
  at: string;
  actorMembershipId: string;
  action: AuditAction;
  /** The Membership, Space or Report the change landed on. */
  target: string;
  summary: string;
};

export const AUDIT_PREFIX = "reportlee.audit";

function keyFor(membershipId: string): string {
  return `${AUDIT_PREFIX}.${membershipId}`;
}

/** "Staff to Head of Space", "Platform to Logistics", or just the outcome. */
export function auditSummary(
  _action: AuditAction,
  from: string,
  to: string,
): string {
  if (!from) return to;
  if (!to) return from;
  return `${from} to ${to}`;
}

export function recordAudit(
  storage: StorageLike,
  membershipId: string,
  entry: AuditEntry,
): void {
  try {
    const entries = readAudit(storage, membershipId);
    storage.setItem(keyFor(membershipId), JSON.stringify([...entries, entry]));
  } catch {
    // @info - A failed audit write must not break the action the person asked for.
  }
}

export function readAudit(
  storage: StorageLike,
  membershipId: string,
): AuditEntry[] {
  try {
    const raw = storage.getItem(keyFor(membershipId));
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}
